/**
 * AI Assist Module for Migration Center
 * 
 * Uses OpenAI GPT-4o-mini to help users:
 * 1. Suggest SKU-to-box mappings based on patterns
 * 2. Explain why a subscriber was flagged
 * 3. Detect patterns in product names
 */

// Types
export interface UnmappedItem {
  id: string
  sku: string | null
  product_name: string
  order_number: number
  customer_email: string
  order_date: string
}

export interface SkuAlias {
  shopify_sku: string
  product_sequence_id: number
  product_name: string | null
}

export interface SuggestedMapping {
  sku: string | null
  product_name: string
  suggested_sequence: number
  confidence: number // 0-1
  reasoning: string
}

export interface PatternSuggestion {
  pattern: string
  pattern_type: 'contains' | 'regex' | 'starts_with' | 'ends_with'
  sequence: number
  match_count: number
  example_matches: string[]
}

export interface AuditLogForExplanation {
  email: string
  flag_reasons: string[]
  detected_sequences: number[]
  sequence_dates: Array<{
    sequence: number
    date: string
    orderNumber: number
    sku: string
    productName: string
  }>
  proposed_next_box: number
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * Call OpenAI API with structured prompt
 * Uses gpt-4o-mini for cost-effective AI assistance
 * 
 * API Reference: https://platform.openai.com/docs/api-reference/chat
 */
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  maxCompletionTokens: number = 1000
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

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
      max_completion_tokens: maxCompletionTokens, // Updated from deprecated max_tokens
      temperature: 0.3, // Lower temperature for more consistent results
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[AI Assist] OpenAI API error:', error)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * Suggest SKU-to-box mappings for unmapped items
 */
export async function suggestSKUMappings(
  unmappedItems: UnmappedItem[],
  existingMappings: SkuAlias[],
  installmentName: string
): Promise<SuggestedMapping[]> {
  if (unmappedItems.length === 0) return []
  
  // Limit to 50 items per request to avoid token limits
  const itemsToProcess = unmappedItems.slice(0, 50)
  
  const systemPrompt = `You are a helpful assistant that analyzes subscription box product data.
Your task is to suggest which box number (1, 2, 3, etc.) each product belongs to.

The subscription box uses "${installmentName}" as their installment name (e.g., "Box", "Episode", "Chapter").

Existing mappings for reference:
${existingMappings.map(m => `- SKU "${m.shopify_sku}" = ${installmentName} ${m.product_sequence_id}`).join('\n')}

Respond ONLY with a valid JSON array. Each item should have:
- sku: the original SKU (or null)
- product_name: the product name
- suggested_sequence: the box number you suggest (integer)
- confidence: your confidence 0.0-1.0
- reasoning: brief explanation

Look for patterns like:
- Numbers in product names ("Episode 3" = 3)
- Sequential naming ("January Box" might be 1 if it's the first month)
- SKU patterns ("BOX-003" = 3)
- Variant naming that indicates sequence`

  const userPrompt = `Analyze these unmapped products and suggest box numbers:

${itemsToProcess.map((item, i) => `${i + 1}. SKU: "${item.sku || 'none'}" | Product: "${item.product_name}" | Date: ${item.order_date}`).join('\n')}

Return a JSON array with your suggestions.`

  try {
    const response = await callOpenAI(systemPrompt, userPrompt, 2000)
    
    // Extract JSON from response (it might have markdown code blocks)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[AI Assist] Could not parse JSON from response:', response)
      return []
    }
    
    const suggestions: SuggestedMapping[] = JSON.parse(jsonMatch[0])
    return suggestions
  } catch (error) {
    console.error('[AI Assist] Error suggesting mappings:', error)
    return []
  }
}

/**
 * Explain why a subscriber was flagged in plain English
 */
export async function explainFlag(auditLog: AuditLogForExplanation): Promise<string> {
  const flagLabels: Record<string, string> = {
    gap_detected: 'Gap in Sequence',
    duplicate_box: 'Duplicate Box Shipped',
    time_traveler: 'Out-of-Order Shipping',
    no_history: 'No Subscription History Found',
  }

  const systemPrompt = `You are a helpful assistant explaining subscription fulfillment issues to a non-technical user.
Explain the problem clearly and suggest what might have caused it.
Keep your response under 100 words and be conversational.`

  const flagDescriptions = auditLog.flag_reasons.map(r => flagLabels[r] || r).join(', ')
  
  const timeline = auditLog.sequence_dates
    .map(e => `- ${new Date(e.date).toLocaleDateString()}: ${e.productName} (Box ${e.sequence})`)
    .join('\n')

  const userPrompt = `This subscriber (${auditLog.email}) was flagged for: ${flagDescriptions}

Their order history:
${timeline || 'No matching subscription orders found'}

Detected box sequence: [${auditLog.detected_sequences.join(', ')}]
System suggests next box should be: Box ${auditLog.proposed_next_box}

Explain what the issue is and what might have caused it.`

  try {
    const explanation = await callOpenAI(systemPrompt, userPrompt, 300)
    return explanation.trim()
  } catch (error) {
    console.error('[AI Assist] Error explaining flag:', error)
    // Fallback to basic explanation
    return `This subscriber was flagged because: ${flagDescriptions}. Please review their order history to determine the correct next box number.`
  }
}

