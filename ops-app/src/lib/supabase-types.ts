export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            schools: {
                Row: {
                    id: string
                    code: string
                    name: string
                    slug: string
                    logo_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    code: string
                    name: string
                    slug: string
                    logo_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    code?: string
                    name?: string
                    slug?: string
                    logo_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            products: {
                Row: {
                    id: string
                    woo_product_id: number
                    sku: string
                    name: string
                    category: string | null
                    requires_embroidery: boolean
                    school_id: string | null
                    attributes: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    woo_product_id: number
                    sku: string
                    name: string
                    category?: string | null
                    requires_embroidery?: boolean
                    school_id?: string | null
                    attributes?: Json | null
                    created_at?: string
                    updated_at?: string
                }
            }
            embroidery_batches: {
                Row: {
                    id: string
                    name: string
                    school_id: string
                    status: 'OPEN' | 'LOCKED' | 'IN_PRODUCTION' | 'COMPLETED'
                    machine_id: number | null
                    is_senior_batch: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    school_id: string
                    status?: 'OPEN' | 'LOCKED' | 'IN_PRODUCTION' | 'COMPLETED'
                    machine_id?: number | null
                    is_senior_batch?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            orders: {
                Row: {
                    id: string
                    woo_order_id: number
                    order_number: string
                    status: string
                    customer_name: string
                    student_name: string | null
                    school_id: string | null
                    delivery_method: 'HOME' | 'SCHOOL' | 'STORE'
                    shipping_address: Json | null
                    created_at: string
                    paid_at: string | null
                    embroidery_done_at: string | null
                    packed_at: string | null
                    dispatched_at: string | null
                    notes: string | null
                    meta: Json | null
                }
                Insert: {
                    id?: string
                    woo_order_id: number
                    order_number: string
                    status?: string
                    customer_name: string
                    student_name?: string | null
                    school_id?: string | null
                    delivery_method: 'HOME' | 'SCHOOL' | 'STORE'
                    shipping_address?: Json | null
                    created_at?: string
                    paid_at?: string | null
                    embroidery_done_at?: string | null
                    packed_at?: string | null
                    dispatched_at?: string | null
                    notes?: string | null
                    meta?: Json | null
                }
            }
            order_items: {
                Row: {
                    id: string
                    order_id: string
                    product_id: string | null
                    sku: string
                    name: string
                    quantity: number
                    size: string | null
                    unit_price?: number
                    total_price?: number
                    requires_embroidery: boolean
                    embroidery_status: 'NA' | 'PENDING' | 'DONE' | 'PARTIAL'
                    batch_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    order_id: string
                    product_id?: string | null
                    sku: string
                    name: string
                    quantity?: number
                    size?: string | null
                    unit_price?: number
                    total_price?: number
                    requires_embroidery?: boolean
                    embroidery_status?: 'NA' | 'PENDING' | 'DONE' | 'PARTIAL'
                    batch_id?: string | null
                    created_at?: string
                }
            }
            fix_ups: {
                Row: {
                    id: string
                    original_order_id: string | null
                    type: 'SIZE_EXCHANGE' | 'PRINT_ERROR' | 'EMBROIDERY_ERROR' | 'DAMAGED_ITEM' | 'MISSING_ITEM'
                    status: 'OPEN' | 'In_PRODUCTION' | 'RESOLVED' | 'CLOSED'
                    priority: string
                    items: Json | null
                    notes: string | null
                    created_at: string
                    resolved_at: string | null
                }
                Insert: {
                    id?: string
                    original_order_id?: string | null
                    type: 'SIZE_EXCHANGE' | 'PRINT_ERROR' | 'EMBROIDERY_ERROR' | 'DAMAGED_ITEM' | 'MISSING_ITEM'
                    status?: 'OPEN' | 'In_PRODUCTION' | 'RESOLVED' | 'CLOSED'
                    priority?: string
                    items?: Json | null
                    notes?: string | null
                    created_at?: string
                    resolved_at?: string | null
                }
                Update: {
                    id?: string
                    original_order_id?: string | null
                    type?: 'SIZE_EXCHANGE' | 'PRINT_ERROR' | 'EMBROIDERY_ERROR' | 'DAMAGED_ITEM' | 'MISSING_ITEM'
                    status?: 'OPEN' | 'In_PRODUCTION' | 'RESOLVED' | 'CLOSED'
                    priority?: string
                    items?: Json | null
                    notes?: string | null
                    created_at?: string
                    resolved_at?: string | null
                }
            }
        }
    }
}
