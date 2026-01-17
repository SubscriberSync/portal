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
