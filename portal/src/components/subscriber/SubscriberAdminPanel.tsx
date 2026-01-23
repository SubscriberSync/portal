'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Save,
  Loader2,
  User,
  MapPin,
  CreditCard,
  Tag,
  Calendar,
  Link2,
  Package,
  Plus,
  Trash2,
} from 'lucide-react'

interface SubscriberData {
  id: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  address?: {
    address1?: string
    address2?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  status?: string
  boxNumber?: number
  sku?: string
  frequency?: string
  shirtSize?: string
  isVip?: boolean
  isInfluencer?: boolean
  isProblem?: boolean
  isGift?: boolean
  isAtRisk?: boolean
  isPrepaid?: boolean
  prepaidTotal?: number
  ordersRemaining?: number
  shopifyCustomerId?: string
  rechargeCustomerId?: string
  rechargeSubscriptionId?: string
  discordUserId?: string
  discordUsername?: string
  subscribedAt?: string
  nextChargeDate?: string
  cancelledAt?: string
  tags?: string[]
  skipCount?: number
  delayCount?: number
  acquisitionSource?: string
  cancelReason?: string
}

interface SubscriberAdminPanelProps {
  subscriber: SubscriberData | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<SubscriberData>) => Promise<void>
  onDelete?: () => void
  onMerge?: () => void
  context: 'import' | 'subscribers'
}

type TabId = 'personal' | 'subscription' | 'flags' | 'external' | 'dates'

