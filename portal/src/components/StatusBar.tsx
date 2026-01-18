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
    <div className="relative p-8 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#C9A962]/30 to-transparent" />

      {/* Dismiss button - only show when Live */}
      {status === 'Live' && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#1A1A1A] text-[#6B6660] hover:text-[#A8A39B] transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-[#F5F0E8]">Build Progress</h3>
          <p className="text-sm text-[#6B6660] mt-1">
            {status === 'Live' ? 'Your system is live and running' : `Currently in ${status} phase`}
          </p>
        </div>
        <div className="text-right pr-8">
          <span className="text-4xl font-semibold text-[#C9A962] font-mono tracking-tight">
            {Math.round(progress)}%
          </span>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#6B6660] mt-1">Complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-10">
        <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#A8893F] to-[#C9A962] rounded-full transition-all duration-1000 ease-out"
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
                  transition-all duration-300 border
                  ${isCompleted ? 'bg-[#C9A962]/10 border-[#C9A962]/20 text-[#C9A962]' : ''}
                  ${isCurrent ? 'bg-gradient-to-br from-[#C9A962] to-[#A8893F] border-transparent text-[#0D0D0D] shadow-lg shadow-[#C9A962]/20' : ''}
                  ${isPending ? 'bg-[#1A1A1A] border-[rgba(245,240,232,0.06)] text-[#4A4743]' : ''}
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
                  ${isCompleted ? 'text-[#C9A962]' : ''}
                  ${isCurrent ? 'text-[#F5F0E8]' : ''}
                  ${isPending ? 'text-[#4A4743]' : ''}
                `}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Current Status Description */}
      <div className="mt-10 pt-6 border-t border-[rgba(245,240,232,0.06)]">
        <div className="flex items-center gap-4">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center text-2xl border
              ${status === 'Live'
                ? 'bg-[#5CB87A]/10 border-[#5CB87A]/20'
                : 'bg-[#C9A962]/10 border-[#C9A962]/20'
              }
            `}
          >
            {statusStages[currentIndex].icon}
          </div>
          <div>
            <p className={`font-semibold ${status === 'Live' ? 'text-[#5CB87A]' : 'text-[#F5F0E8]'}`}>
              {statusStages[currentIndex].label}
            </p>
            <p className="text-sm text-[#6B6660] mt-0.5">
              {statusStages[currentIndex].description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