/**
 * Detect patterns in product names and suggest regex/contains patterns
 */
export async function suggestPatterns(
  productNames: string[],
  installmentName: string
): Promise<PatternSuggestion[]> {
  if (productNames.length === 0) return []
  
  // Dedupe and limit
  const uniqueNames = [...new Set(productNames)].slice(0, 100)
  
  const systemPrompt = `You are analyzing subscription box product names to find patterns.
The subscription uses "${installmentName}" as their installment name.

Your task is to find patterns that can be used to automatically map products to box numbers.

Respond ONLY with a valid JSON array. Each pattern should have:
- pattern: the pattern string (use {N} as placeholder for the box number)
- pattern_type: one of "contains", "starts_with", "ends_with", or "regex"
- sequence: if the pattern implies a specific sequence, put it here, otherwise 0 means "extract from pattern"
- match_count: how many of the given names match this pattern
- example_matches: up to 3 example product names that match

Look for:
- Common prefixes ("Episode 1", "Episode 2" -> pattern "Episode {N}")
- SKU patterns embedded in names
- Date-based naming that implies sequence
- Variant naming ("Box 1 - Large", "Box 1 - Small" -> pattern "Box {N}")`

  const userPrompt = `Find patterns in these product names:

${uniqueNames.map((name, i) => `${i + 1}. "${name}"`).join('\n')}

Return a JSON array with the patterns you found.`

  try {
    const response = await callOpenAI(systemPrompt, userPrompt, 1500)
    
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[AI Assist] Could not parse patterns JSON:', response)
      return []
    }
    
    const patterns: PatternSuggestion[] = JSON.parse(jsonMatch[0])
    return patterns
  } catch (error) {
    console.error('[AI Assist] Error suggesting patterns:', error)
    return []
  }
}

/**
 * Local pattern detection (no AI, just regex)
 * Use this as a free first-pass before AI
 */
export function detectLocalPatterns(
  productNames: string[],
  installmentName: string
): PatternSuggestion[] {
  const patterns: PatternSuggestion[] = []
  const installmentLower = installmentName.toLowerCase()
  
  // Common patterns to check
  const patternTests = [
    // "Box 1", "Box 2", etc.
    {
      regex: new RegExp(`${installmentLower}\\s*(\\d+)`, 'i'),
      type: 'contains' as const,
      template: `${installmentName} {N}`,
    },
    // "Episode 1", "Episode 2"
    {
      regex: /episode\s*(\d+)/i,
      type: 'contains' as const,
      template: 'Episode {N}',
    },
    // "Chapter 1", "Chapter 2"
    {
      regex: /chapter\s*(\d+)/i,
      type: 'contains' as const,
      template: 'Chapter {N}',
    },
    // "#1", "#2" etc.
    {
      regex: /#(\d+)/,
      type: 'contains' as const,
      template: '#{N}',
    },
    // "Vol. 1", "Vol 1", "Volume 1"
    {
      regex: /vol(?:ume)?\.?\s*(\d+)/i,
      type: 'contains' as const,
      template: 'Volume {N}',
    },
  ]
  
  for (const test of patternTests) {
    const matches: string[] = []
    const sequencesFound = new Set<number>()
    
    for (const name of productNames) {
      const match = name.match(test.regex)
      if (match) {
        matches.push(name)
        sequencesFound.add(parseInt(match[1], 10))
      }
    }
    
    if (matches.length >= 2) {
      patterns.push({
        pattern: test.template,
        pattern_type: test.type,
        sequence: 0, // 0 means extract from the match
        match_count: matches.length,
        example_matches: matches.slice(0, 3),
      })
    }
  }
  
  return patterns
}

/**
 * Extract sequence number from a product name using a pattern
 */
export function extractSequenceFromName(
  productName: string,
  pattern: string,
  patternType: 'contains' | 'regex' | 'starts_with' | 'ends_with'
): number | null {
  try {
    // Convert pattern with {N} to regex
    const escapedPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace('\\{N\\}', '(\\d+)')
    
    let regex: RegExp
    switch (patternType) {
      case 'starts_with':
        regex = new RegExp(`^${escapedPattern}`, 'i')
        break
      case 'ends_with':
        regex = new RegExp(`${escapedPattern}$`, 'i')
        break
      case 'regex':
        regex = new RegExp(pattern, 'i')
        break
      case 'contains':
      default:
        regex = new RegExp(escapedPattern, 'i')
    }
    
    const match = productName.match(regex)
    if (match && match[1]) {
      return parseInt(match[1], 10)
    }
    return null
  } catch {
    return null
  }
}
