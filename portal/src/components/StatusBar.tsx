'use client'

import { ClientData, statusStages, getStatusIndex } from '@/lib/types'
import { useEffect, useState, useRef } from 'react'

interface StatusBarProps {
  status: ClientData['status']
}

function StatusNode({
  stage,
  index,
  isCompleted,
  isCurrent,
  isPending,
  showGlow,
  totalStages,
}: {
  stage: { id: string; label: string; icon: string; description: string }
  index: number
  isCompleted: boolean
  isCurrent: boolean
  isPending: boolean
  showGlow: boolean
  totalStages: number
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="flex flex-col items-center gap-3 group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      <div
        className={`
          absolute -top-16 left-1/2 -translate-x-1/2 px-3 py-2
          glass rounded-lg text-xs text-center whitespace-nowrap
          transition-all duration-300 z-20
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
        `}
      >
        <p className="text-slate-200 font-medium">{stage.label}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">{stage.description}</p>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
          <div className="border-4 border-transparent border-t-slate-800/80" />
        </div>
      </div>

      {/* Node container with 3D effect */}
      <div
        className={`
          relative transition-all duration-500 transform-gpu
          ${isCurrent ? 'scale-110' : 'scale-100'}
          ${isHovered && !isPending ? 'scale-115' : ''}
        `}
        style={{
          transform: isHovered && !isPending
            ? 'perspective(500px) rotateX(-5deg) translateZ(10px)'
            : undefined,
        }}
      >
        {/* Outer glow rings for current */}
        {isCurrent && (
          <>
            <div className="absolute inset-[-8px] rounded-2xl border border-copper/20 animate-glow-ring" />
            <div
              className="absolute inset-[-4px] rounded-xl border border-copper/30 animate-glow-ring"
              style={{ animationDelay: '0.5s' }}
            />
          </>
        )}

        {/* Node */}
        <div
          className={`
            relative w-16 h-16 rounded-xl flex items-center justify-center text-2xl
            transition-all duration-500 transform-gpu overflow-hidden
            ${isCompleted ? 'bg-gradient-to-br from-copper/30 to-copper/10 border-2 border-copper shadow-glow-sm' : ''}
            ${isCurrent ? 'bg-gradient-to-br from-copper to-orange-600 border-2 border-copper shadow-glow-copper' : ''}
            ${isPending ? 'bg-slate-800/60 border-2 border-slate-700/50 glass' : ''}
          `}
        >
          {/* Shimmer overlay */}
          {(isCompleted || isCurrent) && (
            <div className="absolute inset-0 animate-shimmer opacity-50" />
          )}

          {/* Grid pattern inside */}
          <div className="absolute inset-0 grid-pattern-dense opacity-30" />

          {/* Icon or check */}
          {isCompleted ? (
            <div className="relative z-10 animate-bounce-in">
              <svg className="w-7 h-7 text-copper drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <span
              className={`
                relative z-10 transition-all duration-300 filter
                ${isPending ? 'opacity-40 grayscale' : 'drop-shadow-lg'}
                ${isCurrent ? 'animate-wave' : ''}
              `}
            >
              {stage.icon}
            </span>
          )}

          {/* Inner glow for current */}
          {isCurrent && (
            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
          )}
        </div>

        {/* Pulse effect for current */}
        {isCurrent && showGlow && (
          <div className="absolute inset-0 rounded-xl bg-copper/30 animate-ping opacity-30" />
        )}
      </div>

      {/* Label */}
      <span
        className={`
          text-[11px] font-semibold tracking-wider transition-all duration-300
          ${isCompleted ? 'text-copper' : ''}
          ${isCurrent ? 'text-copper glow-text-subtle scale-105' : ''}
          ${isPending ? 'text-slate-600' : ''}
        `}
      >
        {stage.label.toUpperCase()}
      </span>

      {/* Step number badge */}
      <div
        className={`
          absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold font-data
          transition-all duration-300
          ${isCompleted ? 'bg-copper/20 text-copper' : ''}
          ${isCurrent ? 'bg-copper text-white' : ''}
          ${isPending ? 'bg-slate-800 text-slate-500' : ''}
        `}
      >
        {String(index + 1).padStart(2, '0')}
      </div>
    </div>
  )
}

