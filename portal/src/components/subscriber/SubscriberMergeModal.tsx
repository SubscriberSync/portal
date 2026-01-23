'use client'

import { useState, useEffect } from 'react'
import {
  X,
  GitMerge,
  Loader2,
  User,
  Search,
  ArrowRight,
  Check,
  AlertTriangle,
} from 'lucide-react'

interface SubscriberPreview {
  id: string
  email: string
  first_name?: string
  last_name?: string
  status?: string
  box_number?: number
  current_episode?: number
  tags?: string[]
  is_vip?: boolean
  is_influencer?: boolean
  shopify_customer_id?: string
  recharge_customer_id?: string
  subscribed_at?: string
  address1?: string
  city?: string
  state?: string
  shipmentCount?: number
  activityCount?: number
  needs_review?: boolean
  tier_name?: string
}

interface MergePreview {
  source: SubscriberPreview
  target: SubscriberPreview
  mergePreview: {
    email: string
    name: string
    combinedTags: string[]
    totalShipments: number
    willHaveVip: boolean
    willHaveInfluencer: boolean
    earliestSubscribedAt?: string
  }
}

interface SubscriberMergeModalProps {
  isOpen: boolean
  onClose: () => void
  initialSubscriber?: SubscriberPreview
  subscribers: SubscriberPreview[]
  onMerge: (sourceId: string, targetId: string, options: MergeOptions) => Promise<void>
  isLoading?: boolean
}

interface MergeOptions {
  keepSourceAddress: boolean
  mergeShipments: boolean
  mergeEpisodeHistory: boolean
}

