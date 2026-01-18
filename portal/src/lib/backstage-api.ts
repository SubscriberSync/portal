// Backstage API Functions

const API_BASE = 'https://n8n.everlorehollow.com/webhook';

export interface Subscriber {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Expired';
  boxNumber: number;
  shirtSize: string;
  tags: string[];
  atRisk: boolean;
}

export interface SearchResponse {
  subscribers: Subscriber[];
  count: number;
}

export interface SubscriberAddress {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface ShipmentEvent {
  id: string;
  boxNumber: number;
  boxName: string;
  status: 'Unfulfilled' | 'Packed' | 'Shipped' | 'Delivered' | 'Flagged';
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
}

export interface SubscriberDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  discordUsername?: string;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Expired';
  boxNumber: number;
  shirtSize: string;
  tags: string[];
  atRisk: boolean;
  subscribedAt: string;
  address: SubscriberAddress;
  shipments: ShipmentEvent[];
  rechargeCustomerId?: string;
  shopifyCustomerId?: string;
}

export async function searchSubscribers(
  clientSlug: string,
  query: string
): Promise<SearchResponse> {
  const res = await fetch(
    `${API_BASE}/backstage/${clientSlug}/subscribers/search?q=${encodeURIComponent(query)}`
  );

  if (!res.ok) {
    throw new Error('Search failed');
  }

  return res.json();
}

export async function getSubscriberDetail(
  clientSlug: string,
  subscriberId: string
): Promise<SubscriberDetail> {
  const res = await fetch(
    `${API_BASE}/backstage/${clientSlug}/subscribers/${subscriberId}`
  );

  if (!res.ok) {
    throw new Error('Failed to fetch subscriber details');
  }

  return res.json();
}

export async function updateSubscriberAddress(
  clientSlug: string,
  subscriberId: string,
  address: SubscriberAddress
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `${API_BASE}/backstage/${clientSlug}/subscribers/${subscriberId}/address`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(address),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || 'Failed to update address' };
  }

  return res.json();
}