export default function StatusBar({ status }: StatusBarProps) {
  const currentIndex = getStatusIndex(status)
  const [animatedIndex, setAnimatedIndex] = useState(-1)
  const [showGlow, setShowGlow] = useState(false)
  const [progressWidth, setProgressWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const animateSteps = async () => {
      for (let i = 0; i <= currentIndex; i++) {
        await new Promise(resolve => setTimeout(resolve, 400))
        setAnimatedIndex(i)
        // Animate progress bar
        setProgressWidth((i / (statusStages.length - 1)) * 100)
      }
      setTimeout(() => setShowGlow(true), 500)
    }
    animateSteps()
  }, [currentIndex])

  return (
    <div
      ref={containerRef}
      className="relative glass-strong rounded-3xl p-8 overflow-hidden gradient-border-animated"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-copper/5 via-transparent to-copper/5 animate-gradient" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Morphing corner glow */}
      <div
        className="absolute -top-32 -right-32 w-64 h-64 bg-copper/15 rounded-full blur-3xl animate-morph"
        style={{ animationDuration: '12s' }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-morph"
        style={{ animationDuration: '15s', animationDelay: '3s' }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-copper/30 to-copper/10 rounded-xl flex items-center justify-center glass border border-copper/20">
                <span className="text-2xl filter drop-shadow-lg animate-float" style={{ animationDuration: '3s' }}>
                  {status === 'Live' ? '🚀' : '⚡'}
                </span>
              </div>
              <div className="absolute -inset-1 bg-copper/20 rounded-xl blur-md -z-10 animate-pulse-slow" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-50">Build Progress</h2>
              <p className="text-xs text-slate-500 font-data tracking-widest mt-0.5">AUTOMATION PIPELINE</p>
            </div>
          </div>

          {/* Stage counter */}
          <div className="relative group">
            <div className="flex items-center gap-3 px-5 py-3 glass rounded-2xl border border-slate-700/50 transition-all duration-300 group-hover:border-copper/30 group-hover:shadow-glow-sm">
              <span className="text-slate-500 font-data text-sm tracking-wider">STAGE</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold gradient-text font-data">
                  {currentIndex + 1}
                </span>
                <span className="text-slate-600 text-lg">/</span>
                <span className="text-slate-400 font-data text-lg">{statusStages.length}</span>
              </div>
            </div>
            {/* Decorative line */}
            <div className="absolute -left-8 top-1/2 w-6 h-px bg-gradient-to-r from-transparent to-slate-700" />
          </div>
        </div>

        {/* Progress visualization */}
        <div className="relative mb-10 pt-4">
          {/* Track background */}
          <div className="absolute top-[calc(2rem+32px)] left-12 right-12 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
            {/* Animated dots pattern */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(224,122,66,0.3) 8px, rgba(224,122,66,0.3) 12px)',
                backgroundSize: '20px 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            />
          </div>

          {/* Filled progress track */}
          <div
            className="absolute top-[calc(2rem+32px)] left-12 h-1.5 bg-gradient-to-r from-copper via-orange-500 to-amber-500 rounded-full transition-all duration-700 ease-out-expo overflow-hidden"
            style={{ width: `calc(${progressWidth}% - 3rem)` }}
          >
            {/* Shimmer on progress */}
            <div className="absolute inset-0 animate-shimmer" />

            {/* Glow tip */}
            {showGlow && animatedIndex < statusStages.length - 1 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-copper rounded-full blur-sm animate-pulse" />
            )}
          </div>

          {/* Progress glow trail */}
          <div
            className="absolute top-[calc(2rem+30px)] left-12 h-3 bg-copper/20 rounded-full blur-md transition-all duration-700 ease-out-expo"
            style={{ width: `calc(${progressWidth}% - 3rem)` }}
          />

          {/* Nodes */}
          <div className="flex justify-between relative pt-8">
            {statusStages.map((stage, index) => {
              const isCompleted = index < animatedIndex
              const isCurrent = index === animatedIndex
              const isPending = index > animatedIndex

              return (
                <StatusNode
                  key={stage.id}
                  stage={stage}
                  index={index}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  isPending={isPending}
                  showGlow={showGlow}
                  totalStages={statusStages.length}
                />
              )
            })}
          </div>
        </div>

        {/* Current status card */}
        <div
          className={`
            rounded-2xl p-5 border transition-all duration-500 relative overflow-hidden
            ${status === 'Live'
              ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 shadow-glow-emerald'
              : 'glass border-slate-700/50'}
          `}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 grid-pattern-dense opacity-20" />

          {/* Shimmer effect */}
          {status === 'Live' && <div className="absolute inset-0 animate-shimmer" />}

          <div className="relative flex items-center gap-5">
            <div
              className={`
                w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
                transition-all duration-500 relative overflow-hidden
                ${status === 'Live'
                  ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 border border-emerald-500/30'
                  : 'bg-gradient-to-br from-copper/30 to-copper/10 border border-copper/30'}
              `}
            >
              <div className="absolute inset-0 animate-shimmer opacity-30" />
              <span className={`relative z-10 ${status === 'Live' ? 'animate-bounce-in' : 'animate-wave'}`}>
                {statusStages[currentIndex].icon}
              </span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`
                    text-xl font-bold
                    ${status === 'Live' ? 'text-emerald-400' : 'text-slate-100'}
                  `}
                >
                  {status === 'Live' ? 'System Live!' : statusStages[currentIndex].label}
                </span>

                {status === 'Live' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30 animate-pulse-slow">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    ACTIVE
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-lg">
                {statusStages[currentIndex].description}
              </p>
            </div>

            {/* Progress percentage */}
            <div className="hidden sm:block text-right">
              <div className="text-3xl font-bold font-data gradient-text">
                {Math.round(((currentIndex + 1) / statusStages.length) * 100)}%
              </div>
              <p className="text-xs text-slate-500 font-data tracking-wider">COMPLETE</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
