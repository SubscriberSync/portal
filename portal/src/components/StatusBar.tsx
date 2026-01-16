'use client'

import { ClientData, statusStages, getStatusIndex } from '@/lib/types'
import { useEffect, useState } from 'react'

interface StatusBarProps {
  status: ClientData['status']
}

export default function StatusBar({ status }: StatusBarProps) {
  const currentIndex = getStatusIndex(status)
  const [animatedIndex, setAnimatedIndex] = useState(-1)
  const [showGlow, setShowGlow] = useState(false)
  
  useEffect(() => {
    const animateSteps = async () => {
      for (let i = 0; i <= currentIndex; i++) {
        await new Promise(resolve => setTimeout(resolve, 400))
        setAnimatedIndex(i)
      }
      setTimeout(() => setShowGlow(true), 500)
    }
    animateSteps()
  }, [currentIndex])
  
  return (
    <div className="relative bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 overflow-hidden animate-border-pulse">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-copper/5 via-transparent to-copper/5 animate-gradient" />
      <div className="absolute inset-0 grid-pattern opacity-40" />
      
      {/* Corner glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-copper/20 rounded-full blur-3xl animate-pulse" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-copper/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Build Progress</h2>
              <p className="text-xs text-slate-500 font-data">AUTOMATION PIPELINE</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
            <span className="text-slate-500 font-data text-sm">STAGE</span>
            <span className="text-2xl font-bold text-copper font-data">{currentIndex + 1}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 font-data">{statusStages.length}</span>
          </div>
        </div>
        
        {/* Progress visualization */}
        <div className="relative mb-8">
          {/* Track background */}
          <div className="absolute top-7 left-10 right-10 h-1 bg-slate-800 rounded-full overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(224,122,66,0.3) 10px, rgba(224,122,66,0.3) 20px)',
                backgroundSize: '20px 100%',
                animation: 'shimmer 1s linear infinite'
              }}
            />
          </div>
          
          {/* Filled track */}
          <div 
            className="absolute top-7 left-10 h-1 bg-gradient-to-r from-copper via-copper to-orange-400 rounded-full transition-all duration-700 ease-out"
            style={{ 
              width: animatedIndex >= 0 ? `calc(${(animatedIndex / (statusStages.length - 1)) * 100}% - 5rem)` : '0%',
            }}
          >
            {/* Glow tip */}
            {showGlow && animatedIndex < statusStages.length - 1 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-copper rounded-full blur-sm animate-pulse" />
            )}
          </div>
          
          {/* Nodes */}
          <div className="flex justify-between relative">
            {statusStages.map((stage, index) => {
              const isCompleted = index < animatedIndex
              const isCurrent = index === animatedIndex
              const isPending = index > animatedIndex
              
              return (
                <div key={stage.id} className="flex flex-col items-center gap-3 group">
                  {/* Node */}
                  <div className={`
                    relative w-14 h-14 rounded-xl flex items-center justify-center text-xl
                    transition-all duration-500 transform
                    ${isCompleted ? 'bg-copper/20 border-2 border-copper' : ''}
                    ${isCurrent ? 'bg-copper border-2 border-copper scale-110' : ''}
                    ${isPending ? 'bg-slate-800/80 border-2 border-slate-700' : ''}
                    ${isCurrent && showGlow ? 'shadow-lg shadow-copper/40' : ''}
                  `}>
                    {isCompleted ? (
                      <svg className="w-6 h-6 text-copper" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className={`transition-opacity ${isPending ? 'opacity-40' : ''}`}>
                        {stage.icon}
                      </span>
                    )}
                    
                    {/* Pulse ring */}
                    {isCurrent && (
                      <>
                        <div className="absolute inset-0 rounded-xl border-2 border-copper animate-ping opacity-20" />
                        <div className="absolute -inset-1 rounded-xl bg-copper/10 animate-pulse" />
                      </>
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={`
                    text-xs font-semibold tracking-wide transition-all duration-300
                    ${isCompleted ? 'text-copper' : ''}
                    ${isCurrent ? 'text-copper scale-105' : ''}
                    ${isPending ? 'text-slate-600' : ''}
                  `}>
                    {stage.label.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Current status card */}
        <div className={`
          rounded-xl p-4 border transition-all duration-500
          ${status === 'Live' 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-slate-800/50 border-slate-700/50'}
        `}>
          <div className="flex items-center gap-4">
            <div className={`
              w-14 h-14 rounded-xl flex items-center justify-center text-2xl
              ${status === 'Live' ? 'bg-emerald-500/20' : 'bg-copper/20'}
            `}>
              {statusStages[currentIndex].icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className={`
                  text-lg font-semibold
                  ${status === 'Live' ? 'text-emerald-400' : 'text-slate-100'}
                `}>
                  {status === 'Live' ? '🎉 System Live!' : statusStages[currentIndex].label}
                </span>
                {status === 'Live' && (
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {statusStages[currentIndex].description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
