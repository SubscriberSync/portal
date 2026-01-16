'use client'

import { ClientData } from '@/lib/types'
import { useEffect, useState, useRef } from 'react'

interface StatsGridProps {
  client: ClientData
}

function AnimatedNumber({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)
  
  useEffect(() => {
    let startTime: number
    let animationFrame: number
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplayValue(Math.floor(easeOutExpo * value))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])
  
  return (
    <span className={isAnimating ? 'opacity-90' : 'opacity-100'}>
      {displayValue.toLocaleString()}
    </span>
  )
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color = 'copper',
  delay = 0,
  suffix = ''
}: { 
  label: string
  value: number
  icon: string
  color?: 'copper' | 'emerald' | 'amber' | 'slate'
  delay?: number
  suffix?: string
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])
  
  const colors = {
    copper: {
      bg: 'from-orange-500/10 to-orange-600/5',
      border: 'border-orange-500/20 hover:border-orange-500/40',
      text: 'text-orange-400',
      glow: 'shadow-orange-500/20',
      indicator: 'bg-orange-500'
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
      indicator: 'bg-emerald-500'
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-600/5',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/20',
      indicator: 'bg-amber-500'
    },
    slate: {
      bg: 'from-slate-500/10 to-slate-600/5',
      border: 'border-slate-500/20 hover:border-slate-500/40',
      text: 'text-slate-400',
      glow: 'shadow-slate-500/20',
      indicator: 'bg-slate-500'
    }
  }
  
  const c = colors[color]
  
  return (
    <div 
      className={`
        relative overflow-hidden rounded-2xl border p-5
        bg-gradient-to-br ${c.bg} ${c.border}
        transition-all duration-500 card-hover
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${isHovered ? `shadow-xl ${c.glow}` : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background grid */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      {/* Shimmer effect on hover */}
      {isHovered && <div className="absolute inset-0 animate-shimmer" />}
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl filter drop-shadow-lg">{icon}</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${c.indicator} animate-pulse`} />
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Live</span>
          </div>
        </div>
        
        <div className={`text-3xl font-bold ${c.text} font-data tracking-tight`}>
          <AnimatedNumber value={value} duration={1800 + delay} />
          {suffix && <span className="text-lg ml-1 opacity-60">{suffix}</span>}
        </div>
        
        <div className="text-sm text-slate-500 mt-1.5 font-medium">{label}</div>
      </div>
      
      {/* Corner accent */}
      <div className={`absolute -bottom-2 -right-2 w-16 h-16 ${c.indicator} opacity-5 rounded-full blur-xl`} />
    </div>
  )
}

export default function StatsGrid({ client }: StatsGridProps) {
  const [timestamp, setTimestamp] = useState<string>('')
  const [dots, setDots] = useState('')
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimestamp(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="space-y-4">
      {/* Live data header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
            <div className="absolute w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-sm text-slate-400">
            Syncing data{dots}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-700" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50 font-data text-xs">
            <span className="text-slate-500">UTC</span>
            <span className="text-copper font-semibold">{timestamp}</span>
          </div>
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon="👥" 
          label="Total Subscribers" 
          value={client.totalSubscribers}
          color="copper"
          delay={0}
        />
        <StatCard 
          icon="✓" 
          label="Active" 
          value={client.activeSubscribers}
          color="emerald"
          delay={100}
        />
        <StatCard 
          icon="⏸" 
          label="Paused" 
          value={client.pausedSubscribers}
          color="amber"
          delay={200}
        />
        <StatCard 
          icon="✕" 
          label="Cancelled" 
          value={client.cancelledSubscribers}
          color="slate"
          delay={300}
        />
      </div>
    </div>
  )
}
