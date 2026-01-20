'use client'

import { useState } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Users, 
  Shield, 
  Zap, 
  MessageSquare,
  Download,
  UserPlus,
  Server
} from 'lucide-react'

interface DiscordGettingStartedProps {
  variant: 'compact' | 'expanded'
}

const DISCORD_LINKS = {
  register: 'https://discord.com/register',
  download: 'https://discord.com/download',
  createServer: 'https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server',
  community: 'https://discord.com/community',
}

const BENEFITS = [
  {
    icon: Shield,
    title: 'Exclusive Access',
    description: 'Create subscriber-only channels that only paying members can see',
  },
  {
    icon: Zap,
    title: 'Automatic Management',
    description: 'Roles sync automatically when subscribers join, cancel, or change tiers',
  },
  {
    icon: Users,
    title: 'Build Community',
    description: 'Turn customers into a thriving community that engages with your brand',
  },
  {
    icon: MessageSquare,
    title: 'Direct Connection',
    description: 'Communicate directly with your most engaged subscribers in real-time',
  },
]

export default function DiscordGettingStarted({ variant }: DiscordGettingStartedProps) {
  const [isExpanded, setIsExpanded] = useState(variant === 'expanded')

  if (variant === 'compact') {
    return (
      <div className="mt-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors mx-auto"
        >
          <span>New to Discord?</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-4 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <p className="text-sm text-[#a1a1aa] mb-4">
              Discord is a free platform where you can build an engaged community for your subscribers. 
              Thousands of subscription businesses use it to connect with their members.
            </p>

            <div className="space-y-2">
              <a
                href={DISCORD_LINKS.register}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#5865F2]/10 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-[#5865F2]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Create a Discord account</p>
                  <p className="text-xs text-[#71717a]">Free to sign up</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[#71717a] group-hover:text-[#a1a1aa]" />
              </a>

              <a
                href={DISCORD_LINKS.download}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#5865F2]/10 flex items-center justify-center">
                  <Download className="w-4 h-4 text-[#5865F2]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Download Discord app</p>
                  <p className="text-xs text-[#71717a]">Desktop, mobile, or use in browser</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[#71717a] group-hover:text-[#a1a1aa]" />
              </a>

              <a
                href={DISCORD_LINKS.createServer}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#5865F2]/10 flex items-center justify-center">
                  <Server className="w-4 h-4 text-[#5865F2]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">How to create a server</p>
                  <p className="text-xs text-[#71717a]">Step-by-step guide from Discord</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[#71717a] group-hover:text-[#a1a1aa]" />
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Expanded variant - shown by default with more details
  return (
    <div className="space-y-6">
      {/* What is Discord */}
      <div className="p-5 rounded-xl bg-[rgba(88,101,242,0.05)] border border-[#5865F2]/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#5865F2]/10 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6 text-[#5865F2]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">What is Discord?</h3>
            <p className="text-sm text-[#a1a1aa]">
              Discord is a free community platform used by millions of businesses to build engaged subscriber communities. 
              It lets you create exclusive spaces for your paying members, with channels that automatically become 
              accessible based on subscription status.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div>
        <h4 className="text-sm font-medium text-[#71717a] uppercase tracking-wider mb-3">
          Why use Discord for your subscription?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#5865F2]/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-4 h-4 text-[#5865F2]" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{benefit.title}</p>
                  <p className="text-xs text-[#71717a] mt-0.5">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started Links */}
      <div>
        <h4 className="text-sm font-medium text-[#71717a] uppercase tracking-wider mb-3">
          Getting Started
        </h4>
        <div className="space-y-2">
          <a
            href={DISCORD_LINKS.register}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Create a Discord account</p>
              <p className="text-sm text-white/70">Free to sign up - takes less than a minute</p>
            </div>
            <ExternalLink className="w-5 h-5 text-white/70 group-hover:text-white" />
          </a>

          <a
            href={DISCORD_LINKS.download}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#5865F2]/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-[#5865F2]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Download Discord app</p>
              <p className="text-sm text-[#71717a]">Available for desktop, iOS, Android, or use in browser</p>
            </div>
            <ExternalLink className="w-5 h-5 text-[#71717a] group-hover:text-[#a1a1aa]" />
          </a>

          <a
            href={DISCORD_LINKS.createServer}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#5865F2]/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-[#5865F2]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">How to create a server</p>
              <p className="text-sm text-[#71717a]">Official step-by-step guide from Discord</p>
            </div>
            <ExternalLink className="w-5 h-5 text-[#71717a] group-hover:text-[#a1a1aa]" />
          </a>
        </div>
      </div>

      {/* Already have Discord */}
      <p className="text-sm text-[#71717a] text-center">
        Already have a Discord server?{' '}
        <span className="text-[#5865F2]">Click "Connect Discord" above to get started.</span>
      </p>
    </div>
  )
}
