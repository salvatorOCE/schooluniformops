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
export type FixUpStatus = 'OPEN' | 'WAITING_STOCK' | 'IN_PRODUCTION' | 'PACKED' | 'DISPATCHED' | 'CLOSED';

export interface FixUpRequest {
  id: string;
  original_order_id: string;
  original_order_number: string;
  student_name: string;
  school_name: string;
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
  sku: string;
  productName: string;
  size: string;
  qty: number;
  status: 'PENDING' | 'EMBROIDERY' | 'PACKED' | 'DISPATCHED';
}

export interface OrderHistoryRecord {
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
  hasIssues: boolean;
  hasPartialEmbroidery: boolean;
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

