// Pack Mode API Functions - Using internal Supabase APIs

import type {
  OverviewResponse,
  QueueResponse,
  CompleteResponse,
  FlagResponse,
  MergeResponse,
  UnmergeResponse,
  FlagReason,
} from './pack-types';

export async function fetchPackOverview(clientSlug: string): Promise<OverviewResponse> {
  const res = await fetch('/api/pack/overview');
  if (!res.ok) {
    throw new Error(`Failed to fetch pack overview: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchPackQueue(clientSlug: string): Promise<QueueResponse> {
  const res = await fetch('/api/pack/queue');
  if (!res.ok) {
    throw new Error(`Failed to fetch pack queue: ${res.statusText}`);
  }
  return res.json();
}

export async function markShipmentComplete(
  clientSlug: string,
  shipmentId: string
): Promise<CompleteResponse> {
  const res = await fetch('/api/pack/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipmentId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to mark shipment complete: ${res.statusText}`);
  }
  return res.json();
}

export async function flagShipment(
  clientSlug: string,
  shipmentId: string,
  reason: FlagReason
): Promise<FlagResponse> {
  const res = await fetch('/api/pack/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipmentId, reason }),
  });
  if (!res.ok) {
    throw new Error(`Failed to flag shipment: ${res.statusText}`);
  }
  return res.json();
}

export async function mergeShipments(
  clientSlug: string,
  primaryId: string,
  secondaryId: string
): Promise<MergeResponse> {
  const res = await fetch('/api/pack/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ primaryId, secondaryId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to merge shipments: ${res.statusText}`);
  }
  return res.json();
}

export async function unmergeShipment(
  clientSlug: string,
  shipmentId: string
): Promise<UnmergeResponse> {
  const res = await fetch('/api/pack/unmerge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipmentId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to unmerge shipment: ${res.statusText}`);
  }
  return res.json();
}

export function getExportCsvUrl(clientSlug: string): string {
  return '/api/shipping/csv';
}

export function getShopifyOrdersUrl(shopifyStore: string): string {
  return `https://admin.shopify.com/store/${shopifyStore}/orders?status=unfulfilled`;
}
