'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Lock, MessageCircle, Users, Loader2 } from 'lucide-react'
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
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/30 overflow-hidden opacity-60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-400">Step 2: Discord Community</h3>
                <p className="text-sm text-slate-500">Complete Step 1 to unlock</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-700/50 text-xs text-slate-500">
              🔒 Locked
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Completed state
  if (onboardingData.step2Complete && !isExpanded) {
    return (
      <div className="bg-slate-800/30 rounded-2xl border border-emerald-500/20 overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-200">Step 2: Discord Community</h3>
              <p className="text-sm text-emerald-400">
                {onboardingData.discordDecision === 'No Thanks' 
                  ? '✓ Skipped'
                  : onboardingData.discordDecision === 'Yes Setup'
                    ? '✓ Setup submitted'
                    : '✓ Complete'
                }
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    )
  }
  
  // Maybe Later collapsed state
  if (onboardingData.discordDecision === 'Maybe Later' && !isExpanded) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-200">Step 2: Discord Community</h3>
              <p className="text-sm text-amber-400">Set aside for later - click to continue</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    )
  }
  
  // Decision gate - hasn't decided yet
  if (onboardingData.discordDecision === 'Not Decided') {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">Step 2: Discord Community</h3>
              <p className="text-sm text-slate-400">Build a private community for your subscribers</p>
            </div>
          </div>
        </div>
        
        <div className="p-5">
          <p className="text-sm text-slate-300 mb-6">
            Want a subscriber-only Discord server where members unlock channels based on their episode progress? We'll set it up and connect it to your subscription data.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDecision('Yes Setup')}
              disabled={isLoading}
              className="px-5 py-2.5 bg-copper hover:bg-copper/90 disabled:bg-slate-700 text-slate-900 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Yes, set this up
            </button>
            <button
              onClick={() => handleDecision('Maybe Later')}
              disabled={isLoading}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              Maybe later
            </button>
            <button
              onClick={() => handleDecision('No Thanks')}
              disabled={isLoading}
              className="px-5 py-2.5 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Setup form (Yes Setup selected)
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div 
        className="p-5 border-b border-slate-700/50 cursor-pointer hover:bg-slate-800/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">Step 2: Discord Community</h3>
              <p className="text-sm text-slate-400">Configure your community settings</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* New or Existing */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-3">
              Server Setup
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewOrExisting('Create New')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  newOrExisting === 'Create New'
                    ? 'border-copper bg-copper/10'
                    : 'border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <p className="font-medium text-slate-200">Create New</p>
                <p className="text-xs text-slate-400 mt-1">We'll create a fresh server for you</p>
              </button>
              <button
                onClick={() => setNewOrExisting('Connect Existing')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  newOrExisting === 'Connect Existing'
                    ? 'border-copper bg-copper/10'
                    : 'border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <p className="font-medium text-slate-200">Connect Existing</p>
                <p className="text-xs text-slate-400 mt-1">Link an existing Discord server</p>
              </button>
            </div>
          </div>
          
          {/* Conditional fields based on new/existing */}
          {newOrExisting === 'Create New' && (
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Server Name
              </label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g., The Everlore Community"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-copper/50"
              />
            </div>
          )}
          
          {newOrExisting === 'Connect Existing' && (
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Server ID
              </label>
              <input
                type="text"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                placeholder="1234567890123456789"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-copper/50 font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Right-click your server icon → Copy Server ID
              </p>
            </div>
          )}
          
          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-3">
              Channels to Create
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DISCORD_CHANNEL_OPTIONS.map(channel => (
                <button
                  key={channel.value}
                  onClick={() => toggleChannel(channel.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedChannels.includes(channel.value)
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedChannels.includes(channel.value)
                        ? 'border-purple-400 bg-purple-400'
                        : 'border-slate-600'
                    }`}>
                      {selectedChannels.includes(channel.value) && (
                        <Check className="w-3 h-3 text-slate-900" />
                      )}
                    </div>
                    <span className="text-sm text-slate-200 font-mono">{channel.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-6">{channel.description}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Episode Gating */}
          <div className="flex items-start gap-3 p-4 bg-slate-900/30 rounded-xl">
            <button
              onClick={() => setEpisodeGated(!episodeGated)}
              className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                episodeGated
                  ? 'border-copper bg-copper'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              {episodeGated && <Check className="w-3 h-3 text-slate-900" />}
            </button>
            <div>
              <p className="text-sm font-medium text-slate-200">Enable Episode Gating</p>
              <p className="text-xs text-slate-400 mt-1">
                Certain channels (like #spoilers) only visible to subscribers past a specific episode
              </p>
            </div>
          </div>
          
          {/* Moderator Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Moderator Name
              </label>
              <input
                type="text"
                value={moderatorName}
                onChange={(e) => setModeratorName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-copper/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Moderator Email
              </label>
              <input
                type="email"
                value={moderatorEmail}
                onChange={(e) => setModeratorEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-copper/50"
              />
            </div>
          </div>
          
          {/* Vibe */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-3">
              Community Vibe
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Casual & Friendly', 'Professional', 'Playful & Fun'] as DiscordVibe[]).map(v => (
                <button
                  key={v}
                  onClick={() => setVibe(v)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    vibe === v
                      ? 'border-copper bg-copper/10'
                      : 'border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  <span className="text-2xl mb-1 block">
                    {v === 'Casual & Friendly' ? '😊' : v === 'Professional' ? '💼' : '🎉'}
                  </span>
                  <span className="text-xs text-slate-300">{v}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-700/50">
            <button
              onClick={handleSaveSetup}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Save Progress
            </button>
            <button
              onClick={handleComplete}
              disabled={isLoading || !newOrExisting}
              className="px-5 py-2.5 bg-copper hover:bg-copper/90 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
