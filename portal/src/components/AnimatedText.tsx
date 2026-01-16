'use client'

import { useEffect, useState, useRef } from 'react'

interface AnimatedTextProps {
  text: string
  className?: string
  delay?: number
  staggerDelay?: number
  animation?: 'typewriter' | 'fadeUp' | 'slideIn' | 'glitch' | 'gradient'
}

export function TypewriterText({
  text,
  className = '',
  delay = 0,
  speed = 50,
}: {
  text: string
  className?: string
  delay?: number
  speed?: number
}) {
  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(interval)
          setTimeout(() => setShowCursor(false), 1000)
        }
      }, speed)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [text, delay, speed])

  return (
    <span className={className}>
      {displayText}
      {showCursor && (
        <span className="inline-block w-[2px] h-[1em] bg-copper ml-1 animate-pulse" />
      )}
    </span>
  )
}

export function FadeUpText({
  text,
  className = '',
  delay = 0,
  staggerDelay = 50,
}: {
  text: string
  className?: string
  delay?: number
  staggerDelay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const words = text.split(' ')

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  return (
    <span className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={`inline-block transition-all duration-500 ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: `${index * staggerDelay}ms` }}
        >
          {word}
          {index < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </span>
  )
}

export function GlitchText({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  return (
    <span className={`glitch-text relative ${className}`} data-text={text}>
      {text}
    </span>
  )
}

export function GradientText({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  return <span className={`gradient-text ${className}`}>{text}</span>
}

export function CountUpNumber({
  value,
  duration = 2000,
  delay = 0,
  suffix = '',
  prefix = '',
  className = '',
}: {
  value: number
  duration?: number
  delay?: number
  suffix?: string
  prefix?: string
  className?: string
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setHasStarted(true)
      let startTime: number

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)

        // Ease out expo
        const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        setDisplayValue(Math.floor(easeOutExpo * value))

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [value, duration, delay])

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}

export function RevealText({
  text,
  className = '',
  delay = 0,
}: {
  text: string
  className?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  return (
    <span ref={ref} className={`relative overflow-hidden inline-block ${className}`}>
      <span
        className={`inline-block transition-transform duration-700 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {text}
      </span>
    </span>
  )
}

export function ScrambleText({
  text,
  className = '',
  delay = 0,
}: {
  text: string
  className?: string
  delay?: number
}) {
  const [displayText, setDisplayText] = useState(text.replace(/\S/g, ' '))
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      let iteration = 0
      const maxIterations = text.length * 3

      const interval = setInterval(() => {
        setDisplayText(
          text
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' '
              if (index < iteration / 3) {
                return text[index]
              }
              return chars[Math.floor(Math.random() * chars.length)]
            })
            .join('')
        )

        iteration++

        if (iteration >= maxIterations) {
          clearInterval(interval)
          setDisplayText(text)
        }
      }, 30)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [text, delay])

  return <span className={`font-data ${className}`}>{displayText}</span>
}

export default function AnimatedText({
  text,
  className = '',
  delay = 0,
  staggerDelay = 50,
  animation = 'fadeUp',
}: AnimatedTextProps) {
  switch (animation) {
    case 'typewriter':
      return <TypewriterText text={text} className={className} delay={delay} />
    case 'fadeUp':
      return (
        <FadeUpText
          text={text}
          className={className}
          delay={delay}
          staggerDelay={staggerDelay}
        />
      )
    case 'glitch':
      return <GlitchText text={text} className={className} />
    case 'gradient':
      return <GradientText text={text} className={className} />
    default:
      return <span className={className}>{text}</span>
  }
}
