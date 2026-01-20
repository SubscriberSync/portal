import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationBySlug, getIntakeSubmissions } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'
import {
  suggestSKUMappings,
  explainFlag,
  suggestPatterns,
  detectLocalPatterns,
  type UnmappedItem,
  type SkuAlias,
  type AuditLogForExplanation,
} from '@/lib/ai-assist'

/**
 * POST /api/migration/ai-suggest
 * AI-assisted suggestions for migration tasks
 */
export async function POST(request: NextRequest) {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    // Get installment name for context
    const submissions = await getIntakeSubmissions(organization.id)
    const installmentSubmission = submissions.find(s => s.item_type === 'Installment Name')
    const installmentName = installmentSubmission?.value_encrypted || 'Box'

    const supabase = createServiceClient()

    switch (action) {
      case 'suggest_mappings': {
        // Get unmapped items
        const { items } = body as { action: string; items?: UnmappedItem[] }
        
        if (!items || items.length === 0) {
          // Fetch from database if not provided
          const { data: unmappedItems } = await supabase
            .from('unmapped_items')
            .select('id, sku, product_name, order_number, customer_email, order_date')
            .eq('organization_id', organization.id)
            .eq('resolved', false)
            .limit(50)

          if (!unmappedItems || unmappedItems.length === 0) {
            return NextResponse.json({ suggestions: [], message: 'No unmapped items to process' })
          }

          // Get existing mappings for context
          const { data: existingMappings } = await supabase
            .from('sku_aliases')
            .select('shopify_sku, product_sequence_id, product_name')
            .eq('organization_id', organization.id)

          const suggestions = await suggestSKUMappings(
            unmappedItems as UnmappedItem[],
            (existingMappings || []) as SkuAlias[],
            installmentName
          )

          return NextResponse.json({ suggestions })
        }

        // Use provided items
        const { data: existingMappings } = await supabase
          .from('sku_aliases')
          .select('shopify_sku, product_sequence_id, product_name')
          .eq('organization_id', organization.id)

        const suggestions = await suggestSKUMappings(
          items,
          (existingMappings || []) as SkuAlias[],
          installmentName
        )

        return NextResponse.json({ suggestions })
      }

      case 'explain_flag': {
        const { auditLogId } = body as { action: string; auditLogId: string }

        if (!auditLogId) {
          return NextResponse.json({ error: 'auditLogId is required' }, { status: 400 })
        }

        // Get the audit log
        const { data: auditLog, error: fetchError } = await supabase
          .from('audit_logs')
          .select(`
            email,
            flag_reasons,
            detected_sequences,
            sequence_dates,
            proposed_next_box
          `)
          .eq('id', auditLogId)
          .eq('organization_id', organization.id)
          .single()

        if (fetchError || !auditLog) {
          return NextResponse.json({ error: 'Audit log not found' }, { status: 404 })
        }

        const explanation = await explainFlag(auditLog as AuditLogForExplanation)

        // Optionally save the explanation
        await supabase
          .from('audit_logs')
          .update({ ai_explanation: explanation })
          .eq('id', auditLogId)

        return NextResponse.json({ explanation })
      }

      case 'suggest_patterns': {
        const { productNames } = body as { action: string; productNames?: string[] }

        let namesToAnalyze = productNames

        if (!namesToAnalyze || namesToAnalyze.length === 0) {
          // Get product names from unmapped items
          const { data: unmappedItems } = await supabase
            .from('unmapped_items')
            .select('product_name')
            .eq('organization_id', organization.id)
            .eq('resolved', false)
            .limit(100)

          namesToAnalyze = unmappedItems?.map(i => i.product_name).filter(Boolean) || []
        }

        if (namesToAnalyze.length === 0) {
          return NextResponse.json({ patterns: [], message: 'No product names to analyze' })
        }

        // First try local pattern detection (free)
        const localPatterns = detectLocalPatterns(namesToAnalyze, installmentName)

        // If local detection finds patterns, return them
        if (localPatterns.length > 0) {
          return NextResponse.json({
            patterns: localPatterns,
            source: 'local',
            message: 'Patterns detected using local analysis',
          })
        }

        // Fall back to AI
        const aiPatterns = await suggestPatterns(namesToAnalyze, installmentName)

        return NextResponse.json({
          patterns: aiPatterns,
          source: 'ai',
        })
      }

      case 'detect_local_patterns': {
        // Free local pattern detection only
        const { productNames } = body as { action: string; productNames: string[] }

        if (!productNames || productNames.length === 0) {
          return NextResponse.json({ error: 'productNames array is required' }, { status: 400 })
        }

        const patterns = detectLocalPatterns(productNames, installmentName)

        return NextResponse.json({
          patterns,
          source: 'local',
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    return handleApiError(error, 'AI Suggest')
  }
}

/**
 * GET /api/migration/ai-suggest
 * Check if AI assist is available (API key configured)
 */
export async function GET() {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasApiKey = !!process.env.OPENAI_API_KEY

  return NextResponse.json({
    available: hasApiKey,
    features: hasApiKey
      ? ['suggest_mappings', 'explain_flag', 'suggest_patterns']
      : ['detect_local_patterns'],
  })
}
