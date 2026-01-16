'use client'

import { ClientData } from '@/lib/types'
import { useEffect, useState, useRef } from 'react'

interface StatsGridProps {
  client: ClientData
}

function AnimatedNumber({ value, duration = 2000, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setHasStarted(true)
      let startTime: number
      let animationFrame: number

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)

        // Enhanced easing - elastic out
        const easeOutElastic = progress === 1
          ? 1
          : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * (2 * Math.PI / 3)) + 1

        const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        // Mix elastic and expo for a more interesting effect
        const eased = easeOutExpo * 0.7 + easeOutElastic * 0.3

        setDisplayValue(Math.floor(eased * value))

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate)
        }
      }

      animationFrame = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animationFrame)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [value, duration, delay])

  return (
    <span
      className={`
        inline-block transition-all duration-300
        ${hasStarted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
    >
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
  suffix = '',
  trend,
}: {
  label: string
  value: number
  icon: string
  color?: 'copper' | 'emerald' | 'amber' | 'slate'
  delay?: number
  suffix?: string
  trend?: { value: number; isPositive: boolean }
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  // 3D tilt effect on hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isHovered) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = (y - centerY) / 20
    const rotateY = (centerX - x) / 20

    cardRef.current.style.transform = `
      perspective(1000px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      translateZ(10px)
      scale(1.02)
    `
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (cardRef.current) {
      cardRef.current.style.transform = ''
    }
  }

  const colors = {
    copper: {
      bg: 'from-copper/15 via-orange-600/10 to-amber-500/5',
      border: 'border-copper/20 hover:border-copper/40',
      text: 'text-copper',
      glow: 'shadow-glow-copper',
      indicator: 'bg-copper',
      accent: 'bg-copper/20',
      ring: 'ring-copper/20',
    },
    emerald: {
      bg: 'from-emerald-500/15 via-emerald-600/10 to-teal-500/5',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      text: 'text-emerald-400',
      glow: 'shadow-glow-emerald',
      indicator: 'bg-emerald-400',
      accent: 'bg-emerald-500/20',
      ring: 'ring-emerald-500/20',
    },
    amber: {
      bg: 'from-amber-500/15 via-amber-600/10 to-orange-500/5',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/30',
      indicator: 'bg-amber-400',
      accent: 'bg-amber-500/20',
      ring: 'ring-amber-500/20',
    },
    slate: {
      bg: 'from-slate-500/15 via-slate-600/10 to-slate-700/5',
      border: 'border-slate-500/20 hover:border-slate-500/40',
      text: 'text-slate-400',
      glow: 'shadow-slate-500/20',
      indicator: 'bg-slate-400',
      accent: 'bg-slate-500/20',
      ring: 'ring-slate-500/20',
    },
  }

  const c = colors[color]

  return (
    <div
      ref={cardRef}
      className={`
        relative overflow-hidden rounded-2xl border p-6
        glass ${c.border}
        transition-all duration-500 ease-out-expo
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${isHovered ? `${c.glow}` : ''}
      `}
      style={{
        transitionDelay: `${delay}ms`,
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-50`} />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern-dense opacity-30" />

      {/* Shimmer effect on hover */}
      <div
        className={`
          absolute inset-0 animate-shimmer transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
      />

      {/* Corner accent */}
      <div
        className={`
          absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl
          ${c.accent} transition-opacity duration-500
          ${isHovered ? 'opacity-80' : 'opacity-40'}
        `}
      />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          {/* Icon container */}
          <div
            className={`
              relative w-12 h-12 rounded-xl flex items-center justify-center
              ${c.accent} border ${c.border.split(' ')[0]}
              transition-all duration-300
              ${isHovered ? 'scale-110 rotate-3' : ''}
            `}
          >
            <span className="text-2xl filter drop-shadow-lg">{icon}</span>
            {/* Icon glow */}
            <div
              className={`
                absolute inset-0 rounded-xl ${c.accent} blur-md -z-10
                transition-opacity duration-300
                ${isHovered ? 'opacity-100' : 'opacity-0'}
              `}
            />
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${c.indicator}`} />
              <div className={`absolute inset-0 w-2 h-2 rounded-full ${c.indicator} animate-ping opacity-50`} />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Live
            </span>
          </div>
        </div>

        {/* Value */}
        <div className={`text-4xl font-bold ${c.text} font-data tracking-tight mb-1`}>
          <AnimatedNumber value={value} duration={1800} delay={delay + 200} />
          {suffix && <span className="text-lg ml-1 opacity-60">{suffix}</span>}
        </div>

        {/* Label */}
        <div className="text-sm text-slate-400 font-medium">{label}</div>

        {/* Trend indicator (optional) */}
        {trend && (
          <div
            className={`
              flex items-center gap-1 mt-3 text-xs font-semibold
              ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}
            `}
          >
            <svg
              className={`w-3 h-3 ${trend.isPositive ? '' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span>{trend.value}%</span>
            <span className="text-slate-500 font-normal">vs last month</span>
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className={`
          absolute bottom-0 left-0 h-1 ${c.indicator}
          transition-all duration-500 ease-out-expo
          ${isHovered ? 'w-full opacity-60' : 'w-0 opacity-0'}
        `}
      />
    </div>
  )
}

export default function StatsGrid({ client }: StatsGridProps) {
  const [timestamp, setTimestamp] = useState<string>('')
  const [dots, setDots] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)

    const updateTime = () => {
      const now = new Date()
      setTimestamp(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`
        space-y-5 transition-all duration-700
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Live data header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          {/* Animated sync indicator */}
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 bg-emerald-400 rounded-full" />
            <div className="absolute w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-50" />
            <div
              className="absolute w-6 h-6 rounded-full border border-emerald-400/30 animate-glow-ring"
              style={{ animationDuration: '3s' }}
            />
          </div>
          <span className="text-sm text-slate-400 font-medium">
            Syncing data
            <span className="inline-block w-6 text-copper">{dots}</span>
          </span>
        </div>

        {/* Timestamp display */}
        <div className="flex items-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-slate-700 to-slate-700" />
          <div className="relative group">
            <div className="flex items-center gap-2.5 px-4 py-2 glass rounded-xl border border-slate-700/50 font-data text-xs transition-all duration-300 group-hover:border-copper/30 group-hover:shadow-glow-sm">
              <span className="text-slate-500 uppercase tracking-wider">UTC</span>
              <span className="text-copper font-bold tracking-wider">{timestamp}</span>
            </div>
            {/* Decorative pulse */}
            <div className="absolute -right-1 -top-1 w-2 h-2 bg-copper rounded-full opacity-60 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats grid with staggered animations */}
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

      {/* Summary row */}
      <div className="flex items-center justify-center gap-6 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>
            <span className="text-emerald-400 font-semibold">
              {client.activeSubscribers > 0
                ? Math.round((client.activeSubscribers / client.totalSubscribers) * 100)
                : 0}
              %
            </span>{' '}
            active rate
          </span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>
            <span className="text-amber-400 font-semibold">
              {client.pausedSubscribers > 0
                ? Math.round((client.pausedSubscribers / client.totalSubscribers) * 100)
                : 0}
              %
            </span>{' '}
            paused
          </span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>
            <span className="text-slate-400 font-semibold">
              {client.cancelledSubscribers > 0
                ? Math.round((client.cancelledSubscribers / client.totalSubscribers) * 100)
                : 0}
              %
            </span>{' '}
            churned
          </span>
        </div>
      </div>
    </div>
  )
}
