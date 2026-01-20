import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface ProductForAI {
  id: string
  product_name: string
  variant_title: string | null
  sku: string | null
  order_count: number
}

interface AISuggestion {
  id: string
  category: 'subscription' | 'addon' | 'ignored'
  confidence: number
  reasoning: string
  suggested_tier?: string // For subscription products
}

interface AIResponse {
  suggestions: AISuggestion[]
  summary: {
    subscription: number
    addon: number
    ignored: number
  }
  tierGroups: Record<string, string[]> // tier name -> product IDs
}

/**
 * GET /api/migration/ai-categorize
 *
 * Check if AI is available
 */
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY

  return NextResponse.json({
    available: !!apiKey,
    features: apiKey
      ? ['categorize_products', 'suggest_tiers']
      : ['manual_only'],
  })
}

/**
 * POST /api/migration/ai-categorize
 *
 * Use AI to categorize all unassigned products
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { storyName, tierNames } = body as {
      storyName?: string
      tierNames?: string[]
    }

    // Get all unassigned products
    const { data: products, error } = await supabase
      .from('product_variations')
      .select('id, product_name, variant_title, sku, order_count')
      .eq('organization_id', orgId)
      .is('story_id', null)
      .eq('variation_type', 'subscription') // Only unassigned ones
      .order('order_count', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`)
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        suggestions: [],
        summary: { subscription: 0, addon: 0, ignored: 0 },
        tierGroups: {},
      })
    }

    // Analyze with AI
    const aiResponse = await analyzeProductsWithAI(
      products,
      storyName,
      tierNames,
      apiKey
    )

    return NextResponse.json(aiResponse)
  } catch (error) {
    console.error('Error in AI categorization:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function analyzeProductsWithAI(
  products: ProductForAI[],
  storyName?: string,
  tierNames?: string[],
  apiKey?: string
): Promise<AIResponse> {
  // Process in batches of 50 to avoid token limits
  const batchSize = 50
  const allSuggestions: AISuggestion[] = []

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    const batchSuggestions = await analyzeBatch(batch, storyName, tierNames, apiKey!)
    allSuggestions.push(...batchSuggestions)
  }

  // Calculate summary
  const summary = {
    subscription: allSuggestions.filter(s => s.category === 'subscription').length,
    addon: allSuggestions.filter(s => s.category === 'addon').length,
    ignored: allSuggestions.filter(s => s.category === 'ignored').length,
  }

  // Group by suggested tier
  const tierGroups: Record<string, string[]> = {}
  for (const suggestion of allSuggestions) {
    if (suggestion.category === 'subscription' && suggestion.suggested_tier) {
      const tier = suggestion.suggested_tier
      if (!tierGroups[tier]) {
        tierGroups[tier] = []
      }
      tierGroups[tier].push(suggestion.id)
    }
  }

  return { suggestions: allSuggestions, summary, tierGroups }
}

async function analyzeBatch(
  products: ProductForAI[],
  storyName?: string,
  tierNames?: string[],
  apiKey?: string
): Promise<AISuggestion[]> {
  const tierContext = tierNames && tierNames.length > 0
    ? `The subscription has these tiers: ${tierNames.join(', ')}. Try to match products to the most appropriate tier based on their name (e.g., "Premium", "Deluxe", "VIP" = higher tier, "Basic", "Standard" = lower tier).`
    : 'If you can detect tier patterns in the product names (like "Premium", "Basic", "Standard", "VIP", "Deluxe"), suggest a tier name.'

  const systemPrompt = `You are analyzing e-commerce products to categorize them for a subscription box management system.

Your task is to categorize each product into one of three categories:
1. **subscription** - Recurring subscription products that customers receive periodically (monthly boxes, membership items, etc.)
2. **addon** - One-time purchases that are NOT part of a recurring subscription (merchandise, single purchases, gift items, bonus items)
3. **ignored** - Test orders, internal items, discontinued products, or items that shouldn't be tracked

${storyName ? `The subscription is called "${storyName}".` : ''}
${tierContext}

Rules for categorization:
- Products with high order counts are more likely to be subscription items
- Products with words like "test", "sample", "internal", "demo" should be ignored
- Products with words like "gift card", "donation", "shipping", "fee" are usually addons or ignored
- Products that seem like merchandise (t-shirts, mugs, stickers) are usually addons
- Products with subscription-related names (box, monthly, episode, chapter, issue) are usually subscription items

Respond ONLY with a valid JSON array. Each item must have:
- id: the product ID (string)
- category: "subscription" | "addon" | "ignored"
- confidence: 0.0-1.0 (how confident you are)
- reasoning: brief explanation (max 15 words)
- suggested_tier: (only for subscription items) suggested tier name if detectable, otherwise null`

  const userPrompt = `Categorize these ${products.length} products:

${products.map((p, i) => {
  const variant = p.variant_title ? ` (${p.variant_title})` : ''
  const sku = p.sku ? ` [SKU: ${p.sku}]` : ''
  return `${i + 1}. ID: "${p.id}" | "${p.product_name}${variant}"${sku} | ${p.order_count} orders`
}).join('\n')}

Return a JSON array with your categorizations.`

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 2000,
        temperature: 0.2, // Lower for more consistent categorization
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[AI Categorize] OpenAI API error:', error)
      // Return all as subscription on error (safe default)
      return products.map(p => ({
        id: p.id,
        category: 'subscription' as const,
        confidence: 0.5,
        reasoning: 'AI unavailable, defaulted to subscription',
      }))
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[AI Categorize] Could not parse JSON:', content)
      return products.map(p => ({
        id: p.id,
        category: 'subscription' as const,
        confidence: 0.5,
        reasoning: 'Could not parse AI response',
      }))
    }

    const suggestions: AISuggestion[] = JSON.parse(jsonMatch[0])
    return suggestions
  } catch (error) {
    console.error('[AI Categorize] Error:', error)
    return products.map(p => ({
      id: p.id,
      category: 'subscription' as const,
      confidence: 0.5,
      reasoning: 'Error during AI analysis',
    }))
  }
}
