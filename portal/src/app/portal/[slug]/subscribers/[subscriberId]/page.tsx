'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function SubscriberDetailPage() {
  const params = useParams();
  const clientSlug = params.slug as string;
  const subscriberId = params.subscriberId as string;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/portal/${clientSlug}/subscribers`}
              className="text-foreground-secondary hover:text-foreground transition-colors"
            >
              &larr; Back to Search
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-background-secondary rounded-2xl border border-border p-12 text-center">
          <div className="text-6xl mb-4">👤</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Subscriber Detail
          </h1>
          <p className="text-foreground-secondary mb-6">
            Subscriber ID: <code className="bg-background-elevated px-2 py-1 rounded">{subscriberId}</code>
          </p>
          <p className="text-foreground-tertiary text-sm">
            The full 360 view and timeline will be implemented when the detail API endpoint is ready.
          </p>
        </div>
      </div>
    </div>
  );
}
