'use client'

import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { ClientData, statusStages, getStatusIndex } from '@/lib/types'

interface StatusBarProps {
  status: ClientData['status']
}

export default function StatusBar({ status }: StatusBarProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const currentIndex = getStatusIndex(status)
  const progress = ((currentIndex + 1) / statusStages.length) * 100

  // Check localStorage on mount to see if user has dismissed this
  useEffect(() => {
    if (status === 'Live') {
      const dismissed = localStorage.getItem('statusBarDismissed')
      if (dismissed === 'true') {
        setIsDismissed(true)
      }
    }
    setIsLoaded(true)
  }, [status])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('statusBarDismissed', 'true')
  }

  // Don't render if dismissed and status is Live
  if (isDismissed && status === 'Live') {
    return null
  }

  // Don't render until we've checked localStorage (prevents flash)
  if (status === 'Live' && !isLoaded) {
    return null
  }

  return (
    <div className="relative p-8 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
      {/* Top accent line */}
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#e07a42]/40 to-transparent" />

      {/* Dismiss button - only show when Live */}
      {status === 'Live' && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-[#71717a] hover:text-[#a1a1aa] transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-white">Build Progress</h3>
          <p className="text-sm text-[#71717a] mt-1">
            {status === 'Live' ? 'Your system is live and running' : `Currently in ${status} phase`}
          </p>
        </div>
        <div className="text-right pr-8">
          <span className="text-4xl font-semibold text-[#e07a42] font-mono tracking-tight">
            {Math.round(progress)}%
          </span>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#71717a] mt-1">Complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-10">
        <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c96a35] to-[#e07a42] rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(224,122,66,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status Steps */}
      <div className="flex justify-between">
        {statusStages.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={stage.id} className="flex flex-col items-center">
              {/* Node */}
              <div
                className={`
                  w-11 h-11 rounded-xl flex items-center justify-center text-lg
                  transition-all duration-300 border backdrop-blur-sm
                  ${isCompleted ? 'bg-[rgba(224,122,66,0.1)] border-[rgba(224,122,66,0.2)] text-[#e07a42]' : ''}
                  ${isCurrent ? 'bg-[#e07a42] border-transparent text-[#0c0c0c] shadow-lg shadow-[#e07a42]/25' : ''}
                  ${isPending ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[#71717a]' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{stage.icon}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  text-xs font-medium mt-3 transition-colors duration-300
                  ${isCompleted ? 'text-[#e07a42]' : ''}
                  ${isCurrent ? 'text-white' : ''}
                  ${isPending ? 'text-[#71717a]' : ''}
                `}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Current Status Description */}
      <div className="mt-10 pt-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-4">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center text-2xl border backdrop-blur-sm
              ${status === 'Live'
                ? 'bg-[rgba(224,122,66,0.1)] border-[rgba(224,122,66,0.2)]'
                : 'bg-[rgba(224,122,66,0.1)] border-[rgba(224,122,66,0.2)]'
              }
            `}
          >
            {statusStages[currentIndex].icon}
          </div>
          <div>
            <p className={`font-semibold ${status === 'Live' ? 'text-[#e07a42]' : 'text-white'}`}>
              {statusStages[currentIndex].label}
            </p>
            <p className="text-sm text-[#71717a] mt-0.5">
              {statusStages[currentIndex].description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
