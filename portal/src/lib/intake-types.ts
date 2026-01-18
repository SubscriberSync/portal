// Intake item types
export type IntakeItemType =
  | 'Shopify API Key'
  | 'Shopify API Secret'
  | 'Recharge API Key'
  | 'Klaviyo API Key'
  | 'Installment Name'

export type IntakeStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected'

export interface IntakeSubmission {
  id?: string
  client?: string
  item: IntakeItemType
  value: string
  status: IntakeStatus
  rejectionNote?: string
  submittedAt?: string
  reviewedAt?: string
  helpVideoUrl?: string
}

// Discord decision types
export type DiscordDecision = 'Not Decided' | 'Yes Setup' | 'Maybe Later' | 'No Thanks'
export type DiscordNewOrExisting = 'Create New' | 'Connect Existing'
export type DiscordVibe = 'Casual & Friendly' | 'Professional' | 'Playful & Fun'

export type DiscordChannel = 
  | '#general'
  | '#introductions'
  | '#episode-discussion'
  | '#spoilers'
  | '#customer-support'
  | '#theories'
  | '#off-topic'

// Extended client data for onboarding
export interface ClientOnboardingData {
  // Step 1 tracking
  step1Complete: boolean
  loomShopify?: string
  loomRecharge?: string
  loomKlaviyo?: string
  
  // Step 2 - Discord
  discordDecision: DiscordDecision
  discordNewOrExisting?: DiscordNewOrExisting
  discordServerName?: string
  discordServerId?: string
  discordChannels?: DiscordChannel[]
  discordEpisodeGated?: boolean
  discordModeratorName?: string
  discordModeratorEmail?: string
  discordVibe?: DiscordVibe
  step2Complete: boolean
}

// Intake item configuration (for rendering)
export interface IntakeItemConfig {
  type: IntakeItemType
  title: string
  description: string
  placeholder: string
  helpText: string
  multiline?: boolean
  sensitive?: boolean  // If true, input is masked (password field) and value is hidden in display
  loomField: 'loomShopify' | 'loomRecharge' | 'loomKlaviyo' | null
}

export const INTAKE_ITEMS: IntakeItemConfig[] = [
  {
    type: 'Shopify API Key',
    title: 'Shopify Admin API Key',
    description: 'Your Shopify Admin API access token for order and product sync.',
    placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    helpText: 'Found in Shopify → Settings → Apps → Develop apps → Your app → API credentials',
    sensitive: true,
    loomField: 'loomShopify',
  },
  {
    type: 'Shopify API Secret',
    title: 'Shopify API Secret',
    description: 'Your Shopify API secret key for webhook verification.',
    placeholder: 'shpss_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    helpText: 'Found in Shopify → Settings → Apps → Develop apps → Your app → API credentials',
    sensitive: true,
    loomField: 'loomShopify',
  },
  {
    type: 'Recharge API Key',
    title: 'Recharge API Key',
    description: 'Your Recharge API key lets us sync subscription data.',
    placeholder: 'pk_xxxxxxxxxxxxxxxxxxxxxxxx',
    helpText: 'Found in Recharge → Apps → API tokens',
    sensitive: true,
    loomField: 'loomRecharge',
  },
  {
    type: 'Klaviyo API Key',
    title: 'Klaviyo Private API Key',
    description: 'Your Klaviyo key lets us sync subscriber properties.',
    placeholder: 'pk_xxxxxxxxxxxxxxxxxxxxxxxx',
    helpText: 'Found in Klaviyo → Settings → API Keys → Private',
    sensitive: true,
    loomField: 'loomKlaviyo',
  },
  {
    type: 'Installment Name',
    title: 'What do you call your installments?',
    description: 'How you refer to each box in your series.',
    placeholder: 'Episodes, Boxes, Chapters, etc.',
    helpText: 'This appears in your dashboard and customer communications',
    loomField: null,
  },
]

// Discord channel presets
export const DISCORD_CHANNEL_OPTIONS: { value: DiscordChannel; label: string; description: string; recommended: boolean }[] = [
  { value: '#general', label: '#general', description: 'Main community chat', recommended: true },
  { value: '#introductions', label: '#introductions', description: 'New members introduce themselves', recommended: true },
  { value: '#episode-discussion', label: '#episode-discussion', description: 'Discuss each episode/box', recommended: true },
  { value: '#spoilers', label: '#spoilers', description: 'Spoiler-safe zone for those ahead', recommended: false },
  { value: '#customer-support', label: '#customer-support', description: 'Questions about orders', recommended: false },
  { value: '#theories', label: '#theories', description: 'Fan theories and speculation', recommended: false },
  { value: '#off-topic', label: '#off-topic', description: 'Everything else', recommended: false },
]