export default function SubscriberAdminPanel({
  subscriber,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onMerge,
  context,
}: SubscriberAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('personal')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<SubscriberData>>({})
  const [newTag, setNewTag] = useState('')

  // Initialize form data when subscriber changes
  useEffect(() => {
    if (subscriber) {
      setFormData({ ...subscriber })
    }
  }, [subscriber])

  if (!isOpen || !subscriber) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateAddress = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      updateField('tags', [...(formData.tags || []), newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    updateField(
      'tags',
      (formData.tags || []).filter((t) => t !== tag)
    )
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
    { id: 'subscription', label: 'Subscription', icon: <Package className="w-4 h-4" /> },
    { id: 'flags', label: 'Flags & Tags', icon: <Tag className="w-4 h-4" /> },
    { id: 'external', label: 'External IDs', icon: <Link2 className="w-4 h-4" /> },
    { id: 'dates', label: 'Dates', icon: <Calendar className="w-4 h-4" /> },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
      <div className="bg-background w-full max-w-lg h-full overflow-hidden flex flex-col border-l border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Edit Subscriber</h2>
            <p className="text-sm text-foreground-secondary">{subscriber.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground-tertiary hover:text-foreground hover:bg-background-elevated rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-background-elevated text-foreground border-b-2 border-accent'
                    : 'text-foreground-secondary hover:text-foreground hover:bg-background-elevated/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-foreground-tertiary" />
                  <span className="text-sm font-medium text-foreground">Address</span>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={formData.address?.address1 || ''}
                    onChange={(e) => updateAddress('address1', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2"
                    value={formData.address?.address2 || ''}
                    onChange={(e) => updateAddress('address2', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.address?.city || ''}
                      onChange={(e) => updateAddress('city', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.address?.state || ''}
                      onChange={(e) => updateAddress('state', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="ZIP Code"
                      value={formData.address?.zip || ''}
                      onChange={(e) => updateAddress('zip', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.address?.country || 'US'}
                      onChange={(e) => updateAddress('country', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Status
                </label>
                <select
                  value={formData.status || 'Active'}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Box/Episode #
                  </label>
                  <input
                    type="number"
                    value={formData.boxNumber || ''}
                    onChange={(e) => updateField('boxNumber', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => updateField('sku', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency || ''}
                    onChange={(e) => updateField('frequency', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="">Not set</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Shirt Size
                  </label>
                  <input
                    type="text"
                    value={formData.shirtSize || ''}
                    onChange={(e) => updateField('shirtSize', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-foreground-tertiary" />
                  <span className="text-sm font-medium text-foreground">Prepaid Status</span>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPrepaid || false}
                      onChange={(e) => updateField('isPrepaid', e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm text-foreground">Is Prepaid Subscription</span>
                  </label>

                  {formData.isPrepaid && (
                    <div className="grid grid-cols-2 gap-3 pl-7">
                      <div>
                        <label className="block text-xs text-foreground-tertiary mb-1">
                          Total Prepaid
                        </label>
                        <input
                          type="number"
                          value={formData.prepaidTotal || ''}
                          onChange={(e) => updateField('prepaidTotal', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground-tertiary mb-1">
                          Orders Remaining
                        </label>
                        <input
                          type="number"
                          value={formData.ordersRemaining || ''}
                          onChange={(e) => updateField('ordersRemaining', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Skip Count
                  </label>
                  <input
                    type="number"
                    value={formData.skipCount || 0}
                    onChange={(e) => updateField('skipCount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Delay Count
                  </label>
                  <input
                    type="number"
                    value={formData.delayCount || 0}
                    onChange={(e) => updateField('delayCount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flags' && (
            <div className="space-y-6">
              <div>
                <span className="text-sm font-medium text-foreground mb-3 block">
                  Subscriber Flags
                </span>
                <div className="space-y-3">
                  {[
                    { key: 'isVip', label: 'VIP Customer', color: 'purple' },
                    { key: 'isInfluencer', label: 'Influencer', color: 'blue' },
                    { key: 'isGift', label: 'Gift Subscription', color: 'pink' },
                    { key: 'isAtRisk', label: 'At Risk', color: 'amber' },
                    { key: 'isProblem', label: 'Problem Customer', color: 'red' },
                  ].map(({ key, label, color }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between p-3 bg-background-elevated rounded-lg cursor-pointer hover:bg-background-elevated/80"
                    >
                      <span className="text-sm text-foreground">{label}</span>
                      <input
                        type="checkbox"
                        checked={(formData as Record<string, unknown>)[key] as boolean || false}
                        onChange={(e) => updateField(key, e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <span className="text-sm font-medium text-foreground mb-3 block">Tags</span>

                <div className="flex flex-wrap gap-2 mb-3">
                  {(formData.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-sm rounded-lg"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="p-0.5 hover:bg-accent/20 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(formData.tags || []).length === 0 && (
                    <span className="text-sm text-foreground-tertiary">No tags</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={addTag}
                    disabled={!newTag.trim()}
                    className="px-3 py-2 bg-accent text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Acquisition Source
                  </label>
                  <input
                    type="text"
                    value={formData.acquisitionSource || ''}
                    onChange={(e) => updateField('acquisitionSource', e.target.value)}
                    placeholder="e.g., Instagram, Facebook Ad, Referral"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'external' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground-secondary mb-4">
                External platform identifiers. Edit with caution.
              </p>

              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Shopify Customer ID
                </label>
                <input
                  type="text"
                  value={formData.shopifyCustomerId || ''}
                  onChange={(e) => updateField('shopifyCustomerId', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Recharge Customer ID
                </label>
                <input
                  type="text"
                  value={formData.rechargeCustomerId || ''}
                  onChange={(e) => updateField('rechargeCustomerId', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Recharge Subscription ID
                </label>
                <input
                  type="text"
                  value={formData.rechargeSubscriptionId || ''}
                  onChange={(e) => updateField('rechargeSubscriptionId', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Discord User ID
                  </label>
                  <input
                    type="text"
                    value={formData.discordUserId || ''}
                    onChange={(e) => updateField('discordUserId', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Discord Username
                  </label>
                  <input
                    type="text"
                    value={formData.discordUsername || ''}
                    onChange={(e) => updateField('discordUsername', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dates' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Subscribed At
                </label>
                <input
                  type="datetime-local"
                  value={formData.subscribedAt ? formData.subscribedAt.slice(0, 16) : ''}
                  onChange={(e) => updateField('subscribedAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Next Charge Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.nextChargeDate ? formData.nextChargeDate.slice(0, 16) : ''}
                  onChange={(e) => updateField('nextChargeDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">
                  Cancelled At
                </label>
                <input
                  type="datetime-local"
                  value={formData.cancelledAt ? formData.cancelledAt.slice(0, 16) : ''}
                  onChange={(e) => updateField('cancelledAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              {formData.cancelledAt && (
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1">
                    Cancel Reason
                  </label>
                  <textarea
                    value={formData.cancelReason || ''}
                    onChange={(e) => updateField('cancelReason', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-background-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              {onMerge && (
                <button
                  onClick={onMerge}
                  className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                >
                  Merge...
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-foreground-secondary hover:bg-background rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
