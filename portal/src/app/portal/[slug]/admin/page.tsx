'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Settings, CreditCard, Key, ExternalLink, Eye, EyeOff, Check, Loader2 } from 'lucide-react';

interface ApiKeyField {
  id: string;
  label: string;
  placeholder: string;
  description: string;
}

const API_KEYS: ApiKeyField[] = [
  {
    id: 'shopify_api_key',
    label: 'Shopify API Key',
    placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    description: 'Admin API access token from your Shopify store',
  },
  {
    id: 'shopify_api_secret',
    label: 'Shopify API Secret',
    placeholder: 'shpss_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    description: 'API secret key for webhook verification',
  },
  {
    id: 'recharge_api_key',
    label: 'Recharge API Key',
    placeholder: 'sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    description: 'API token from Recharge subscription settings',
  },
];

export default function AdminPage() {
  const params = useParams();
  const clientSlug = params.slug as string;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/portal/${clientSlug}`}
              className="text-[var(--foreground-tertiary)] hover:text-[var(--foreground)] transition-colors"
            >
              &larr; Back to Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
            <p className="text-foreground-secondary">Manage billing and API credentials</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Billing Section */}
          <BillingSection clientSlug={clientSlug} />

          {/* API Keys Section */}
          <ApiKeysSection clientSlug={clientSlug} apiKeys={API_KEYS} />
        </div>
      </div>
    </div>
  );
}

function BillingSection({ clientSlug }: { clientSlug: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenBillingPortal = async () => {
    setIsLoading(true);
    try {
      // Call internal API to get Stripe Customer Portal URL
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to get billing portal URL');
      }

      const data = await res.json();

      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Unable to open billing portal. Please contact support.');
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] p-6 shadow-[0_0_0_1px_var(--glass-inset)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[rgba(92,184,122,0.15)] border border-[rgba(92,184,122,0.2)] flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-[#5CB87A]" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Billing & Subscription</h2>
          <p className="text-sm text-[var(--foreground-tertiary)] mb-4">
            Manage your subscription, update payment methods, and view invoices
          </p>
          <button
            onClick={handleOpenBillingPortal}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--foreground)] text-[var(--background)] font-medium rounded-xl hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Open Billing Portal
          </button>
        </div>
      </div>
    </section>
  );
}

function ApiKeysSection({ clientSlug, apiKeys }: { clientSlug: string; apiKeys: ApiKeyField[] }) {
  return (
    <section className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] p-6 shadow-[0_0_0_1px_var(--glass-inset)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[rgba(168,85,247,0.15)] border border-[rgba(168,85,247,0.2)] flex items-center justify-center flex-shrink-0">
          <Key className="w-5 h-5 text-[#a855f7]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">API Keys</h2>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Update your integration credentials if they need to be rotated
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {apiKeys.map((key) => (
          <ApiKeyInput key={key.id} clientSlug={clientSlug} field={key} />
        ))}
      </div>

      <div className="mt-6 p-4 bg-[rgba(224,122,66,0.1)] border border-[rgba(224,122,66,0.2)] rounded-xl">
        <p className="text-sm text-[var(--accent)]">
          <strong>Security Note:</strong> API keys are encrypted and stored securely. For security
          reasons, existing keys are not displayed. Only enter a new key if you need to update it.
        </p>
      </div>
    </section>
  );
}

function ApiKeyInput({ clientSlug, field }: { clientSlug: string; field: ApiKeyField }) {
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!value.trim()) return;

    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/integrations/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyType: field.id,
          keyValue: value,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update API key');
      }

      setSaved(true);
      setValue('');

      // Reset saved indicator after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--foreground)]">{field.label}</label>
      <p className="text-xs text-[var(--foreground-muted)]">{field.description}</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showValue ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-2.5 pr-10 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!value.trim() || isSaving}
          className="px-4 py-2.5 bg-[var(--accent)] text-[#0c0c0c] font-medium rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : null}
          {saved ? 'Saved' : 'Update'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
