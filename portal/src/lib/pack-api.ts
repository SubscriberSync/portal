// Pack Mode API Functions

import type {
  OverviewResponse,
  QueueResponse,
  CompleteResponse,
  FlagResponse,
  MergeResponse,
  UnmergeResponse,
  FlagReason,
} from './pack-types';

const BASE_URL = 'https://n8n.everlorehollow.com/webhook';

export async function fetchPackOverview(clientSlug: string): Promise<OverviewResponse> {
  const res = await fetch(`${BASE_URL}/pack/overview?client=${clientSlug}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch pack overview: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchPackQueue(clientSlug: string): Promise<QueueResponse> {
  const res = await fetch(`${BASE_URL}/pack/queue?client=${clientSlug}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch pack queue: ${res.statusText}`);
  }
  return res.json();
}

export async function markShipmentComplete(
  clientSlug: string,
  shipmentId: string
): Promise<CompleteResponse> {
  const res = await fetch(`${BASE_URL}/pack/complete?client=${clientSlug}`, {
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
  const res = await fetch(`${BASE_URL}/pack/flag?client=${clientSlug}`, {
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
  const res = await fetch(`${BASE_URL}/pack/merge?client=${clientSlug}`, {
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
  const res = await fetch(`${BASE_URL}/pack/unmerge?client=${clientSlug}`, {
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
  return `${BASE_URL}/pack/export-csv?client=${clientSlug}`;
}

export function getShopifyOrdersUrl(shopifyStore: string): string {
  return `https://admin.shopify.com/store/${shopifyStore}/orders?status=unfulfilled`;
}
