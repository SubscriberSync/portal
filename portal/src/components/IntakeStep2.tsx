'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Lock, MessageCircle, Users, Loader2, Shield, Zap, ExternalLink } from 'lucide-react'
import {
  ClientOnboardingData,
  DiscordChannel,
  DISCORD_CHANNEL_OPTIONS,
  DiscordNewOrExisting,
  DiscordVibe
} from '@/lib/intake-types'

interface IntakeStep2Props {
  clientSlug: string
  onboardingData: ClientOnboardingData
  isUnlocked: boolean
  onDecision: (decision: 'Yes Setup' | 'Maybe Later' | 'No Thanks') => Promise<boolean>
  onUpdateSetup: (data: {
    newOrExisting?: DiscordNewOrExisting
    serverName?: string
    serverId?: string
    channels?: DiscordChannel[]
    episodeGated?: boolean
    moderatorName?: string
    moderatorEmail?: string
    vibe?: DiscordVibe
    markComplete?: boolean
  }) => Promise<boolean>
  onRefresh: () => void
}

const DISCORD_LINKS = {
  register: 'https://discord.com/register',
  download: 'https://discord.com/download',
  createServer: 'https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server',
}

function NewToDiscordSection() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="pt-4 border-t border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-foreground-tertiary hover:text-foreground-secondary transition-colors"
      >
        <span>New to Discord?</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-foreground-tertiary mb-3">
            Discord is a free platform used by thousands of subscription businesses to build engaged communities. 
            Here&apos;s how to get started:
          </p>

          <a
            href={DISCORD_LINKS.register}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg bg-background-elevated hover:bg-border transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Create a Discord account</p>
              <p className="text-xs text-foreground-tertiary">Free to sign up</p>
            </div>
            <ExternalLink className="w-4 h-4 text-foreground-tertiary group-hover:text-foreground-secondary" />
          </a>

          <a
            href={DISCORD_LINKS.download}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg bg-background-elevated hover:bg-border transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Download Discord app</p>
              <p className="text-xs text-foreground-tertiary">Desktop, mobile, or browser</p>
            </div>
            <ExternalLink className="w-4 h-4 text-foreground-tertiary group-hover:text-foreground-secondary" />
          </a>

          <a
            href={DISCORD_LINKS.createServer}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg bg-background-elevated hover:bg-border transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">How to create a server</p>
              <p className="text-xs text-foreground-tertiary">Step-by-step guide from Discord</p>
            </div>
            <ExternalLink className="w-4 h-4 text-foreground-tertiary group-hover:text-foreground-secondary" />
          </a>
        </div>
      )}
    </div>
  )
}

