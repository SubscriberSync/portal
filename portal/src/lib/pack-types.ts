// Pack Mode Types - API Response Schemas

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

export interface ShipmentFields {
  "Type": "Subscription" | "One-Off";
  "Status": "Unfulfilled" | "Packed" | "Flagged" | "Merged";
  "↩️ Subscriber First Name": string[];
  "↩️ Subscriber Last Name": string[];
  "↩️ Shirt Size": string[];
  "↩️ City": string[];
  "↩️ State": string[];
  "↩️ Zip": string[];
  "↩️ Address 1"?: string[];
  "↩️ Address"?: string[];
  "↩️ Product Name": string[];
  "↩️ Sequence ID": number[];
  "↩️ Sidecar Names": string[];
  "⚙️ Merged Items": string[];
  "Manifest": string;
  "✏️ Gift Note": string;
  "⚙️ Shopify Order ID": string;
}

export interface Shipment {
  id: string;
  fields: ShipmentFields;
}

export interface QueueStats {
  unfulfilled: number;
  packedToday: number;
  total: number;
  avgPackTimeSeconds: number | null;
  estFinishTime: string | null;  // ISO datetime
}

export interface QueueResponse {
  queue: Shipment[];
  stats: QueueStats;
}

export interface CompleteResponse {
  success: true;
  packed: Shipment;
  next: Shipment | null;
}

export interface FlagResponse {
  success: true;
  flagged: Shipment;
  next: Shipment | null;
}

export interface MergeResponse {
  success: true;
  merged: Shipment;
}

export interface UnmergeResponse {
  success: true;
  unmerged: Shipment;
}

export type FlagReason =
  | "Out of Stock"
  | "Address Issue"
  | "Customer Request"
  | "Damaged Item"
  | "Other";

export type PrintMethod = "shopify" | "pirateship" | "other";
