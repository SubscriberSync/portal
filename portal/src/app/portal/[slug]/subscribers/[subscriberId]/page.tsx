'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Mail,
  Phone,
  User,
  Calendar,
  ExternalLink,
  Loader2,
  Save,
  Edit2,
  GitMerge,
  Trash2,
} from 'lucide-react';
import {
  getSubscriberDetail,
  updateSubscriberAddress,
  type SubscriberDetail,
  type SubscriberAddress,
  type ShipmentEvent,
} from '@/lib/backstage-api';
import { SubscriberAdminPanel, SubscriberMergeModal, DeleteConfirmModal } from '@/components/subscriber';

export default function SubscriberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientSlug = params.slug as string;
  const subscriberId = params.subscriberId as string;

  const [subscriber, setSubscriber] = useState<SubscriberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Admin modals
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [allSubscribers, setAllSubscribers] = useState<Array<{ id: string; email: string; first_name?: string; last_name?: string; status?: string; box_number?: number }>>([]);

  useEffect(() => {
    async function fetchSubscriber() {
      try {
        const data = await getSubscriberDetail(clientSlug, subscriberId);
        setSubscriber(data);
      } catch (err) {
        console.error('Failed to fetch subscriber:', err);
        setError('Failed to load subscriber details');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubscriber();
  }, [clientSlug, subscriberId]);

  // Fetch all subscribers for merge modal
  const fetchAllSubscribers = async () => {
    try {
      const response = await fetch('/api/subscribers/search?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setAllSubscribers(data.subscribers || []);
      }
    } catch (err) {
      console.error('Failed to fetch subscribers:', err);
    }
  };

  // Handle full admin save
  const handleAdminSave = async (data: Record<string, unknown>) => {
    const response = await fetch(`/api/subscribers/${subscriberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save');
    }

    // Refresh data
    const newData = await getSubscriberDetail(clientSlug, subscriberId);
    setSubscriber(newData);
  };

  // Handle merge
  const handleMerge = async (sourceId: string, targetId: string, options: {
    keepSourceAddress: boolean;
    mergeShipments: boolean;
    mergeEpisodeHistory: boolean;
  }) => {
    const response = await fetch('/api/subscribers/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId, options }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Merge failed');
    }

    // Redirect to the target subscriber
    router.push(`/portal/${clientSlug}/subscribers/${targetId}`);
  };

  // Handle delete
  const handleDelete = async () => {
    const response = await fetch(`/api/subscribers/${subscriberId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Delete failed');
    }

    // Redirect to subscribers list
    router.push(`/portal/${clientSlug}/subscribers`);
  };

  // Fetch deletion impact
  const fetchDeletionImpact = async () => {
    const response = await fetch(`/api/subscribers/${subscriberId}/impact`);
    if (!response.ok) return null;
    return response.json();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header clientSlug={clientSlug} />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error || !subscriber) {
    return (
      <div className="min-h-screen bg-background">
        <Header clientSlug={clientSlug} />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Subscriber</h2>
            <p className="text-red-600">{error || 'Subscriber not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        clientSlug={clientSlug} 
        onEdit={() => setEditPanelOpen(true)}
        onMerge={() => {
          fetchAllSubscribers();
          setMergeModalOpen(true);
        }}
        onDelete={() => setDeleteModalOpen(true)}
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Subscriber Header */}
        <SubscriberHeader subscriber={subscriber} />

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column - Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <ShipmentTimeline shipments={subscriber.shipments} />
          </div>

          {/* Right Column - Address & Info */}
          <div className="space-y-6">
            <AddressFixerForm
              clientSlug={clientSlug}
              subscriberId={subscriberId}
              address={subscriber.address}
              onUpdate={(newAddress) => {
                setSubscriber({ ...subscriber, address: newAddress });
              }}
            />
            <SubscriberInfo subscriber={subscriber} />
          </div>
        </div>
      </div>

      {/* Admin Edit Panel */}
      <SubscriberAdminPanel
        subscriber={subscriber ? {
          id: subscriber.id,
          firstName: subscriber.firstName,
          lastName: subscriber.lastName,
          email: subscriber.email,
          phone: subscriber.address?.phone,
          preferredName: subscriber.preferredName,
          usePreferredNameForShipping: subscriber.usePreferredNameForShipping,
          address: subscriber.address,
          status: subscriber.status,
          boxNumber: subscriber.boxNumber,
          shirtSize: subscriber.shirtSize,
          tags: subscriber.tags,
          isAtRisk: subscriber.atRisk,
          shopifyCustomerId: subscriber.shopifyCustomerId,
          rechargeCustomerId: subscriber.rechargeCustomerId,
          subscribedAt: subscriber.subscribedAt,
          discordUsername: subscriber.discordUsername,
        } : null}
        isOpen={editPanelOpen}
        onClose={() => setEditPanelOpen(false)}
        onSave={handleAdminSave}
        onDelete={() => {
          setEditPanelOpen(false);
          setDeleteModalOpen(true);
        }}
        onMerge={() => {
          setEditPanelOpen(false);
          fetchAllSubscribers();
          setMergeModalOpen(true);
        }}
        context="subscribers"
      />

      {/* Merge Modal */}
      <SubscriberMergeModal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        initialSubscriber={subscriber ? {
          id: subscriber.id,
          email: subscriber.email,
          first_name: subscriber.firstName,
          last_name: subscriber.lastName,
          status: subscriber.status,
          box_number: subscriber.boxNumber,
        } : undefined}
        subscribers={allSubscribers}
        onMerge={handleMerge}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        subscriberId={subscriberId}
        subscriberEmail={subscriber?.email || ''}
        subscriberName={`${subscriber?.firstName || ''} ${subscriber?.lastName || ''}`.trim()}
        fetchImpact={fetchDeletionImpact}
      />
    </div>
  );
}

function Header({ 
  clientSlug,
  onEdit,
  onMerge,
  onDelete,
}: { 
  clientSlug: string;
  onEdit?: () => void;
  onMerge?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="bg-white border-b border-border px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href={`/portal/${clientSlug}/subscribers`}
          className="text-foreground-secondary hover:text-foreground transition-colors"
        >
          &larr; Back to Search
        </Link>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-background-elevated flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
          {onMerge && (
            <button
              onClick={onMerge}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center gap-2"
            >
              <GitMerge className="w-4 h-4" />
              Merge
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="bg-background-secondary rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-background-secondary rounded-2xl p-6 h-96" />
        <div className="bg-background-secondary rounded-2xl p-6 h-64" />
      </div>
    </div>
  );
}

function SubscriberHeader({ subscriber }: { subscriber: SubscriberDetail }) {
  const statusColors: Record<SubscriberDetail['status'], { bg: string; text: string }> = {
    Active: { bg: 'bg-green-100', text: 'text-green-700' },
    Paused: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    Cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
    Expired: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };

  const { bg, text } = statusColors[subscriber.status];

  return (
    <div className="bg-background-secondary rounded-2xl border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <User className="w-8 h-8 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {subscriber.firstName} {subscriber.lastName}
              </h1>
              {subscriber.atRisk && (
                <span className="text-amber-500" title="At Risk">
                  <AlertTriangle className="w-5 h-5" />
                </span>
              )}
            </div>
            <p className="text-foreground-secondary">{subscriber.email}</p>
            {subscriber.preferredName && (
              <p className="text-sm text-foreground-tertiary mt-1">
                Preferred name: <span className="font-medium text-foreground-secondary">{subscriber.preferredName}</span>
                {subscriber.usePreferredNameForShipping && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs rounded">
                    Used for shipping
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-foreground-tertiary">Current Box</div>
            <div className="text-3xl font-bold text-foreground">#{subscriber.boxNumber}</div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${bg} ${text}`}>
            {subscriber.status}
          </span>
        </div>
      </div>

      {/* Tags */}
      {subscriber.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          {subscriber.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ShipmentTimeline({ shipments }: { shipments: ShipmentEvent[] }) {
  // Sort shipments by box number descending (most recent first)
  const sortedShipments = [...shipments].sort((a, b) => b.boxNumber - a.boxNumber);

  const getStatusIcon = (status: ShipmentEvent['status']) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'Shipped':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'Packed':
        return <Package className="w-5 h-5 text-purple-600" />;
      case 'Flagged':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ShipmentEvent['status']) => {
    switch (status) {
      case 'Delivered':
        return 'border-green-500 bg-green-50';
      case 'Shipped':
        return 'border-blue-500 bg-blue-50';
      case 'Packed':
        return 'border-purple-500 bg-purple-50';
      case 'Flagged':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-background-secondary rounded-2xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Shipment History</h2>

      {sortedShipments.length === 0 ? (
        <p className="text-foreground-secondary text-center py-8">No shipments yet</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {sortedShipments.map((shipment, index) => (
              <div key={shipment.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getStatusColor(shipment.status)}`}
                >
                  {getStatusIcon(shipment.status)}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          Box {shipment.boxNumber}
                        </span>
                        <span className="text-foreground-secondary">-</span>
                        <span className="text-foreground-secondary">{shipment.boxName}</span>
                      </div>
                      <div className="text-sm text-foreground-tertiary mt-1">
                        {shipment.status}
                        {shipment.shippedAt && ` • ${formatDate(shipment.shippedAt)}`}
                      </div>
                    </div>

                    {shipment.trackingNumber && (
                      <div className="text-right">
                        {shipment.trackingUrl ? (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                          >
                            {shipment.carrier && (
                              <span className="text-foreground-tertiary">{shipment.carrier}:</span>
                            )}
                            {shipment.trackingNumber}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-foreground-secondary">
                            {shipment.carrier && `${shipment.carrier}: `}
                            {shipment.trackingNumber}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddressFixerForm({
  clientSlug,
  subscriberId,
  address,
  onUpdate,
}: {
  clientSlug: string;
  subscriberId: string;
  address: SubscriberAddress;
  onUpdate: (newAddress: SubscriberAddress) => void;
}) {
  const [formData, setFormData] = useState<SubscriberAddress>(address);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(address);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      const result = await updateSubscriberAddress(clientSlug, subscriberId, formData);

      if (result.success) {
        onUpdate(formData);
        setSaveResult({ success: true, message: 'Address updated & pushed to Recharge/Shopify' });
      } else {
        setSaveResult({ success: false, message: result.error || 'Failed to save' });
      }
    } catch (err) {
      setSaveResult({ success: false, message: 'Network error' });
    } finally {
      setIsSaving(false);
    }

    // Clear message after 5 seconds
    setTimeout(() => setSaveResult(null), 5000);
  };

  return (
    <div className="bg-background-secondary rounded-2xl border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold text-foreground">Shipping Address</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-1">
            Address Line 1
          </label>
          <input
            type="text"
            value={formData.address1}
            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-1">
            Address Line 2
          </label>
          <input
            type="text"
            value={formData.address2 || ''}
            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
            placeholder="Apt, Suite, etc."
            className="w-full px-3 py-2 bg-white border border-border rounded-lg text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              State
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-white border border-border rounded-lg text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>

        {/* Save Result Message */}
        {saveResult && (
          <div
            className={`p-3 rounded-lg text-sm ${
              saveResult.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {saveResult.message}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save & Push
        </button>

        <p className="text-xs text-foreground-tertiary text-center">
          Saves address changes to subscriber record
        </p>
      </div>
    </div>
  );
}

function SubscriberInfo({ subscriber }: { subscriber: SubscriberDetail }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-background-secondary rounded-2xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Subscriber Info</h2>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-foreground-tertiary" />
          <span className="text-foreground-secondary text-sm">{subscriber.email}</span>
        </div>

        {subscriber.discordUsername && (
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-foreground-tertiary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span className="text-foreground-secondary text-sm">{subscriber.discordUsername}</span>
          </div>
        )}

        {subscriber.address.phone && (
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-foreground-tertiary" />
            <span className="text-foreground-secondary text-sm">{subscriber.address.phone}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-foreground-tertiary" />
          <span className="text-foreground-secondary text-sm">
            Subscribed {formatDate(subscriber.subscribedAt)}
          </span>
        </div>

        {subscriber.shirtSize && (
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 text-center text-foreground-tertiary text-xs font-bold">SZ</span>
            <span className="text-foreground-secondary text-sm">Shirt: {subscriber.shirtSize}</span>
          </div>
        )}

        {subscriber.preferredName && (
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-foreground-tertiary" />
            <span className="text-foreground-secondary text-sm">
              Preferred: {subscriber.preferredName}
              {subscriber.usePreferredNameForShipping && (
                <span className="ml-2 text-blue-600 text-xs">(used for shipping)</span>
              )}
            </span>
          </div>
        )}

        {/* External Links */}
        <div className="pt-4 border-t border-border space-y-2">
          {subscriber.rechargeCustomerId && (
            <a
              href={`https://admin.rechargeapps.com/customers/${subscriber.rechargeCustomerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              View in Recharge <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {subscriber.shopifyCustomerId && (
            <a
              href={`https://admin.shopify.com/customers/${subscriber.shopifyCustomerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              View in Shopify <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
