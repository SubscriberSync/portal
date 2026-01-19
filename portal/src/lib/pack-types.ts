// Pack Mode Types - API Response Schemas (Supabase format)

export interface ShipmentGroup {
  key: string;           // "episode-1", "episode-3", "one-off"
  type: "subscription" | "one-off";
  sequenceId: number | null;
  name: string;          // "Episode 1", "One-Off Orders"
  count: number;
}

export interface ComboShipment {
  id: string;            // Shipment record ID
  type: "Subscription" | "One-Off";
  sequenceId: number | null;
  name: string;          // "Episode 3 Box" or "Order #1045"
}

export interface Combo {
  email: string;
  customerName: string;
  shipments: ComboShipment[];
}

export interface OverviewResponse {
  groups: ShipmentGroup[];
  combos: Combo[];
  totalShipments: number;
  comboCount: number;
}

// Subscriber info embedded in shipment
export interface ShipmentSubscriber {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  shirt_size: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
}

// Clean Supabase-style shipment interface
export interface PackShipment {
  id: string;
  type: "Subscription" | "One-Off" | null;
  status: "Unfulfilled" | "Ready to Pack" | "Packed" | "Flagged" | "Merged" | "Shipped" | "Delivered";
  sequence_id: number | null;
  product_name: string | null;
  variant_name: string | null;
  gift_note: string | null;
  order_number: string | null;
  shopify_order_id: string | null;
  tracking_number: string | null;
  carrier: string | null;
  weight_oz: number | null;
  print_batch_id: string | null;
  print_sequence: number | null;
  merged_into_id: string | null;
  merged_shipment_ids: string[] | null;
  flag_reason: string | null;
  subscriber: ShipmentSubscriber | null;
  // For merged items display
  merged_items?: PackShipment[];
  // Ghost order tracking
  external_fulfillment_source: "external" | "shipstation_direct" | "pirateship_csv" | "shopify_shipping" | "subscribersync" | null;
}

// Batch info for batch selector
export interface PrintBatchInfo {
  id: string;
  batch_number: number;
  total_labels: number;
  successful_labels: number;
  created_at: string;
  remaining: number;
}

export interface QueueStats {
  unfulfilled: number;
  packedToday: number;
  total: number;
  avgPackTimeSeconds: number | null;
  estFinishTime: string | null;  // ISO datetime
}

export interface QueueResponse {
  queue: PackShipment[];
  stats: QueueStats;
  batches?: PrintBatchInfo[];
}

export interface CompleteResponse {
  success: boolean;
  remaining: number;
  next: { id: string; product_name: string } | null;
  hasMore: boolean;
}

export interface FlagResponse {
  success: boolean;
  remaining: number;
  next: { id: string; product_name: string } | null;
  hasMore: boolean;
}

export interface MergeResponse {
  success: boolean;
  merged: PackShipment;
}

export interface UnmergeResponse {
  success: boolean;
  unmerged: PackShipment;
}

export type FlagReason =
  | "Out of Stock"
  | "Address Issue"
  | "Customer Request"
  | "Damaged Item"
  | "Other";

export type PrintMethod = "shopify" | "pirateship" | "other";
