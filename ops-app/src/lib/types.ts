// Core type definitions for the operations app

export type DeliveryType = 'HOME' | 'SCHOOL' | 'STORE';
export type EmbroideryStatus = 'PENDING' | 'PARTIAL' | 'DONE' | 'REPLENISHMENT';
export type OrderStatus = string;
export type UserRole = 'EMBROIDER' | 'DISTRIBUTION' | 'ADMIN';

export interface OrderItem {
  id: string;
  product_name: string;
  sku: string;
  quantity: number;
  size?: string;
  requires_embroidery: boolean;
  embroidery_status?: 'PENDING' | 'DONE'; // Track item-level status
  unit_price?: number; // For bulk orders / edit
  /** Number sent so far (for Partial Order Complete). Undefined/0 = none sent. */
  sent_quantity?: number;
  /** Nickname / personalisation for embroidery or print (from WooCommerce senior uniforms). */
  nickname?: string | null;
  /** Garment reference images from WooCommerce (front/back) */
  image_front_url?: string | null;
  image_back_url?: string | null;
}

export interface School {
  id: string;
  code: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  school_id: string;
  sizes: string[];
}

/** Full product row for All Products list: codes, price (charged), stock, school, manufacturer, etc. */
export interface ProductListRow {
  id: string;
  /** Null for manual products (e.g. Elizabeth Downs) sold outside WooCommerce. */
  sku: string | null;
  name: string;
  category: string | null;
  /** List/sell price (what we charge) */
  price: number;
  requires_embroidery: boolean;
  school_id: string | null;
  school_code: string | null;
  school_name: string | null;
  attributes: { name?: string; slug?: string; options?: string[] }[] | null;
  /** Size options from attributes */
  sizes: string[];
  stock_on_shelf: Record<string, number>;
  stock_in_transit: Record<string, number>;
  woocommerce_id: number | null;
  /** Manufacturer/supplier name (for purchase orders). */
  manufacturer_name: string | null;
  /** Single manufacturer code when product has one code for all sizes. */
  manufacturer_id: string | null;
  /** Manufacturer code for kids sizes (when different from adult). */
  manufacturer_id_kids: string | null;
  /** Manufacturer code for adult sizes (when different from kids). */
  manufacturer_id_adult: string | null;
  /** Manufacturer product name/code (as they refer to it). */
  manufacturer_product: string | null;
  /** If true, product is saleable; validation requires manufacturer to be assigned. */
  is_available_for_sale: boolean;
  /** Cost for us (landed/cost price). */
  cost: number | null;
  /** Total embroidery/print cost per unit. */
  embroidery_print_cost: number | null;
  created_at: string;
  updated_at: string;
}

/** Payload for updating a product. All fields optional; manual products can edit name, sku, school, etc. */
export interface ProductUpdatePayload {
  name?: string;
  sku?: string | null;
  category?: string | null;
  price?: number;
  school_id?: string | null;
  requires_embroidery?: boolean;
  manufacturer_name?: string | null;
  manufacturer_id?: string | null;
  manufacturer_id_kids?: string | null;
  manufacturer_id_adult?: string | null;
  manufacturer_product?: string | null;
  is_available_for_sale?: boolean;
  cost?: number | null;
  embroidery_print_cost?: number | null;
}

export interface Order {
  id: string;
  woo_order_id: number;
  order_number: string;
  parent_name: string;
  student_name: string | null;
  school_id?: string | null;
  school_code: string | null;
  school_name: string;
  delivery_type: DeliveryType;
  embroidery_status: EmbroideryStatus;
  order_status: OrderStatus;
  items: OrderItem[];

  // Distribution Specifics
  carrier?: string; // For HOME delivery (e.g., 'AusPost', 'StarTrack')
  staging_location?: string; // For STORE pickup (e.g., 'Bin A1', 'Shelf 3')

  // Timestamps
  created_at: string;
  paid_at: string;
  embroidery_done_at?: string;
  packed_at?: string;
  dispatched_at?: string;

  // Production Notes
  notes?: string;

  // Bulk order meta (e.g. date order was requested, partial delivery)
  meta?: { order_requested_at?: string; partial_delivery?: number[] };

  // Senior Order Specifics
  is_senior_order?: boolean;
  student_last_name?: string;
  student_nickname?: string;
  class_id?: string;
  garment_type?: string; // e.g., 'Blazer', 'Senior Polo'

