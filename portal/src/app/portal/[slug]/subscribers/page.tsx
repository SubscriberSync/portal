'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SubscriberSearch } from '@/components/backstage/SubscriberSearch';

export default function SubscribersPage() {
  const router = useRouter();
  const params = useParams();
  const clientSlug = params.slug as string;

  const handleSelect = (subscriberId: string) => {
    router.push(`/portal/${clientSlug}/subscribers/${subscriberId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/portal/${clientSlug}`}
              className="text-foreground-secondary hover:text-foreground transition-colors"
            >
              &larr; Back to Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Subscribers</h1>
          <p className="text-foreground-secondary">
            Search and view subscriber details
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-12">
          <SubscriberSearch clientSlug={clientSlug} onSelect={handleSelect} />
        </div>

        {/* Placeholder content */}
        <div className="bg-background-secondary rounded-2xl border border-border p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Search for a subscriber
          </h2>
          <p className="text-foreground-secondary max-w-md mx-auto">
            Use the search bar above to find subscribers by name or email. Click on a
            result to view their full profile and timeline.
          </p>
        </div>
      </div>
    </div>
  );
}
