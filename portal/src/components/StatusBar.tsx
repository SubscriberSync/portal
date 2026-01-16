'use client'

import { ClientData, statusStages, getStatusIndex } from '@/lib/types'

interface StatusBarProps {
  status: ClientData['status']
}

export default function StatusBar({ status }: StatusBarProps) {
  const currentIndex = getStatusIndex(status)

  return (
    <div className="bg-slate rounded-2xl p-8 border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-semibold text-light">Build Progress</h2>
        <span className="text-copper font-medium">
          {currentIndex + 1} of {statusStages.length}
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative mb-6">
        {/* Background Track */}
        <div className="absolute top-6 left-8 right-8 h-1 bg-border rounded-full" />
        
        {/* Filled Track */}
        <div 
          className="absolute top-6 left-8 h-1 bg-copper rounded-full transition-all duration-500"
          style={{ 
            width: `calc(${(currentIndex / (statusStages.length - 1)) * 100}% - ${currentIndex === 0 ? 0 : 4}rem)` 
          }}
        />

        {/* Stage Nodes */}
        <div className="relative flex justify-between">
          {statusStages.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div key={stage.id} className="flex flex-col items-center gap-3">
                {/* Node Circle */}
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-xl
                    transition-all duration-300 border-2
                    ${isCurrent 
                      ? 'bg-copper border-copper shadow-lg shadow-copper/30' 
                      : isCompleted 
                        ? 'bg-success-dark border-success' 
                        : 'bg-slate border-border'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{stage.icon}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    text-sm font-medium transition-colors
                    ${isCurrent ? 'text-copper' : isCompleted ? 'text-success' : 'text-muted'}
                  `}
                >
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Stage Info */}
      <div className="mt-8 p-4 bg-ink rounded-xl border border-border">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-copper rounded-lg flex items-center justify-center text-lg">
            {statusStages[currentIndex].icon}
          </div>
          <div>
            <div className="font-semibold text-light">
              {statusStages[currentIndex].label}
            </div>
            <div className="text-sm text-muted">
              {statusStages[currentIndex].description}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
