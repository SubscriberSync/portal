'use client';

import useSWR from 'swr';
import type { QueueResponse } from '@/lib/pack-types';
import { fetchPackQueue } from '@/lib/pack-api';

export function usePackQueue(clientSlug: string, refreshInterval = 3000) {
  const { data, error, isLoading, mutate } = useSWR<QueueResponse>(
    clientSlug ? `/pack/queue/${clientSlug}` : null,
    () => fetchPackQueue(clientSlug),
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
