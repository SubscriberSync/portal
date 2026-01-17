'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { ClientData, statusStages, getStatusIndex } from '@/lib/types'

interface StatusBarProps {
  status: ClientData['status']
}

export default function StatusBar({ status }: StatusBarProps) {
  const [isDismissed, setIsDismissed] = useState(false)
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
  }, [status])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('statusBarDismissed', 'true')
  }

  // Don't render if dismissed and status is Live
  if (isDismissed && status === 'Live') {
    return null
  }

  return (
    <div className="p-8 rounded-2xl bg-background-secondary border border-border relative">
      {/* Dismiss button - only show when Live */}
      {status === 'Live' && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-background-elevated text-foreground-tertiary hover:text-foreground transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-title text-foreground">Build Progress</h3>
          <p className="text-sm text-foreground-secondary mt-1">
            {status === 'Live' ? 'Your system is live' : `Currently in ${status} phase`}
          </p>
        </div>
        <div className="text-right pr-8">
          <span className="text-3xl font-semibold text-foreground font-mono">
            {Math.round(progress)}%
          </span>
          <p className="text-xs text-foreground-tertiary mt-1">Complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-10">
        <div className="h-1 bg-background-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
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
                  w-10 h-10 rounded-xl flex items-center justify-center text-lg
                  transition-all duration-300
                  ${isCompleted ? 'bg-accent/20 text-accent' : ''}
                  ${isCurrent ? 'bg-accent text-white' : ''}
                  ${isPending ? 'bg-background-elevated text-foreground-tertiary' : ''}
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{stage.icon}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  text-xs font-medium mt-3 transition-colors duration-300
                  ${isCompleted ? 'text-accent' : ''}
                  ${isCurrent ? 'text-foreground' : ''}
                  ${isPending ? 'text-foreground-tertiary' : ''}
                `}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Current Status Description */}
      <div className="mt-10 pt-6 border-t border-border">
        <div className="flex items-center gap-4">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center text-2xl
              ${status === 'Live' ? 'bg-success/10' : 'bg-accent/10'}
            `}
          >
            {statusStages[currentIndex].icon}
          </div>
          <div>
            <p className={`font-medium ${status === 'Live' ? 'text-success' : 'text-foreground'}`}>
              {statusStages[currentIndex].label}
            </p>
            <p className="text-sm text-foreground-secondary mt-0.5">
              {statusStages[currentIndex].description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
