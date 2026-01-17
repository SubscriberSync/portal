'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { searchSubscribers, type Subscriber } from '@/lib/backstage-api';

interface SubscriberSearchProps {
  clientSlug: string;
  onSelect: (id: string) => void;
}

export function SubscriberSearch({ clientSlug, onSelect }: SubscriberSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(
    async (value: string) => {
      if (value.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchSubscribers(clientSlug, value);
        setResults(data.subscribers);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
        setError('Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [clientSlug]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search by 300ms
    timeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleSelectSubscriber = (id: string) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    onSelect(id);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-tertiary" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-10 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-tertiary animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute w-full mt-2 bg-white border border-border rounded-xl shadow-lg max-h-80 overflow-auto z-50">
          {error ? (
            <div className="p-4 text-red-600 text-center">{error}</div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((sub) => (
                <li
                  key={sub.id}
                  onClick={() => handleSelectSubscriber(sub.id)}
                  className="px-4 py-3 hover:bg-background-elevated cursor-pointer border-b border-border last:border-0 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {sub.firstName} {sub.lastName}
                        </span>
                        {sub.atRisk && (
                          <span className="text-amber-500 flex-shrink-0" title="At Risk">
                            ⚠️
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-foreground-secondary truncate">
                        {sub.email}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <StatusBadge status={sub.status} />
                      <div className="text-xs text-foreground-tertiary mt-1">
                        Box {sub.boxNumber}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="p-4 text-foreground-secondary text-center">
              No subscribers found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Subscriber['status'] }) {
  const styles: Record<Subscriber['status'], string> = {
    Active: 'bg-green-100 text-green-700',
    Paused: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-700',
    Expired: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.Expired}`}
    >
      {status}
    </span>
  );
}
