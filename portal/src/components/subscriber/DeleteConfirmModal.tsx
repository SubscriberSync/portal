'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Loader2, AlertTriangle, Package, History, MessageSquare } from 'lucide-react'

interface DeletionImpact {
  subscriberId: string
  email: string
  name: string
  shipment_count: number
  progress_count: number
  activity_count: number
  discord_connections: number
  audit_logs: number
}

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  subscriberId: string
  subscriberEmail: string
  subscriberName: string
  fetchImpact?: () => Promise<DeletionImpact>
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  subscriberId,
  subscriberEmail,
  subscriberName,
  fetchImpact,
}: DeleteConfirmModalProps) {
  const [impact, setImpact] = useState<DeletionImpact | null>(null)
  const [isLoadingImpact, setIsLoadingImpact] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  // Fetch impact when modal opens
  useEffect(() => {
    if (isOpen && fetchImpact) {
      setIsLoadingImpact(true)
      fetchImpact()
        .then(setImpact)
        .catch(console.error)
        .finally(() => setIsLoadingImpact(false))
    }
  }, [isOpen, fetchImpact])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImpact(null)
      setConfirmText('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = confirmText.toLowerCase() === 'delete'
  const hasRelatedData =
    impact &&
    (impact.shipment_count > 0 ||
      impact.progress_count > 0 ||
      impact.activity_count > 0 ||
      impact.discord_connections > 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-900">Delete Subscriber</h2>
              <p className="text-sm text-red-700">{subscriberEmail}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">This action cannot be undone</h3>
                <p className="text-sm text-red-700 mt-1">
                  You are about to delete <strong>{subscriberName || subscriberEmail}</strong>.
                  This will soft-delete the subscriber and related data.
                </p>
              </div>
            </div>
          </div>

          {/* Impact */}
          {isLoadingImpact ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground-tertiary" />
              <p className="text-sm text-foreground-secondary mt-2">Loading impact...</p>
            </div>
          ) : impact ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">What will be affected:</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-background-elevated rounded-lg flex items-center gap-3">
                  <Package className="w-5 h-5 text-foreground-tertiary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{impact.shipment_count}</p>
                    <p className="text-xs text-foreground-tertiary">Shipments</p>
                  </div>
                </div>
                
                <div className="p-3 bg-background-elevated rounded-lg flex items-center gap-3">
                  <History className="w-5 h-5 text-foreground-tertiary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{impact.progress_count}</p>
                    <p className="text-xs text-foreground-tertiary">Story Progress</p>
                  </div>
                </div>
                
                <div className="p-3 bg-background-elevated rounded-lg flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-foreground-tertiary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{impact.activity_count}</p>
                    <p className="text-xs text-foreground-tertiary">Activity Logs</p>
                  </div>
                </div>
                
                <div className="p-3 bg-background-elevated rounded-lg flex items-center gap-3">
                  <svg className="w-5 h-5 text-foreground-tertiary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{impact.discord_connections}</p>
                    <p className="text-xs text-foreground-tertiary">Discord Links</p>
                  </div>
                </div>
              </div>

              {hasRelatedData && (
                <p className="text-xs text-foreground-tertiary">
                  Related data will be soft-deleted and can potentially be recovered by support.
                </p>
              )}
            </div>
          ) : null}

          {/* Confirm input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Type <span className="font-mono bg-background-elevated px-1.5 py-0.5 rounded">delete</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-red-500"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-background-elevated flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-foreground-secondary hover:bg-background rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Subscriber
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