  // Shipping (for HOME delivery)
  shipping_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postcode: string;
  };
}

export interface SchoolRunGroup {
  school_code: string;
  school_name: string;
  order_count: number;
  item_count: number;
  orders: Order[];
  /** Set by distribution when splitting senior vs non-senior; used for partial vs full completion. */
  section?: 'NON_SENIOR' | 'SENIOR';
}

export interface ExceptionOrder extends Order {
  exception_type: 'MISSING_STUDENT_NAME' | 'MISSING_SCHOOL_CODE' | 'MISSING_BOTH';
}

// ... existing types
export interface EmbroideryBatch {
  school_name: string;
  order_count: number;
  total_units: number;
  oldest_order_date: string;
  sku_summary: Record<string, { name: string; sizes: Record<string, { total: number; completed: number }> }>; // SKU -> { Name, Size -> { total, completed } }
  orders: Order[];

  // Senior Batch Specifics
  is_senior_batch?: boolean;
  batch_status?: 'OPEN' | 'LOCKED' | 'PRODUCTION' | 'COMPLETE';
  cutoff_date?: string; // ISO date

  // Replenishment Specifics
  is_replenishment?: boolean;
  target_school_code?: string;
  priority_level?: 'LOW' | 'NORMAL' | 'URGENT';
}

// System Events (Audit Log)
export type EntityType = 'ORDER' | 'ITEM' | 'BATCH' | 'SESSION' | 'FIX_UP';
export type EventType = 'STATUS_CHANGE' | 'EDIT' | 'NOTE' | 'ASSIGNMENT' | 'CREATED';

export interface SystemEvent {
  id: string;
  entity_id: string;
  entity_type: EntityType;
  event_type: EventType;
  prev_state?: any;
  new_state?: any;
  actor_id: string; // User ID or 'SYSTEM'
  timestamp: string;
  metadata?: Record<string, any>; // Extract details like "Batch ID" or "Notes"
}

// Fix-Up System Types
export type FixUpType = 'SIZE_EXCHANGE' | 'PRINT_ERROR' | 'EMBROIDERY_ERROR' | 'WRONG_PERSONALISATION' | 'DAMAGED_ITEM' | 'MISSING_ITEM' | 'OTHER';
export type FixUpStatus = 'OPEN' | 'WAITING_STOCK' | 'IN_PRODUCTION' | 'PACKED' | 'DISPATCHED' | 'SHIPPED' | 'CLOSED';

export interface FixUpRequest {
  id: string;
  original_order_id: string;
  original_order_number: string;
  student_name: string;
  parent_name?: string | null;
  parent_email?: string | null;
  parent_phone?: string | null;
  school_name: string;
  school_code?: string | null;
  type: FixUpType;
  status: FixUpStatus;
  priority: 'HIGH' | 'CRITICAL';
  items: OrderItem[]; // Replacement items
  notes: string;
  created_at: string;
  resolved_at?: string;
}


export interface DashboardStats {
  // ... existing types
  awaiting_embroidery: number;
  ready_to_pack: number;
  dispatched_today: number;
  exceptions: number;
}

export interface AnalyticsData {
  summary: {
    totalSales: number;
    netSales: number;
    ordersCount: number;
    itemsSold: number;
    avgOrderValue: number;
    returns: number;
  };
  chartData: {
    date: string;
    value: number;
    secondaryValue?: number; // Previous period comparison
    label?: string;
  }[];
  leaderboard?: {
    label: string;
    value: number;
    subValue?: string;
  }[];
}


export type ShiftType = 'PRODUCTION' | 'EMBROIDERY' | 'DISPATCH' | 'FIX_UP' | 'SENIOR_PRIORITY';
export type ShiftStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'EXCEPTION';

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  role: UserRole;
  avatar_color?: string; // e.g. 'bg-blue-500'
}

export interface ScheduleEvent {
  id: string;
  title: string;
  type: ShiftType;
  status: ShiftStatus;
  start_date: string; // ISO Date or Date-Time
  end_date?: string;

  // Resource Allocation
  staff_ids: string[];

  // Linked Entities
  order_ids?: string[];
  batch_id?: string;
  school_code?: string;

