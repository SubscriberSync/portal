// Admin configuration and utilities

// Emails that have admin access - add more as needed
export const ADMIN_EMAILS = [
  'travis@subscribersync.com',
] as const

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const lowerEmail = email.toLowerCase()
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === lowerEmail)
}

// Intake item validation rules for auto-approval
export const INTAKE_VALIDATION_RULES = {
  'Shopify API Key': {
    // Shopify Admin API keys start with 'shpat_' (private app token) or are 32+ chars
    validate: (value: string) => {
      const trimmed = value.trim()
      return trimmed.startsWith('shpat_') || trimmed.length >= 32
    },
    errorMessage: 'Invalid Shopify API key format. Should start with "shpat_" or be a valid access token.',
  },
  'Shopify API Secret': {
    // Shopify API secrets are typically 32+ characters
    validate: (value: string) => value.trim().length >= 32,
    errorMessage: 'Invalid Shopify API secret. Should be at least 32 characters.',
  },
  'Recharge API Key': {
    // Recharge API keys are typically 40+ characters
    validate: (value: string) => value.trim().length >= 32,
    errorMessage: 'Invalid Recharge API key. Should be at least 32 characters.',
  },
  'Klaviyo API Key': {
    // Klaviyo private API keys start with 'pk_' and are 32+ chars
    validate: (value: string) => {
      const trimmed = value.trim()
      return trimmed.startsWith('pk_') && trimmed.length >= 32
    },
    errorMessage: 'Invalid Klaviyo API key. Should start with "pk_" and be at least 32 characters.',
  },
  'Installment Name': {
    // Just needs to be non-empty and reasonable length
    validate: (value: string) => {
      const trimmed = value.trim()
      return trimmed.length >= 2 && trimmed.length <= 100
    },
    errorMessage: 'Installment name should be between 2 and 100 characters.',
  },
} as const

export type IntakeItemKey = keyof typeof INTAKE_VALIDATION_RULES

export function validateIntakeItem(item: string, value: string): { valid: boolean; error?: string } {
  const rule = INTAKE_VALIDATION_RULES[item as IntakeItemKey]

  if (!rule) {
    // Unknown item type - require manual review
    return { valid: false, error: 'Unknown item type' }
  }

  if (rule.validate(value)) {
    return { valid: true }
  }

  return { valid: false, error: rule.errorMessage }
}

// Auto-approve intake submission if it passes validation
export function shouldAutoApprove(item: string, value: string): boolean {
  const result = validateIntakeItem(item, value)
  return result.valid
}
