'use client';

import useSWR from 'swr';
import type { OverviewResponse } from '@/lib/pack-types';
import { fetchPackOverview } from '@/lib/pack-api';

export function usePackOverview(clientSlug: string) {
  const { data, error, isLoading, mutate } = useSWR<OverviewResponse>(
    clientSlug ? `/pack/overview/${clientSlug}` : null,
    () => fetchPackOverview(clientSlug),
    {
      revalidateOnFocus: false,
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