  // Timeline / Metrics
  created_at: string;
  completed_at?: string;
  delivered_at?: string;

  // UI Props
  notes?: string;
  is_locked?: boolean; // If completed/delivered
}

export interface CalendarDayLoad {
  date: string;
  load_level: 'LOW' | 'MEDIUM' | 'HEAVY' | 'OVERCAPACITY';
  event_count: number;
}

// School Portal / VMI Types
export interface SchoolInventoryItem {
  id: string;
  sku: string;
  product_name: string;
  size: string;
  current_stock: number;
  min_par_level: number;
  max_par_level: number;
  last_restocked?: string;
  status: 'OK' | 'LOW' | 'CRITICAL';
}

/** One row contributing to "Unprocessed" count for a product/size in Digital Stock */
export interface UnprocessedDetailRow {
  order_item_id: string;
  order_id: string;
  order_number: string;
  status: string;
  customer_name: string;
  student_name: string | null;
  quantity: number;
  sku: string;
  name: string;
  size: string | null;
}

// --- History & Audit Types ---

export type HistoryEntityType = 'ORDER' | 'BATCH' | 'RUN';
export type HistoryActionType =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGE'
  | 'EMBROIDERY_RUN'
  | 'PACKED'
  | 'DISPATCHED'
  | 'NOTE_ADDED'
  | 'ISSUE_FLAGGED'
  | 'ISSUE_RESOLVED';

export interface HistoryEvent {
  id: string;
  entityType: HistoryEntityType;
  entityId: string;
  action: HistoryActionType;
  details: string;
  actor: string;
  timestamp: Date;
  metadata?: any;
}

export interface OrderHistoryItem {
  /** Order item UUID for matching product images API */
  itemId?: string;
  sku: string;
  productName: string;
  size: string;
  qty: number;
  status: 'PENDING' | 'EMBROIDERY' | 'PACKED' | 'DISPATCHED';
  /** Garment reference images from WooCommerce (front/back) */
  imageFrontUrl?: string | null;
  imageBackUrl?: string | null;
}

export interface OrderHistoryRecord {
  /** Internal order UUID (for API calls e.g. fetching product images) */
  id?: string;
  orderId: string;
  studentName: string;
  parentName: string;
  schoolName: string;
  schoolCode: string;
  deliveryType: 'HOME' | 'SCHOOL' | 'STORE';
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'DISPATCHED' | 'COLLECTED' | 'EXCEPTION';
  items: OrderHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
  /** When payment was captured (if known) */
  paidAt?: Date;
  hasIssues: boolean;
  hasPartialEmbroidery: boolean;
  /** True when the order has at least one admin/school note */
  hasNotes?: boolean;
  events: HistoryEvent[];
}

export interface BatchHistoryRecord {
  batchId: string;
  schoolName: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  totalUnits: number;
  completedUnits: number;
  createdAt: Date;
}

export interface RunHistoryRecord {
  runId: string;
  batchId?: string;
  schoolName: string;
  productName: string;
  size: string;
  unitsRun: number;
  operator: string;
  status: 'COMPLETED' | 'PARTIAL';
  timestamp: Date;
}

// Pack-out manifest: record of orders packed in a session (for school run / PDF + Order Tracking)
export interface PackOutManifestOrderSummary {
  order_id: string;
  order_number: string;
  student_name: string | null;
  /** Parent / guardian name for contact on manifest */
  parent_name?: string | null;
  /** Delivery method snapshot (HOME / SCHOOL / STORE) */
  delivery_type?: DeliveryType;
  /** Short, printable address for HOME deliveries (single line) */
  address_summary?: string | null;
  item_count: number;
  items_summary: string; // e.g. "2x Polo 8, 1x Shorts 10"
  /** Shown on manifest when this pack is non-senior only; senior garments done bulk on deadline (printing). */
  senior_part_not_complete?: boolean;
}

export interface PackOutManifest {
  id: string;
  school_code: string;
  school_name: string;
  packed_at: string; // ISO
  orders: PackOutManifestOrderSummary[];
}

// Important Notes — shared team notes with optional photos and priority
export type ImportantNotePriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface ImportantNote {
  id: string;
  title: string;
  body: string;
  priority: ImportantNotePriority;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  /** Public URLs of attached images (e.g. from Supabase Storage) */
  image_urls: string[];
}

