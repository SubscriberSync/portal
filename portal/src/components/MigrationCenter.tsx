'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  ArrowRight,
  Check,
  AlertTriangle,
  Loader2,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  Save,
  SkipForward,
} from 'lucide-react'

interface SkuAlias {
  id: string
  shopify_sku: string
  product_sequence_id: number
  product_name: string | null
}

interface MigrationRun {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_subscribers: number
  processed_subscribers: number
  clean_count: number
  flagged_count: number
  started_at: string | null
  completed_at: string | null
}

interface AuditStats {
  total: number
  clean: number
  flagged: number
  resolved: number
}

interface DetectedSku {
  sku: string
  name: string
  count: number
  isMapped: boolean
  mappedTo?: number
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
  subscriber: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
}

interface MigrationCenterProps {
  organizationId: string
  clientSlug: string
  skuAliases: SkuAlias[]
  latestRun: MigrationRun | null
  auditStats: AuditStats
  pendingSubscribers: number
  isAdmin: boolean
}

type Step = 'mapping' | 'audit' | 'review' | 'complete'

export default function MigrationCenter({
  organizationId,
  clientSlug,
  skuAliases: initialAliases,
  latestRun: initialRun,
  auditStats: initialStats,
  pendingSubscribers: initialPending,
  isAdmin,
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

  const [step, setStep] = useState<Step>(getInitialStep())
  const [skuAliases, setSkuAliases] = useState<SkuAlias[]>(initialAliases)
  const [detectedSkus, setDetectedSkus] = useState<DetectedSku[]>([])
  const [loadingSkus, setLoadingSkus] = useState(false)
  const [savingMappings, setSavingMappings] = useState(false)

  // Audit state
  const [migrationRun, setMigrationRun] = useState<MigrationRun | null>(initialRun)
  const [auditStats, setAuditStats] = useState<AuditStats>(initialStats)
  const [pendingSubscribers, setPendingSubscribers] = useState(initialPending)
  const [auditProgress, setAuditProgress] = useState(0)
  const [isAuditing, setIsAuditing] = useState(false)
  const [subscriberIds, setSubscriberIds] = useState<string[]>([])

  // Review state
  const [flaggedLogs, setFlaggedLogs] = useState<AuditLog[]>([])
  const [loadingFlagged, setLoadingFlagged] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [resolveBox, setResolveBox] = useState<number>(1)
  const [resolving, setResolving] = useState(false)

  // Mapping state
  const [pendingMappings, setPendingMappings] = useState<Map<string, number>>(new Map())

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

  const startAudit = async () => {
    setIsAuditing(true)
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
      setSubscriberIds(startData.subscriberIds)
      setPendingSubscribers(startData.totalSubscribers)

      // Process in batches
      const batchSize = 5
      const allIds = startData.subscriberIds
      let processed = 0
      let cleanCount = 0
      let flaggedCount = 0

      for (let i = 0; i < allIds.length; i += batchSize) {
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
          })
        }
      }

      // Mark run as complete
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
        setStep('complete')
      }
    } catch (error) {
      console.error('Audit failed:', error)
    } finally {
      setIsAuditing(false)
    }
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
        setAuditStats(prev => ({
          ...prev,
          flagged: prev.flagged - 1,
          resolved: prev.resolved + 1,
        }))

        // Check if all resolved
        if (flaggedLogs.length === 1) {
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
        setAuditStats(prev => ({
          ...prev,
          flagged: prev.flagged - 1,
        }))
      }
    } catch (error) {
      console.error('Failed to skip:', error)
    }
  }

  const flagReasonLabels: Record<string, { label: string; color: string }> = {
    gap_detected: { label: 'Gap in Sequence', color: 'text-yellow-400' },
    duplicate_box: { label: 'Duplicate Box', color: 'text-orange-400' },
    time_traveler: { label: 'Time Traveler', color: 'text-purple-400' },
    no_history: { label: 'No History', color: 'text-red-400' },
  }

  return (
    <div className="max-w-5xl">
      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {['mapping', 'audit', 'review', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center">
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
            <span
              className={`ml-2 text-sm ${
                step === s ? 'text-white' : 'text-[#71717a]'
              }`}
            >
              {s === 'mapping' && 'Map SKUs'}
              {s === 'audit' && 'Run Audit'}
              {s === 'review' && 'Review Flags'}
              {s === 'complete' && 'Complete'}
            </span>
            {i < 3 && (
              <ArrowRight className="w-4 h-4 mx-4 text-[#52525b]" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: SKU Mapping */}
      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Map Your SKUs</h2>
                <p className="text-sm text-[#71717a]">
                  Tell us which SKUs correspond to which box numbers
                </p>
              </div>
              <button
                onClick={detectSkus}
                disabled={loadingSkus}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#a1a1aa] text-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSkus ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

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
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-white font-mono">{sku.sku}</code>
                        <span className="text-xs text-[#52525b]">({sku.count} orders)</span>
                      </div>
                      <p className="text-sm text-[#71717a] truncate max-w-md">{sku.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sku.isMapped || pendingMappings.has(sku.sku) ? (
                        <span className="flex items-center gap-1 text-[#5CB87A] text-sm">
                          <Check className="w-4 h-4" />
                          Box {pendingMappings.get(sku.sku) || sku.mappedTo}
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
                          <option value="">Select Box #</option>
                          {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>Box {n}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Existing Mappings */}
          {skuAliases.length > 0 && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
              <h3 className="text-md font-semibold text-white mb-4">Saved Mappings</h3>
              <div className="grid grid-cols-2 gap-2">
                {skuAliases.map(alias => (
                  <div
                    key={alias.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.02)]"
                  >
                    <code className="text-xs text-[#a1a1aa] font-mono truncate max-w-[200px]">
                      {alias.shopify_sku}
                    </code>
                    <span className="text-xs text-[#5CB87A]">Box {alias.product_sequence_id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#71717a]">
              {pendingMappings.size} new mappings pending
            </p>
            <div className="flex gap-3">
              {pendingMappings.size > 0 && (
                <button
                  onClick={saveMappings}
                  disabled={savingMappings}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5CB87A] hover:bg-[#4ca86a] text-white font-medium transition-colors disabled:opacity-50"
                >
                  {savingMappings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
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
              Scan {pendingSubscribers} subscriber{pendingSubscribers !== 1 ? 's' : ''} Shopify order history to determine their box sequence.
            </p>

            {isAuditing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#71717a]">Processing...</span>
                  <span className="text-white">{auditProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-[rgba(255,255,255,0.1)] overflow-hidden">
                  <div
                    className="h-full bg-[#e07a42] transition-all duration-300"
                    style={{ width: `${auditProgress}%` }}
                  />
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-[#5CB87A]">{auditStats.clean} clean</span>
                  <span className="text-[#f59e0b]">{auditStats.flagged} flagged</span>
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
                Using {skuAliases.length} SKU mappings
              </span>
              <button
                onClick={() => setStep('mapping')}
                className="text-sm text-[#e07a42] hover:underline"
              >
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
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Review Flagged Subscribers</h2>
                <p className="text-sm text-[#71717a]">
                  {flaggedLogs.length} subscriber{flaggedLogs.length !== 1 ? 's' : ''} need manual review
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
            ) : flaggedLogs.length === 0 ? (
              <div className="text-center py-12">
                <Check className="w-12 h-12 text-[#5CB87A] mx-auto mb-4" />
                <p className="text-white">All flagged records have been resolved!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {flaggedLogs.map(log => (
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
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {log.subscriber?.first_name} {log.subscriber?.last_name}
                          </span>
                          <span className="text-[#71717a] text-sm">{log.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
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
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#71717a]">Detected boxes:</div>
                        <div className="text-white font-mono">
                          [{log.detected_sequences.join(', ')}]
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 text-[#71717a] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Timeline */}
              <div className="mb-6">
                <h4 className="text-sm text-[#71717a] mb-2">Order History (Evidence)</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedLog.sequence_dates.map((event, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-2 rounded bg-[rgba(255,255,255,0.02)]"
                    >
                      <span className="text-[#e07a42] font-mono text-sm">Box {event.sequence}</span>
                      <span className="text-[#71717a] text-sm">
                        {new Date(event.date).toLocaleDateString()}
                      </span>
                      <span className="text-[#52525b] text-xs">#{event.orderNumber}</span>
                      <span className="text-[#52525b] text-xs truncate flex-1">{event.sku}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="flex items-center gap-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div className="flex-1">
                  <label className="text-sm text-[#71717a] block mb-1">Set Next Box To:</label>
                  <select
                    value={resolveBox}
                    onChange={(e) => setResolveBox(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white focus:outline-none focus:border-[#e07a42]"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        Box {n} {n === selectedLog.proposed_next_box ? '(Suggested)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
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
                    {resolving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          )}

          {flaggedLogs.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setStep('complete')}
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
            All subscribers have been audited and their box sequences have been set.
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
            href={`/portal/${clientSlug}/subscribers`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#e07a42] hover:bg-[#d06932] text-white font-medium transition-colors"
          >
            View Subscribers
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      )}
    </div>
  )
}