export default function IntakeStep2({
  clientSlug,
  onboardingData,
  isUnlocked,
  onDecision,
  onUpdateSetup,
  onRefresh
}: IntakeStep2Props) {
  const [isExpanded, setIsExpanded] = useState(
    isUnlocked &&
    !onboardingData.step2Complete &&
    onboardingData.discordDecision !== 'Maybe Later' &&
    onboardingData.discordDecision !== 'No Thanks'
  )
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [newOrExisting, setNewOrExisting] = useState<DiscordNewOrExisting | undefined>(onboardingData.discordNewOrExisting)
  const [serverName, setServerName] = useState(onboardingData.discordServerName || '')
  const [serverId, setServerId] = useState(onboardingData.discordServerId || '')
  const [selectedChannels, setSelectedChannels] = useState<DiscordChannel[]>(
    onboardingData.discordChannels || DISCORD_CHANNEL_OPTIONS.filter(c => c.recommended).map(c => c.value)
  )
  const [episodeGated, setEpisodeGated] = useState(onboardingData.discordEpisodeGated || false)
  const [moderatorName, setModeratorName] = useState(onboardingData.discordModeratorName || '')
  const [moderatorEmail, setModeratorEmail] = useState(onboardingData.discordModeratorEmail || '')
  const [vibe, setVibe] = useState<DiscordVibe | undefined>(onboardingData.discordVibe)

  const handleDecision = async (decision: 'Yes Setup' | 'Maybe Later' | 'No Thanks') => {
    setIsLoading(true)
    const success = await onDecision(decision)
    setIsLoading(false)
    if (success) {
      onRefresh()
      if (decision === 'Yes Setup') {
        setIsExpanded(true)
      }
    }
  }

  const toggleChannel = (channel: DiscordChannel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  const handleSaveSetup = async () => {
    setIsLoading(true)
    const success = await onUpdateSetup({
      newOrExisting,
      serverName,
      serverId,
      channels: selectedChannels,
      episodeGated,
      moderatorName,
      moderatorEmail,
      vibe,
    })
    setIsLoading(false)
    if (success) {
      onRefresh()
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    const success = await onUpdateSetup({
      newOrExisting,
      serverName,
      serverId,
      channels: selectedChannels,
      episodeGated,
      moderatorName,
      moderatorEmail,
      vibe,
      markComplete: true,
    })
    setIsLoading(false)
    if (success) {
      onRefresh()
    }
  }

  // Locked state
  if (!isUnlocked) {
    return (
      <div className="bg-background-elevated/50 rounded-2xl border border-border overflow-hidden opacity-60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-foreground-tertiary/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-foreground-tertiary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground-tertiary">Step 2: Discord Community</h3>
                <p className="text-sm text-foreground-tertiary">Complete Step 1 to unlock</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-foreground-tertiary/20 text-xs text-foreground-tertiary">
              Locked
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Completed state
  if (onboardingData.step2Complete && !isExpanded) {
    return (
      <div className="bg-success/5 rounded-2xl border border-success/20 overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-5 flex items-center justify-between hover:bg-success/10 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">Step 2: Discord Community</h3>
              <p className="text-sm text-success">
                {onboardingData.discordDecision === 'No Thanks'
                  ? 'Skipped'
                  : onboardingData.discordDecision === 'Yes Setup'
                    ? 'Setup submitted'
                    : 'Complete'
                }
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-foreground-tertiary" />
        </button>
      </div>
    )
  }

  // Maybe Later collapsed state
  if (onboardingData.discordDecision === 'Maybe Later' && !isExpanded) {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-5 flex items-center justify-between hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">Step 2: Discord Community</h3>
              <p className="text-sm text-amber-600">Set aside for later - click to continue</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-foreground-tertiary" />
        </button>
      </div>
    )
  }

  // Decision gate - hasn't decided yet
  if (onboardingData.discordDecision === 'Not Decided') {
    return (
      <div className="bg-background-secondary rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Step 2: Discord Community</h3>
              <p className="text-sm text-foreground-secondary">Build a private community for your subscribers</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Value Proposition */}
          <div>
            <p className="text-sm text-foreground-secondary mb-4">
              Turn your subscribers into an engaged community with a Discord server that automatically manages access based on subscription status.
            </p>
            
            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background-elevated">
                <Shield className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Exclusive Access</p>
                  <p className="text-xs text-foreground-tertiary">Subscriber-only channels</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background-elevated">
                <Zap className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Auto-Managed</p>
                  <p className="text-xs text-foreground-tertiary">Roles sync automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background-elevated">
                <Users className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Build Community</p>
                  <p className="text-xs text-foreground-tertiary">Engage with members</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background-elevated">
                <MessageCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Direct Connection</p>
                  <p className="text-xs text-foreground-tertiary">Real-time discussions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDecision('Yes Setup')}
              disabled={isLoading}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-background-elevated text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Yes, set this up
            </button>
            <button
              onClick={() => handleDecision('Maybe Later')}
              disabled={isLoading}
              className="px-5 py-2.5 bg-background-elevated hover:bg-border text-foreground rounded-lg text-sm font-medium transition-colors"
            >
              Maybe later
            </button>
            <button
              onClick={() => handleDecision('No Thanks')}
              disabled={isLoading}
              className="px-5 py-2.5 text-foreground-tertiary hover:text-foreground-secondary text-sm font-medium transition-colors"
            >
              Skip for now
            </button>
          </div>

          {/* New to Discord Section */}
          <NewToDiscordSection />
        </div>
      </div>
    )
  }

  // Setup form (Yes Setup selected)
  return (
    <div className="bg-background-secondary rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div
        className="p-5 border-b border-border cursor-pointer hover:bg-background-elevated"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Step 2: Discord Community</h3>
              <p className="text-sm text-foreground-secondary">Configure your community settings</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-foreground-tertiary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-foreground-tertiary" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* New or Existing */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Server Setup
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewOrExisting('Create New')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  newOrExisting === 'Create New'
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <p className="font-medium text-foreground">Create New</p>
                <p className="text-xs text-foreground-secondary mt-1">We'll create a fresh server for you</p>
              </button>
              <button
                onClick={() => setNewOrExisting('Connect Existing')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  newOrExisting === 'Connect Existing'
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <p className="font-medium text-foreground">Connect Existing</p>
                <p className="text-xs text-foreground-secondary mt-1">Link an existing Discord server</p>
              </button>
            </div>
          </div>

          {/* Conditional fields based on new/existing */}
          {newOrExisting === 'Create New' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Server Name
              </label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g., The Everlore Community"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-accent/50"
              />
            </div>
          )}

          {newOrExisting === 'Connect Existing' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Server ID
              </label>
              <input
                type="text"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                placeholder="1234567890123456789"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-accent/50 font-mono"
              />
              <p className="text-xs text-foreground-tertiary mt-1">
                Right-click your server icon → Copy Server ID
              </p>
            </div>
          )}

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Channels to Create
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DISCORD_CHANNEL_OPTIONS.map(channel => (
                <button
                  key={channel.value}
                  onClick={() => toggleChannel(channel.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedChannels.includes(channel.value)
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedChannels.includes(channel.value)
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-foreground-tertiary'
                    }`}>
                      {selectedChannels.includes(channel.value) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-foreground font-mono">{channel.label}</span>
                  </div>
                  <p className="text-xs text-foreground-tertiary mt-1 ml-6">{channel.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Episode Gating */}
          <div className="flex items-start gap-3 p-4 bg-background-elevated rounded-xl">
            <button
              onClick={() => setEpisodeGated(!episodeGated)}
              className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                episodeGated
                  ? 'border-accent bg-accent'
                  : 'border-foreground-tertiary hover:border-foreground-secondary'
              }`}
            >
              {episodeGated && <Check className="w-3 h-3 text-white" />}
            </button>
            <div>
              <p className="text-sm font-medium text-foreground">Enable Episode Gating</p>
              <p className="text-xs text-foreground-secondary mt-1">
                Certain channels (like #spoilers) only visible to subscribers past a specific episode
              </p>
            </div>
          </div>

          {/* Moderator Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Moderator Name
              </label>
              <input
                type="text"
                value={moderatorName}
                onChange={(e) => setModeratorName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Moderator Email
              </label>
              <input
                type="email"
                value={moderatorEmail}
                onChange={(e) => setModeratorEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>

          {/* Vibe */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Community Vibe
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Casual & Friendly', 'Professional', 'Playful & Fun'] as DiscordVibe[]).map(v => (
                <button
                  key={v}
                  onClick={() => setVibe(v)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    vibe === v
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  <span className="text-2xl mb-1 block">
                    {v === 'Casual & Friendly' ? '😊' : v === 'Professional' ? '💼' : '🎉'}
                  </span>
                  <span className="text-xs text-foreground-secondary">{v}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-border">
            <button
              onClick={handleSaveSetup}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-foreground-tertiary hover:text-foreground transition-colors"
            >
              Save Progress
            </button>
            <button
              onClick={handleComplete}
              disabled={isLoading || !newOrExisting}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-background-elevated disabled:text-foreground-tertiary text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Submit Setup Request
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
