'use client';

import useSWR from 'swr';
import type { QueueResponse } from '@/lib/pack-types';
import { fetchPackQueue } from '@/lib/pack-api';

export function usePackQueue(clientSlug: string, refreshInterval = 3000, batchId?: string) {
  const { data, error, isLoading, mutate } = useSWR<QueueResponse>(
    clientSlug ? `/pack/queue/${clientSlug}${batchId ? `?batch=${batchId}` : ''}` : null,
    () => fetchPackQueue(clientSlug, batchId),
    {
      refreshInterval,
      revalidateOnFocus: true,
    }
  );

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