export default function SubscriberMergeModal({
  isOpen,
  onClose,
  initialSubscriber,
  subscribers,
  onMerge,
  isLoading = false,
}: SubscriberMergeModalProps) {
  const [step, setStep] = useState<'select' | 'configure' | 'confirm'>('select')
  const [sourceSubscriber, setSourceSubscriber] = useState<SubscriberPreview | null>(null)
  const [targetSubscriber, setTargetSubscriber] = useState<SubscriberPreview | null>(null)
  const [search, setSearch] = useState('')
  const [selectingFor, setSelectingFor] = useState<'source' | 'target'>('target')
  const [options, setOptions] = useState<MergeOptions>({
    keepSourceAddress: false,
    mergeShipments: true,
    mergeEpisodeHistory: true,
  })
  const [isMerging, setIsMerging] = useState(false)

  // Initialize with the provided subscriber
  useEffect(() => {
    if (initialSubscriber && isOpen) {
      setSourceSubscriber(initialSubscriber)
      setStep('select')
      setSelectingFor('target')
    }
  }, [initialSubscriber, isOpen])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select')
      setSourceSubscriber(null)
      setTargetSubscriber(null)
      setSearch('')
      setOptions({
        keepSourceAddress: false,
        mergeShipments: true,
        mergeEpisodeHistory: true,
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const filteredSubscribers = subscribers.filter((s) => {
    if (sourceSubscriber?.id === s.id || targetSubscriber?.id === s.id) return false
    if (!search.trim()) return true

    const searchLower = search.toLowerCase()
    return (
      s.email?.toLowerCase().includes(searchLower) ||
      s.first_name?.toLowerCase().includes(searchLower) ||
      s.last_name?.toLowerCase().includes(searchLower)
    )
  })

  const handleSelectSubscriber = (subscriber: SubscriberPreview) => {
    if (selectingFor === 'source') {
      setSourceSubscriber(subscriber)
    } else {
      setTargetSubscriber(subscriber)
    }
    
    // If both are selected, move to configure
    const newSource = selectingFor === 'source' ? subscriber : sourceSubscriber
    const newTarget = selectingFor === 'target' ? subscriber : targetSubscriber
    
    if (newSource && newTarget) {
      setStep('configure')
    }
  }

  const swapSubscribers = () => {
    const temp = sourceSubscriber
    setSourceSubscriber(targetSubscriber)
    setTargetSubscriber(temp)
  }

  const handleMerge = async () => {
    if (!sourceSubscriber || !targetSubscriber) return

    setIsMerging(true)
    try {
      await onMerge(sourceSubscriber.id, targetSubscriber.id, options)
      onClose()
    } catch (error) {
      console.error('Merge failed:', error)
    } finally {
      setIsMerging(false)
    }
  }

  const formatName = (s: SubscriberPreview) =>
    s.first_name || s.last_name
      ? `${s.first_name || ''} ${s.last_name || ''}`.trim()
      : s.email

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <GitMerge className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Merge Subscribers</h2>
              <p className="text-sm text-foreground-secondary">
                {step === 'select' && 'Select subscribers to merge'}
                {step === 'configure' && 'Configure merge options'}
                {step === 'confirm' && 'Confirm merge'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground-tertiary hover:text-foreground hover:bg-background-elevated rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-6">
              {/* Selected subscribers preview */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                    selectingFor === 'source'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-border hover:border-border-strong'
                  }`}
                  onClick={() => setSelectingFor('source')}
                >
                  <div className="text-xs font-medium text-foreground-tertiary uppercase mb-2">
                    Merge From (will be deleted)
                  </div>
                  {sourceSubscriber ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-background-elevated flex items-center justify-center">
                        <User className="w-5 h-5 text-foreground-tertiary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {formatName(sourceSubscriber)}
                        </p>
                        <p className="text-sm text-foreground-secondary truncate">
                          {sourceSubscriber.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-foreground-tertiary">
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Click to select</span>
                    </div>
                  )}
                </div>

                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                    selectingFor === 'target'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-border hover:border-border-strong'
                  }`}
                  onClick={() => setSelectingFor('target')}
                >
                  <div className="text-xs font-medium text-foreground-tertiary uppercase mb-2">
                    Merge Into (primary profile)
                  </div>
                  {targetSubscriber ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {formatName(targetSubscriber)}
                        </p>
                        <p className="text-sm text-foreground-secondary truncate">
                          {targetSubscriber.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-foreground-tertiary">
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Click to select</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search subscribers to merge..."
                  className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              {/* Subscriber list */}
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground-tertiary" />
                  </div>
                ) : filteredSubscribers.length === 0 ? (
                  <div className="p-8 text-center text-foreground-tertiary">
                    {search ? 'No matching subscribers' : 'No subscribers available'}
                  </div>
                ) : (
                  filteredSubscribers.slice(0, 50).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSubscriber(s)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-background-elevated transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-background-elevated flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-foreground-tertiary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {formatName(s)}
                        </p>
                        <p className="text-sm text-foreground-tertiary truncate">
                          {s.email}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm text-foreground-secondary">
                          Ep {s.current_episode ?? s.box_number ?? '-'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 'configure' && sourceSubscriber && targetSubscriber && (
            <div className="space-y-6">
              {/* Merge direction visualization */}
              <div className="flex items-center justify-center gap-4 p-4 bg-background-elevated rounded-xl">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="font-medium text-foreground">{formatName(sourceSubscriber)}</p>
                  <p className="text-xs text-red-600">Will be deleted</p>
                </div>
                <ArrowRight className="w-6 h-6 text-foreground-tertiary" />
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium text-foreground">{formatName(targetSubscriber)}</p>
                  <p className="text-xs text-green-600">Primary profile</p>
                </div>
              </div>

              <button
                onClick={swapSubscribers}
                className="w-full py-2 text-sm text-accent hover:bg-accent/5 rounded-lg"
              >
                Swap direction
              </button>

              {/* Merge options */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Merge Options</h3>
                
                <label className="flex items-center justify-between p-3 bg-background-elevated rounded-lg cursor-pointer">
                  <div>
                    <span className="text-sm text-foreground">Use address from source</span>
                    <p className="text-xs text-foreground-tertiary">
                      {sourceSubscriber.city}, {sourceSubscriber.state}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.keepSourceAddress}
                    onChange={(e) => setOptions({ ...options, keepSourceAddress: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-background-elevated rounded-lg cursor-pointer">
                  <div>
                    <span className="text-sm text-foreground">Transfer shipments</span>
                    <p className="text-xs text-foreground-tertiary">
                      {sourceSubscriber.shipmentCount || 0} shipments will be moved
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.mergeShipments}
                    onChange={(e) => setOptions({ ...options, mergeShipments: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-background-elevated rounded-lg cursor-pointer">
                  <div>
                    <span className="text-sm text-foreground">Merge episode history</span>
                    <p className="text-xs text-foreground-tertiary">
                      Combine order history from both profiles
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.mergeEpisodeHistory}
                    onChange={(e) => setOptions({ ...options, mergeEpisodeHistory: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                </label>
              </div>

              {/* Side by side comparison */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Source Profile</h4>
                  <dl className="space-y-1 text-foreground-secondary">
                    <div className="flex justify-between">
                      <dt>Email:</dt>
                      <dd className="text-foreground">{sourceSubscriber.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Status:</dt>
                      <dd className="text-foreground">{sourceSubscriber.status}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Episode:</dt>
                      <dd className="text-foreground">{sourceSubscriber.current_episode ?? sourceSubscriber.box_number}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Target Profile</h4>
                  <dl className="space-y-1 text-foreground-secondary">
                    <div className="flex justify-between">
                      <dt>Email:</dt>
                      <dd className="text-foreground">{targetSubscriber.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Status:</dt>
                      <dd className="text-foreground">{targetSubscriber.status}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Episode:</dt>
                      <dd className="text-foreground">{targetSubscriber.current_episode ?? targetSubscriber.box_number}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {step === 'confirm' && sourceSubscriber && targetSubscriber && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800">This action cannot be undone</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      The source profile ({formatName(sourceSubscriber)}) will be permanently deleted.
                      All selected data will be transferred to the target profile.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background-elevated rounded-xl">
                <h3 className="font-medium text-foreground mb-3">What will happen:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground-secondary">
                    <Check className="w-4 h-4 text-green-600" />
                    <span><strong>{targetSubscriber.email}</strong> becomes the primary profile</span>
                  </li>
                  {options.mergeShipments && (
                    <li className="flex items-center gap-2 text-foreground-secondary">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Shipments transferred to primary profile</span>
                    </li>
                  )}
                  {options.mergeEpisodeHistory && (
                    <li className="flex items-center gap-2 text-foreground-secondary">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Episode histories merged</span>
                    </li>
                  )}
                  <li className="flex items-center gap-2 text-foreground-secondary">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Tags and IDs combined</span>
                  </li>
                  <li className="flex items-center gap-2 text-red-600">
                    <X className="w-4 h-4" />
                    <span><strong>{sourceSubscriber.email}</strong> will be deleted</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-background-elevated flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 'configure') setStep('select')
              else if (step === 'confirm') setStep('configure')
              else onClose()
            }}
            className="px-4 py-2 text-sm text-foreground-secondary hover:bg-background rounded-lg"
          >
            {step === 'select' ? 'Cancel' : 'Back'}
          </button>

          {step === 'select' && (
            <button
              onClick={() => setStep('configure')}
              disabled={!sourceSubscriber || !targetSubscriber}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
            >
              Continue
            </button>
          )}

          {step === 'configure' && (
            <button
              onClick={() => setStep('confirm')}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover"
            >
              Review Merge
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleMerge}
              disabled={isMerging}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <GitMerge className="w-4 h-4" />
                  Confirm Merge
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
