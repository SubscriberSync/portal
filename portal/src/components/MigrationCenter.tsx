'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  SkipForward,
  Sparkles,
  Filter,
  SortAsc,
  SortDesc,
  FileQuestion,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface SkuAlias {
  id: string
  shopify_sku: string
  product_sequence_id: number
  product_name: string | null
}

interface ProductPattern {
  id: string
  pattern: string
  pattern_type: 'contains' | 'regex' | 'starts_with' | 'ends_with'
  product_sequence_id: number
  description?: string
}

interface MigrationRun {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_subscribers: number
  processed_subscribers: number
  clean_count: number
  flagged_count: number
  unmapped_count?: number
  skipped_count?: number
  started_at: string | null
  completed_at: string | null
  paused_at?: string | null
}

interface AuditStats {
  total: number
  clean: number
  flagged: number
  resolved: number
  unmapped: number
}

interface DetectedSku {
  sku: string
  name: string
  count: number
  isMapped: boolean
  mappedTo?: number
}

interface UnmappedItem {
  id: string
  sku: string | null
  product_name: string
  order_number: number
  customer_email: string
  order_date: string
  resolved: boolean
  resolved_sequence?: number
}

interface AuditLog {
  id: string
  email: string
  status: string
  flag_reasons: string[]
  detected_sequences: number[]
  sequence_dates: Array<{
    sequence: number
    date: string
    orderId: string
    orderNumber: number
    sku: string
    productName: string
  }>
  proposed_next_box: number
  confidence_score?: number
  ai_explanation?: string
  subscriber: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
}

interface PatternSuggestion {
  pattern: string
  pattern_type: 'contains' | 'regex' | 'starts_with' | 'ends_with'
  sequence: number
  match_count: number
  example_matches: string[]
}

interface MigrationCenterProps {
  organizationId: string
  clientSlug: string
  skuAliases: SkuAlias[]
  latestRun: MigrationRun | null
  auditStats: AuditStats
  pendingSubscribers: number
  isAdmin: boolean
  installmentName?: string
}

type Step = 'mapping' | 'audit' | 'review' | 'complete'
type SortField = 'date' | 'name' | 'email' | 'flag' | 'confidence'
type SortDir = 'asc' | 'desc'

// ============================================================================
// Main Component
// ============================================================================

export default function MigrationCenter({
  organizationId,
  clientSlug,
  skuAliases: initialAliases,
  latestRun: initialRun,
  auditStats: initialStats,
  pendingSubscribers: initialPending,
  isAdmin,
  installmentName = 'Box',
}: MigrationCenterProps) {
  // Determine initial step based on state
  const getInitialStep = (): Step => {
    if (initialRun?.status === 'completed' && initialStats.flagged === 0) {
      return 'complete'
    }
    if (initialRun?.status === 'completed' && initialStats.flagged > 0) {
      return 'review'
    }
    if (initialRun?.status === 'running') {
      return 'audit'
    }
    if (initialAliases.length > 0) {
      return 'audit'
    }
    return 'mapping'
  }

  // Core state
  const [step, setStep] = useState<Step>(getInitialStep())
  const [skuAliases, setSkuAliases] = useState<SkuAlias[]>(initialAliases)
  const [patterns, setPatterns] = useState<ProductPattern[]>([])
  const [detectedSkus, setDetectedSkus] = useState<DetectedSku[]>([])
  const [loadingSkus, setLoadingSkus] = useState(false)
  const [savingMappings, setSavingMappings] = useState(false)

  // Audit state
  const [migrationRun, setMigrationRun] = useState<MigrationRun | null>(initialRun)
  const [auditStats, setAuditStats] = useState<AuditStats>(initialStats)
  const [pendingSubscribers, setPendingSubscribers] = useState(initialPending)
  const [auditProgress, setAuditProgress] = useState(0)
  const [isAuditing, setIsAuditing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Unmapped items state
  const [unmappedItems, setUnmappedItems] = useState<UnmappedItem[]>([])
  const [loadingUnmapped, setLoadingUnmapped] = useState(false)
  const [unmappedSearch, setUnmappedSearch] = useState('')
  const [selectedUnmapped, setSelectedUnmapped] = useState<Set<string>>(new Set())

  // Review state
  const [flaggedLogs, setFlaggedLogs] = useState<AuditLog[]>([])
  const [loadingFlagged, setLoadingFlagged] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [resolveBox, setResolveBox] = useState<number>(1)
  const [resolving, setResolving] = useState(false)
  const [reviewSearch, setReviewSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('flag')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterFlag, setFilterFlag] = useState<string | null>(null)

  // AI state
  const [aiAvailable, setAiAvailable] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [suggestedPatterns, setSuggestedPatterns] = useState<PatternSuggestion[]>([])

  // Mapping state
  const [pendingMappings, setPendingMappings] = useState<Map<string, number>>(new Map())
  const [showPatternForm, setShowPatternForm] = useState(false)
  const [newPattern, setNewPattern] = useState({ pattern: '', type: 'contains' as const, sequence: 0 })

  // Check AI availability on mount
  useEffect(() => {
    fetch('/api/migration/ai-suggest')
      .then(res => res.json())
      .then(data => setAiAvailable(data.available))
      .catch(() => setAiAvailable(false))
  }, [])

  // Detect SKUs on mount if in mapping step
  useEffect(() => {
    if (step === 'mapping' && detectedSkus.length === 0) {
      detectSkus()
    }
  }, [step])

  // Load flagged logs when in review step
  useEffect(() => {
    if (step === 'review') {
      loadFlaggedLogs()
    }
  }, [step])

  // ============================================================================
  // API Functions
  // ============================================================================

  const detectSkus = async () => {
    setLoadingSkus(true)
    try {
      const res = await fetch('/api/migration/detect-skus?years=3')
      const data = await res.json()
      if (res.ok) {
        setDetectedSkus(data.skus)
      }
    } catch (error) {
      console.error('Failed to detect SKUs:', error)
    } finally {
      setLoadingSkus(false)
    }
  }

  const saveMappings = async () => {
    if (pendingMappings.size === 0) return

    setSavingMappings(true)
    try {
      const mappings = Array.from(pendingMappings.entries()).map(([sku, sequence]) => {
        const detected = detectedSkus.find(d => d.sku === sku)
        return {
          sku,
          sequence,
          name: detected?.name,
        }
      })

      const res = await fetch('/api/migration/sku-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      })

      if (res.ok) {
        // Refresh aliases
        const aliasRes = await fetch('/api/migration/sku-aliases')
        const aliasData = await aliasRes.json()
        setSkuAliases(aliasData.aliases)
        setPendingMappings(new Map())

        // Update detected SKUs as mapped
        setDetectedSkus(prev =>
          prev.map(sku => ({
            ...sku,
            isMapped: pendingMappings.has(sku.sku) || sku.isMapped,
            mappedTo: pendingMappings.get(sku.sku) || sku.mappedTo,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to save mappings:', error)
    } finally {
      setSavingMappings(false)
    }
  }

  const savePattern = async () => {
    if (!newPattern.pattern) return

    try {
      const res = await fetch('/api/migration/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: newPattern.pattern,
          pattern_type: newPattern.type,
          product_sequence_id: newPattern.sequence,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setPatterns(prev => [...prev, data.pattern])
        setShowPatternForm(false)
        setNewPattern({ pattern: '', type: 'contains', sequence: 0 })
      }
    } catch (error) {
      console.error('Failed to save pattern:', error)
    }
  }

  const startAudit = async () => {
    setIsAuditing(true)
    setIsPaused(false)
    setAuditProgress(0)

    try {
      // Start a new migration run
      const startRes = await fetch('/api/migration/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const startData = await startRes.json()
      if (!startRes.ok) {
        throw new Error(startData.error)
      }

      setMigrationRun(startData.run)
      setPendingSubscribers(startData.totalSubscribers)

      // Process in batches
      const batchSize = 5
      const allIds = startData.subscriberIds
      let processed = 0
      let cleanCount = 0
      let flaggedCount = 0

      for (let i = 0; i < allIds.length && !isPaused; i += batchSize) {
        const batch = allIds.slice(i, i + batchSize)

        const auditRes = await fetch('/api/migration/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriberIds: batch,
            migrationRunId: startData.run.id,
          }),
        })

        const auditData = await auditRes.json()
        if (auditRes.ok) {
          processed += auditData.processed
          cleanCount += auditData.results.filter((r: { status: string }) => r.status === 'clean').length
          flaggedCount += auditData.results.filter((r: { status: string }) => r.status === 'flagged').length

          setAuditProgress(Math.round((processed / allIds.length) * 100))
          setAuditStats({
            total: processed,
            clean: cleanCount,
            flagged: flaggedCount,
            resolved: 0,
            unmapped: auditData.unmappedCount || 0,
          })
        }
      }

      // Mark run as complete (if not paused)
      if (!isPaused) {
        await fetch('/api/migration/runs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: startData.run.id,
            status: 'completed',
          }),
        })

        setMigrationRun(prev => prev ? { ...prev, status: 'completed' } : null)

        // Move to review if there are flagged, otherwise complete
        if (flaggedCount > 0) {
          setStep('review')
        } else {
          await completeMigration()
          setStep('complete')
        }
      }
    } catch (error) {
      console.error('Audit failed:', error)
    } finally {
      setIsAuditing(false)
    }
  }

  const pauseAudit = () => {
    setIsPaused(true)
  }

  const loadFlaggedLogs = async () => {
    setLoadingFlagged(true)
    try {
      const res = await fetch('/api/migration/resolve?status=flagged')
      const data = await res.json()
      if (res.ok) {
        setFlaggedLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to load flagged logs:', error)
    } finally {
      setLoadingFlagged(false)
    }
  }

  const loadUnmappedItems = async () => {
    setLoadingUnmapped(true)
    try {
      const params = new URLSearchParams({ resolved: 'false' })
      if (unmappedSearch) params.set('search', unmappedSearch)

      const res = await fetch(`/api/migration/unmapped?${params}`)
      const data = await res.json()
      if (res.ok) {
        setUnmappedItems(data.items)
      }
    } catch (error) {
      console.error('Failed to load unmapped items:', error)
    } finally {
      setLoadingUnmapped(false)
    }
  }

  const resolveLog = async (logId: string, nextBox: number) => {
    setResolving(true)
    try {
      const res = await fetch('/api/migration/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditLogId: logId, nextBox }),
      })

      if (res.ok) {
        // Remove from flagged list
        setFlaggedLogs(prev => prev.filter(l => l.id !== logId))
        setSelectedLog(null)
        setAiExplanation(null)
        setAuditStats(prev => ({
          ...prev,
          flagged: prev.flagged - 1,
          resolved: prev.resolved + 1,
        }))

        // Check if all resolved
        if (flaggedLogs.length === 1) {
          await completeMigration()
          setStep('complete')
        }
      }
    } catch (error) {
      console.error('Failed to resolve:', error)
    } finally {
      setResolving(false)
    }
  }

  const skipLog = async (logId: string) => {
    try {
      const res = await fetch('/api/migration/resolve', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditLogId: logId, reason: 'Skipped during migration' }),
      })

      if (res.ok) {
        setFlaggedLogs(prev => prev.filter(l => l.id !== logId))
        setSelectedLog(null)
        setAiExplanation(null)
        setAuditStats(prev => ({
          ...prev,
          flagged: prev.flagged - 1,
        }))

        // Check if all done
        if (flaggedLogs.length === 1) {
          await completeMigration()
          setStep('complete')
        }
      }
    } catch (error) {
      console.error('Failed to skip:', error)
    }
  }

  const bulkSkipByFlag = async (flagType: string) => {
    const logsToSkip = flaggedLogs.filter(l => l.flag_reasons.includes(flagType))
    for (const log of logsToSkip) {
      await skipLog(log.id)
    }
  }

  const bulkResolveToBox = async (boxNumber: number) => {
    const logsToResolve = filterFlag 
      ? flaggedLogs.filter(l => l.flag_reasons.includes(filterFlag))
      : flaggedLogs

    for (const log of logsToResolve) {
      await resolveLog(log.id, boxNumber)
    }
  }

  const completeMigration = async () => {
    try {
      await fetch('/api/migration/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Failed to mark migration complete:', error)
    }
  }

  // AI Functions
  const requestAiExplanation = async (logId: string) => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/migration/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'explain_flag', auditLogId: logId }),
      })
      const data = await res.json()
      if (res.ok) {
        setAiExplanation(data.explanation)
      }
    } catch (error) {
      console.error('AI explanation failed:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const requestAiPatternSuggestions = async () => {
    setAiLoading(true)
    try {
      const productNames = detectedSkus.filter(s => !s.isMapped).map(s => s.name)
      const res = await fetch('/api/migration/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest_patterns', productNames }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuggestedPatterns(data.patterns)
      }
    } catch (error) {
      console.error('AI pattern suggestion failed:', error)
    } finally {
      setAiLoading(false)
    }
  }

  // ============================================================================
  // Filtering & Sorting
  // ============================================================================

  const filteredFlaggedLogs = flaggedLogs
    .filter(log => {
      // Search filter
      if (reviewSearch) {
        const search = reviewSearch.toLowerCase()
        const matchesSearch = 
          log.email.toLowerCase().includes(search) ||
          log.subscriber?.first_name?.toLowerCase().includes(search) ||
          log.subscriber?.last_name?.toLowerCase().includes(search)
        if (!matchesSearch) return false
      }
      // Flag type filter
      if (filterFlag && !log.flag_reasons.includes(filterFlag)) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = (a.subscriber?.first_name || '').localeCompare(b.subscriber?.first_name || '')
          break
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
        case 'flag':
          comparison = a.flag_reasons[0]?.localeCompare(b.flag_reasons[0] || '') || 0
          break
        case 'confidence':
          comparison = (a.confidence_score || 0) - (b.confidence_score || 0)
          break
        default:
          comparison = 0
      }
      return sortDir === 'asc' ? comparison : -comparison
    })

  // ============================================================================
  // UI Helpers
  // ============================================================================

  const flagReasonLabels: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
    gap_detected: { label: 'Gap in Sequence', color: 'text-yellow-400', icon: AlertTriangle },
    duplicate_box: { label: 'Duplicate Box', color: 'text-orange-400', icon: XCircle },
    time_traveler: { label: 'Time Traveler', color: 'text-purple-400', icon: Clock },
    no_history: { label: 'No History', color: 'text-red-400', icon: FileQuestion },
  }

  const getProviderLabel = (type: string) => flagReasonLabels[type] || { label: type, color: 'text-gray-400', icon: HelpCircle }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="max-w-5xl">
      {/* Progress Header */}
      <div className="mb-6 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Migration Progress</h2>
            <p className="text-sm text-[#71717a]">
              {step === 'complete' 
                ? 'Migration complete! Your subscriber data is ready.'
                : `Step ${['mapping', 'audit', 'review', 'complete'].indexOf(step) + 1} of 4`}
            </p>
          </div>
          {aiAvailable && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/20">
              <Sparkles className="w-4 h-4 text-[#5865F2]" />
              <span className="text-sm text-[#5865F2]">AI Assist Available</span>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {['mapping', 'audit', 'review', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-[#e07a42] text-white'
                    : ['mapping', 'audit', 'review', 'complete'].indexOf(step) > i
                    ? 'bg-[#5CB87A] text-white'
                    : 'bg-[rgba(255,255,255,0.1)] text-[#71717a]'
                }`}
              >
                {['mapping', 'audit', 'review', 'complete'].indexOf(step) > i ? (
                  <Check className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span className={`ml-2 text-xs hidden sm:inline ${step === s ? 'text-white' : 'text-[#71717a]'}`}>
                {s === 'mapping' && 'Map SKUs'}
                {s === 'audit' && 'Scan History'}
                {s === 'review' && 'Review'}
                {s === 'complete' && 'Done'}
              </span>
              {i < 3 && <div className="flex-1 h-px bg-[rgba(255,255,255,0.1)] mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: SKU Mapping */}
      {step === 'mapping' && (
        <div className="space-y-6">
          {/* SKU List */}
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Map Your SKUs</h2>
                <p className="text-sm text-[#71717a]">
                  Tell us which SKUs correspond to which {installmentName.toLowerCase()} numbers
                </p>
              </div>
              <div className="flex gap-2">
                {aiAvailable && (
                  <button
                    onClick={requestAiPatternSuggestions}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#5865F2] text-sm transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    AI Suggest Patterns
                  </button>
                )}
                <button
                  onClick={detectSkus}
                  disabled={loadingSkus}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#a1a1aa] text-sm transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSkus ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* AI Pattern Suggestions */}
            {suggestedPatterns.length > 0 && (
              <div className="mb-4 p-4 rounded-lg bg-[#5865F2]/5 border border-[#5865F2]/20">
                <h4 className="text-sm font-medium text-[#5865F2] mb-2">AI Detected Patterns</h4>
                <div className="space-y-2">
                  {suggestedPatterns.map((pattern, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-[rgba(255,255,255,0.02)]">
                      <div>
                        <code className="text-sm text-white">{pattern.pattern}</code>
                        <span className="text-xs text-[#71717a] ml-2">({pattern.match_count} matches)</span>
                      </div>
                      <button
                        onClick={() => {
                          setNewPattern({
                            pattern: pattern.pattern,
                            type: pattern.pattern_type,
                            sequence: pattern.sequence,
                          })
                          setShowPatternForm(true)
                        }}
                        className="text-xs text-[#5865F2] hover:underline"
                      >
                        Add Pattern
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingSkus ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#e07a42]" />
                <span className="ml-3 text-[#71717a]">Scanning Shopify orders...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {detectedSkus.map(sku => (
                  <div
                    key={sku.sku}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      sku.isMapped || pendingMappings.has(sku.sku)
                        ? 'bg-[#5CB87A]/10 border border-[#5CB87A]/20'
                        : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-white font-mono">{sku.sku}</code>
                        <span className="text-xs text-[#52525b]">({sku.count} orders)</span>
                      </div>
                      <p className="text-sm text-[#71717a] truncate">{sku.name}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {sku.isMapped || pendingMappings.has(sku.sku) ? (
                        <span className="flex items-center gap-1 text-[#5CB87A] text-sm">
                          <Check className="w-4 h-4" />
                          {installmentName} {pendingMappings.get(sku.sku) || sku.mappedTo}
                        </span>
                      ) : (
                        <select
                          className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (value) {
                              setPendingMappings(prev => new Map(prev).set(sku.sku, value))
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Select {installmentName} #</option>
                          {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{installmentName} {n}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pattern Form */}
          {showPatternForm && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold text-white">Add Pattern Rule</h3>
                <button onClick={() => setShowPatternForm(false)} className="text-[#71717a] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-[#a1a1aa] mb-1">Pattern</label>
                  <input
                    type="text"
                    value={newPattern.pattern}
                    onChange={e => setNewPattern(p => ({ ...p, pattern: e.target.value }))}
                    placeholder={`e.g., "${installmentName} {N}"`}
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm"
                  />
                  <p className="text-xs text-[#52525b] mt-1">Use {'{N}'} for the box number</p>
                </div>
                <div>
                  <label className="block text-sm text-[#a1a1aa] mb-1">Match Type</label>
                  <select
                    value={newPattern.type}
                    onChange={e => setNewPattern(p => ({ ...p, type: e.target.value as 'contains' }))}
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm"
                  >
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts With</option>
                    <option value="ends_with">Ends With</option>
                    <option value="regex">Regex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#a1a1aa] mb-1">Fixed {installmentName} # (or 0 to extract)</label>
                  <input
                    type="number"
                    value={newPattern.sequence}
                    onChange={e => setNewPattern(p => ({ ...p, sequence: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm"
                  />
                </div>
              </div>
              <button
                onClick={savePattern}
                className="mt-4 px-4 py-2 rounded-lg bg-[#5CB87A] hover:bg-[#4ca86a] text-white font-medium text-sm"
              >
                Save Pattern
              </button>
            </div>
          )}

          {/* Existing Mappings */}
          {skuAliases.length > 0 && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
              <h3 className="text-md font-semibold text-white mb-4">Saved Mappings ({skuAliases.length})</h3>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {skuAliases.map(alias => (
                  <div
                    key={alias.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.02)]"
                  >
                    <code className="text-xs text-[#a1a1aa] font-mono truncate max-w-[200px]">
                      {alias.shopify_sku}
                    </code>
                    <span className="text-xs text-[#5CB87A]">{installmentName} {alias.product_sequence_id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-[#71717a]">
                {pendingMappings.size} new mappings pending
              </p>
              <button
                onClick={() => setShowPatternForm(true)}
                className="text-sm text-[#e07a42] hover:underline"
              >
                + Add Pattern Rule
              </button>
            </div>
            <div className="flex gap-3">
              {pendingMappings.size > 0 && (
                <button
                  onClick={saveMappings}
                  disabled={savingMappings}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5CB87A] hover:bg-[#4ca86a] text-white font-medium transition-colors disabled:opacity-50"
                >
                  {savingMappings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Mappings
                </button>
              )}
              <button
                onClick={() => setStep('audit')}
                disabled={skuAliases.length === 0 && pendingMappings.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e07a42] hover:bg-[#d06932] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Audit
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Run Audit */}
      {step === 'audit' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Run Forensic Audit</h2>
            <p className="text-sm text-[#71717a] mb-6">
              Scan {pendingSubscribers} subscriber{pendingSubscribers !== 1 ? 's' : ''}&apos; Shopify order history to determine their {installmentName.toLowerCase()} sequence.
            </p>

            {isAuditing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#71717a]">{isPaused ? 'Paused' : 'Processing...'}</span>
                  <span className="text-white">{auditProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-[rgba(255,255,255,0.1)] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-[#e07a42]'}`}
                    style={{ width: `${auditProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex gap-4">
                    <span className="text-[#5CB87A]">{auditStats.clean} clean</span>
                    <span className="text-[#f59e0b]">{auditStats.flagged} flagged</span>
                    {auditStats.unmapped > 0 && (
                      <span className="text-[#71717a]">{auditStats.unmapped} unmapped items</span>
                    )}
                  </div>
                  <button
                    onClick={pauseAudit}
                    className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                </div>
              </div>
            ) : migrationRun?.status === 'completed' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#5CB87A]/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#5CB87A]" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Audit Complete!</h3>
                <div className="flex justify-center gap-6 text-sm">
                  <span className="text-[#5CB87A]">{auditStats.clean} clean</span>
                  <span className="text-[#f59e0b]">{auditStats.flagged} need review</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <button
                  onClick={startAudit}
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[#e07a42] hover:bg-[#d06932] text-white font-medium transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Start Forensic Scan
                </button>
                <p className="text-xs text-[#52525b] mt-4">
                  This will scan Shopify orders for {pendingSubscribers} subscribers
                </p>
              </div>
            )}
          </div>

          {/* Mapping Summary */}
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#71717a]">
                Using {skuAliases.length} SKU mappings {patterns.length > 0 && `+ ${patterns.length} patterns`}
              </span>
              <button
                onClick={() => setStep('mapping')}
                className="text-sm text-[#e07a42] hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Edit Mappings
              </button>
            </div>
          </div>

          {migrationRun?.status === 'completed' && (
            <div className="flex justify-end">
              <button
                onClick={() => setStep(auditStats.flagged > 0 ? 'review' : 'complete')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e07a42] hover:bg-[#d06932] text-white font-medium transition-colors"
              >
                {auditStats.flagged > 0 ? 'Review Flagged' : 'Complete'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review Flagged */}
      {step === 'review' && (
        <div className="space-y-6">
          {/* Search, Sort, Filter Bar */}
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
                <input
                  type="text"
                  value={reviewSearch}
                  onChange={e => setReviewSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm placeholder-[#52525b] focus:outline-none focus:border-[#e07a42]"
                />
              </div>

              {/* Filter by flag */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#71717a]" />
                <select
                  value={filterFlag || ''}
                  onChange={e => setFilterFlag(e.target.value || null)}
                  className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none"
                >
                  <option value="">All Flags</option>
                  <option value="no_history">No History</option>
                  <option value="gap_detected">Gap Detected</option>
                  <option value="duplicate_box">Duplicate Box</option>
                  <option value="time_traveler">Time Traveler</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#71717a] hover:text-white"
                >
                  {sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>
                <select
                  value={sortField}
                  onChange={e => setSortField(e.target.value as SortField)}
                  className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none"
                >
                  <option value="flag">Sort by Flag</option>
                  <option value="name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                  <option value="confidence">Sort by Confidence</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {filterFlag && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <span className="text-sm text-[#71717a]">
                  {filteredFlaggedLogs.length} items with &quot;{getProviderLabel(filterFlag).label}&quot;
                </span>
                <button
                  onClick={() => bulkSkipByFlag(filterFlag)}
                  className="text-sm text-yellow-500 hover:underline"
                >
                  Skip All
                </button>
                <button
                  onClick={() => bulkResolveToBox(1)}
                  className="text-sm text-[#5CB87A] hover:underline"
                >
                  Set All to {installmentName} 1
                </button>
              </div>
            )}
          </div>

          {/* Flagged List */}
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Review Flagged Subscribers</h2>
                <p className="text-sm text-[#71717a]">
                  {filteredFlaggedLogs.length} subscriber{filteredFlaggedLogs.length !== 1 ? 's' : ''} need manual review
                </p>
              </div>
              <button
                onClick={loadFlaggedLogs}
                disabled={loadingFlagged}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#a1a1aa] text-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFlagged ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingFlagged ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#e07a42]" />
              </div>
            ) : filteredFlaggedLogs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-[#5CB87A] mx-auto mb-4" />
                <p className="text-white">
                  {flaggedLogs.length === 0 
                    ? 'All flagged records have been resolved!'
                    : 'No results match your filters'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredFlaggedLogs.map(log => {
                  const FlagIcon = flagReasonLabels[log.flag_reasons[0]]?.icon || AlertTriangle
                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        selectedLog?.id === log.id
                          ? 'bg-[#e07a42]/10 border-[#e07a42]/30'
                          : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)]'
                      }`}
                      onClick={() => {
                        setSelectedLog(log)
                        setResolveBox(log.proposed_next_box)
                        setAiExplanation(log.ai_explanation || null)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FlagIcon className={`w-5 h-5 ${flagReasonLabels[log.flag_reasons[0]]?.color || 'text-gray-400'}`} />
                          <div>
                            <span className="text-white font-medium">
                              {log.subscriber?.first_name} {log.subscriber?.last_name}
                            </span>
                            <span className="text-[#71717a] text-sm ml-2">{log.email}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            {log.flag_reasons.map(reason => (
                              <span
                                key={reason}
                                className={`text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] ${
                                  flagReasonLabels[reason]?.color || 'text-[#71717a]'
                                }`}
                              >
                                {flagReasonLabels[reason]?.label || reason}
                              </span>
                            ))}
                          </div>
                          {log.confidence_score !== undefined && (
                            <span className="text-xs text-[#52525b] mt-1 block">
                              {Math.round(log.confidence_score * 100)}% confidence
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected Log Detail */}
          {selectedLog && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold text-white">
                  {selectedLog.subscriber?.first_name} {selectedLog.subscriber?.last_name}
                </h3>
                <div className="flex items-center gap-2">
                  {aiAvailable && !aiExplanation && (
                    <button
                      onClick={() => requestAiExplanation(selectedLog.id)}
                      disabled={aiLoading}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#5865F2] text-sm"
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Explain
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedLog(null)
                      setAiExplanation(null)
                    }}
                    className="p-1 text-[#71717a] hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* AI Explanation */}
              {aiExplanation && (
                <div className="mb-4 p-4 rounded-lg bg-[#5865F2]/5 border border-[#5865F2]/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#a1a1aa]">{aiExplanation}</p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="mb-6">
                <h4 className="text-sm text-[#71717a] mb-2">Order History (Evidence)</h4>
                {selectedLog.sequence_dates.length === 0 ? (
                  <p className="text-sm text-[#52525b] italic">No matching subscription orders found</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedLog.sequence_dates.map((event, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-2 rounded bg-[rgba(255,255,255,0.02)]"
                      >
                        <span className="text-[#e07a42] font-mono text-sm">{installmentName} {event.sequence}</span>
                        <span className="text-[#71717a] text-sm">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        <span className="text-[#52525b] text-xs">#{event.orderNumber}</span>
                        <span className="text-[#52525b] text-xs truncate flex-1">{event.sku || event.productName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resolution */}
              <div className="flex items-center gap-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div className="flex-1">
                  <label className="text-sm text-[#71717a] block mb-1">Set Next {installmentName} To:</label>
                  <select
                    value={resolveBox}
                    onChange={(e) => setResolveBox(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white focus:outline-none focus:border-[#e07a42]"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {installmentName} {n} {n === selectedLog.proposed_next_box ? '(Suggested)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-6">
                  <button
                    onClick={() => skipLog(selectedLog.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] text-[#71717a] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip
                  </button>
                  <button
                    onClick={() => resolveLog(selectedLog.id, resolveBox)}
                    disabled={resolving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5CB87A] hover:bg-[#4ca86a] text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          )}

          {flaggedLogs.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  await completeMigration()
                  setStep('complete')
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e07a42] hover:bg-[#d06932] text-white font-medium transition-colors"
              >
                Complete Migration
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#5CB87A]/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#5CB87A]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Migration Complete!</h2>
          <p className="text-[#71717a] mb-6">
            All subscribers have been audited and their {installmentName.toLowerCase()} sequences have been set.
          </p>

          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#5CB87A]">{auditStats.clean}</div>
              <div className="text-sm text-[#71717a]">Clean Imports</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#e07a42]">{auditStats.resolved}</div>
              <div className="text-sm text-[#71717a]">Manually Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{auditStats.total}</div>
              <div className="text-sm text-[#71717a]">Total Processed</div>
            </div>
          </div>

          <a
            href={`/portal/${clientSlug}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#e07a42] hover:bg-[#d06932] text-white font-medium transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      )}
    </div>
  )
}
