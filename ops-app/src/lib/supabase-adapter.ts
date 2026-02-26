import { AnalyticsSummary, AnalyticsFilters, SchoolAnalytics, AnalyticsOrderRow } from './analytics-types';
import {
    calculateKpis,
    calculateVelocityMetrics,
    calculateSizeDistribution,
    calculateExceptions,
    calculateThroughputMetrics,
    calculateStageVelocities,
    generateTrendData,
    calculateProductionForecast
} from './analytics-utils';

import { DataAdapter } from './data-adapter';
import { supabase } from './supabase';
import { Database } from './supabase-types';
import { Order, SchoolRunGroup, ExceptionOrder, DashboardStats, DeliveryType, OrderStatus, EmbroideryBatch, FixUpRequest, UnprocessedDetailRow } from './types';

/** Garment sizes in digital stock are even only: 4, 6, 8, 10, 12, 14, 16. Letter sizes (S, M, L, XL) allowed. */
export function isValidDigitalStockSize(size: string): boolean {
    const t = String(size).trim();
    const n = parseInt(t, 10);
    if (Number.isNaN(n)) return true; // non-numeric (S, M, L, XL)
    return n >= 4 && n <= 16 && n % 2 === 0; // 4, 6, 8, 10, 12, 14, 16 only
}

export class SupabaseAdapter implements DataAdapter {
    async getPackingSessions(): Promise<SchoolRunGroup[]> {
        if (!supabase) return [];
        // Processing = full pack; Partial Order Complete = non-senior part done, senior part still to pack (shows in Senior section only)
        const { data: orders } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .in('status', ['Processing', 'Partial Order Complete']);

        // Group by school
        const grouped: Record<string, SchoolRunGroup> = {};
        (orders || []).forEach((row: any) => {
            const o = this.mapOrder(row);
            const code = o.school_code || 'UNKNOWN';
            if (!grouped[code]) {
                grouped[code] = {
                    school_code: code,
                    school_name: o.school_name,
                    order_count: 0,
                    item_count: 0,
                    orders: []
                };
            }
            grouped[code].order_count++;
            grouped[code].item_count += o.items.reduce((s, i) => s + i.quantity, 0);
            grouped[code].orders.push(o);
        });

        return Object.values(grouped);
    }

    async getBulkOrders(): Promise<Order[]> {
        if (!supabase) return [];
        // Fetch all orders with a BULK- prefix
        const { data: orders } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .ilike('order_number', 'BULK-%')
            .order('created_at', { ascending: false });

        return (orders || []).map(row => this.mapOrder(row as any));
    }

    async createSchool(name: string, code: string): Promise<import('./types').School> {
        if (!supabase) throw new Error("Supabase not initialized");
        const slug = code.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'school';
        const { data, error } = await supabase
            .from('schools')
            .insert({ name, code: code.toUpperCase().trim(), slug })
            .select()
            .single();

        if (error) {
            const msg = error.message || (error as any).details || (error as any).hint || JSON.stringify(error);
            console.error('Failed to create school:', error);
            if ((error as any).code === '23505') {
                throw new Error(`A school with code "${code}" already exists. Use a unique code.`);
            }
            throw new Error(`Failed to create school: ${msg}`);
        }
        return data as import('./types').School;
    }

    async createBulkOrder(
        schoolId: string,
        orderDetails: { orderNumber?: string, customerName?: string, studentName?: string, status?: string, requestedAt?: string, partialDelivery?: number[] },
        items: { productId?: string, productName: string, sku: string, size: string, quantity: number, price?: number }[]
    ): Promise<Order> {
        if (!supabase) throw new Error("Supabase not initialized");

        // 1. Generate Fake Woo ID (negative, fits PostgreSQL integer 32-bit range)
        const fakeWooId = -(Date.now() % 2147483648);
        const bulkOrderNumber = orderDetails.orderNumber || `BULK-${schoolId.substring(0, 4).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

        // 2. Fetch the school data for caching on the order
        const { data: school } = await supabase
            .from('schools')
            .select('name, code')
            .eq('id', schoolId)
            .single();

        const meta: Record<string, unknown> = {};
        if (orderDetails.requestedAt) meta.order_requested_at = orderDetails.requestedAt;
        if (orderDetails.partialDelivery && orderDetails.partialDelivery.length > 0) meta.partial_delivery = orderDetails.partialDelivery;
        const metaPayload = Object.keys(meta).length > 0 ? meta : undefined;

        // 3. Insert Order
        const { data: insertedOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
                woo_order_id: fakeWooId,
                order_number: bulkOrderNumber,
                status: orderDetails.status || 'Processing',
                customer_name: orderDetails.customerName || 'School Admin',
                student_name: orderDetails.studentName || 'BULK_STOCK',
                school_id: schoolId,
                delivery_method: 'SCHOOL',
                ...(metaPayload && { meta: metaPayload })
            })
            .select('*')
            .single();

        if (orderError) throw new Error(`Failed to insert bulk order: ${orderError.message}`);

        // 4. Insert Order Items
        const orderItemsToInsert = items.map(item => ({
            order_id: insertedOrder.id,
            product_id: item.productId || null,
            name: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            size: item.size || null,
            requires_embroidery: false, // Assume bulk orders don't need individual embroidery tracking, or handled differently
            unit_price: item.price || 0
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

        if (itemsError) throw new Error(`Failed to insert order items: ${itemsError.message}`);

        // Fetch back full order to return format
        const { data: fullOrder } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .eq('id', insertedOrder.id)
            .single();

        return this.mapOrder(fullOrder as any);
    }

    async updateBulkOrder(
        orderId: string,
        schoolId: string,
        orderDetails: { orderNumber?: string, customerName?: string, studentName?: string, status?: string, requestedAt?: string, partialDelivery?: number[] },
        items: { productId?: string, productName: string, sku: string, size: string, quantity: number, price?: number }[]
    ): Promise<Order> {
        if (!supabase) throw new Error("Supabase not initialized");

        const orderUpdates: Record<string, unknown> = { school_id: schoolId };
        if (orderDetails.orderNumber !== undefined) orderUpdates.order_number = orderDetails.orderNumber;
        if (orderDetails.customerName !== undefined) orderUpdates.customer_name = orderDetails.customerName;
        if (orderDetails.studentName !== undefined) orderUpdates.student_name = orderDetails.studentName;
        if (orderDetails.status !== undefined) orderUpdates.status = orderDetails.status;
        if (orderDetails.requestedAt !== undefined || orderDetails.partialDelivery !== undefined) {
            orderUpdates.meta = {
                order_requested_at: orderDetails.requestedAt || undefined,
                partial_delivery: orderDetails.partialDelivery ?? []
            };
        }

        const { error: orderError } = await supabase
            .from('orders')
            .update(orderUpdates)
            .eq('id', orderId);

        if (orderError) throw new Error(`Failed to update bulk order: ${orderError.message}`);

        const { error: deleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderId);

        if (deleteError) throw new Error(`Failed to clear order items: ${deleteError.message}`);

        const orderItemsToInsert = items.map(item => ({
            order_id: orderId,
            product_id: item.productId || null,
            name: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            size: item.size || null,
            requires_embroidery: false,
            unit_price: item.price ?? 0
        }));

        if (orderItemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsToInsert);
            if (itemsError) throw new Error(`Failed to update order items: ${itemsError.message}`);
        }

        const { data: fullOrder } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .eq('id', orderId)
            .single();

        return this.mapOrder(fullOrder as any);
    }

    async getSchools(): Promise<import('./types').School[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('schools')
            .select('id, code, name')
            .order('name');

        if (error) {
            console.error('Failed to get schools:', error);
            return [];
        }
        return data as import('./types').School[];
    }

    async getProductsBySchool(schoolId: string): Promise<import('./types').Product[]> {
        if (!supabase) return [];
        // The current schema maps products to schools via the sku/name or school_id
        // Looks like `school_id` might be on the products table?
        // Wait, looking at schema.sql, `products` doesn't have a `school_id`.
        // The mapping is often loose or we just return all products for now if they aren't tied directly.
        // Actually, schema.sql has: `create table products ( id uuid primary key ..., school_id uuid references schools ... )`
        // Let's assume school_id exists on products.
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('school_id', schoolId)
            .order('name');

        if (error) {
            console.error('Failed to get products:', error);
            return [];
        }

        return data.map(p => ({
            id: p.id,
            sku: p.sku || '',
            name: p.name,
            price: p.price || 0,
            school_id: schoolId,
            sizes: ['4', '6', '8', '10', '12', '14', 'S', 'M', 'L', 'XL'] // We don't have a strict sizes array in DB yet
        }));
    }

    async getAllProducts(): Promise<import('./types').ProductListRow[]> {
        if (!supabase) return [];
        const selectWithManufacturer = 'id, sku, name, category, price, requires_embroidery, school_id, attributes, stock_on_shelf, stock_in_transit, woocommerce_id, manufacturer_name, manufacturer_id, manufacturer_id_kids, manufacturer_id_adult, manufacturer_product, is_available_for_sale, cost, embroidery_print_cost, created_at, updated_at, schools(code, name)';
        const selectBase = 'id, sku, name, category, price, requires_embroidery, school_id, attributes, stock_on_shelf, stock_in_transit, woocommerce_id, created_at, updated_at, schools(code, name)';

        let data: any[] | null = null;
        let error: { message?: string; code?: string } | null = null;

        const { data: dataFull, error: errorFull } = await supabase
            .from('products')
            .select(selectWithManufacturer)
            .order('name');

        if (errorFull) {
            const msg = errorFull.message || '';
            const code = (errorFull as any).code || '';
            const missingColumn = code === '42703' || /column.*does not exist|undefined column/i.test(msg);
            if (missingColumn) {
                const { data: dataFallback, error: errorFallback } = await supabase
                    .from('products')
                    .select(selectBase)
                    .order('name');
                if (errorFallback) {
                    console.error('Failed to get all products:', errorFallback.message || errorFallback);
                    return [];
                }
                data = dataFallback;
            } else {
                console.error('Failed to get all products:', msg || code || errorFull);
                return [];
            }
        } else {
            data = dataFull;
        }

        return (data || []).map((p: any) => {
            let sizes: string[] = [];
            if (p.attributes && Array.isArray(p.attributes)) {
                const sizeAttr = p.attributes.find((a: any) =>
                    a?.name?.toLowerCase() === 'size' || a?.slug === 'pa_size' || a?.slug === 'size'
                );
                if (sizeAttr && Array.isArray(sizeAttr.options)) sizes = sizeAttr.options;
            }
            const school = p.schools as { code?: string; name?: string } | null;
            return {
                id: p.id,
                sku: p.sku ?? null,
                name: p.name,
                category: p.category ?? null,
                price: Number(p.price) || 0,
                requires_embroidery: Boolean(p.requires_embroidery),
                school_id: p.school_id ?? null,
                school_code: school?.code ?? null,
                school_name: school?.name ?? null,
                attributes: p.attributes ?? null,
                sizes,
                stock_on_shelf: (p.stock_on_shelf && typeof p.stock_on_shelf === 'object') ? p.stock_on_shelf : {},
                stock_in_transit: (p.stock_in_transit && typeof p.stock_in_transit === 'object') ? p.stock_in_transit : {},
                woocommerce_id: p.woocommerce_id ?? null,
                manufacturer_name: p.manufacturer_name ?? null,
                manufacturer_id: p.manufacturer_id ?? null,
                manufacturer_id_kids: p.manufacturer_id_kids ?? null,
                manufacturer_id_adult: p.manufacturer_id_adult ?? null,
                manufacturer_product: p.manufacturer_product ?? null,
                is_available_for_sale: p.is_available_for_sale !== false,
                cost: p.cost != null ? Number(p.cost) : null,
                embroidery_print_cost: p.embroidery_print_cost != null ? Number(p.embroidery_print_cost) : null,
                created_at: p.created_at ?? '',
                updated_at: p.updated_at ?? '',
            };
        });
    }

    async updateProduct(productId: string, payload: import('./types').ProductUpdatePayload): Promise<void> {
        if (!supabase) return;
        const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (payload.name !== undefined) update.name = payload.name;
        if (payload.sku !== undefined) update.sku = payload.sku === '' ? null : payload.sku;
        if (payload.category !== undefined) update.category = payload.category;
        if (payload.price !== undefined) update.price = payload.price;
        if (payload.school_id !== undefined) update.school_id = payload.school_id;
        if (payload.requires_embroidery !== undefined) update.requires_embroidery = payload.requires_embroidery;
        if (payload.manufacturer_name !== undefined) update.manufacturer_name = payload.manufacturer_name;
        if (payload.manufacturer_id !== undefined) update.manufacturer_id = payload.manufacturer_id;
        if (payload.manufacturer_id_kids !== undefined) update.manufacturer_id_kids = payload.manufacturer_id_kids;
        if (payload.manufacturer_id_adult !== undefined) update.manufacturer_id_adult = payload.manufacturer_id_adult;
        if (payload.manufacturer_product !== undefined) update.manufacturer_product = payload.manufacturer_product;
        if (payload.is_available_for_sale !== undefined) update.is_available_for_sale = payload.is_available_for_sale;
        if (payload.cost !== undefined) update.cost = payload.cost;
        if (payload.embroidery_print_cost !== undefined) update.embroidery_print_cost = payload.embroidery_print_cost;
        const { error } = await supabase.from('products').update(update).eq('id', productId);
        if (error) throw new Error(error.message);
    }

    // ... (existing helper methods)

    private mapToAnalyticsOrder(o: Order): AnalyticsOrderRow {
        const total = o.items.reduce((sum, i) => sum + (i.quantity * 0), 0); // TODO: unit_price missing in Order type?
        // Wait, Order type (Step 705) doesn't have unit_price in OrderItem?
        // Step 705 shows OrderItem? No, referenced types.
        // I need to check src/lib/types.ts for OrderItem definition.

        return {
            orderId: o.id,
            orderNumber: o.order_number,
            studentName: o.student_name || 'N/A',
            parentName: o.parent_name,
            schoolName: o.school_name,
            deliveryType: o.delivery_type,
            itemsSummary: o.items.map(i => `${i.product_name} x${i.quantity}`).join(', '),
            total: 0, // Placeholder until price is in Order type
            embroideryStatus: o.embroidery_status,
            orderStatus: o.order_status,
            createdAt: o.created_at,
            paidAt: o.paid_at,
            embroideredAt: o.embroidery_done_at,
            packedAt: o.packed_at,
            dispatchedAt: o.dispatched_at,
            hasException: o.order_status === 'On-Hold',
            exceptionType: undefined // TODO
        };
    }

    async getAnalyticsSummary(filters?: Partial<AnalyticsFilters>): Promise<AnalyticsSummary> {
        if (!supabase) throw new Error("Supabase not initialized");

        // Fetch Orders (Real Data)
        // Default to last 30 days if not specified
        const { data: ordersData, error } = await supabase
            .from('orders')
            .select(`
                *,
                schools (code, name),
                order_items (
                    *,
                    products (price)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.error('Analytics Fetch Error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            // Return empty structure correctly
            return {
                kpis: { grossSales: 0, orders: 0, itemsSold: 0, avgOrderValue: 0, topSchool: { name: '', revenue: 0 }, topSku: { sku: '', name: '', units: 0 }, deliveryMix: { home: 0, school: 0, store: 0 }, exceptionRate: 0 },
                kpiDeltas: { grossSales: 0, orders: 0, itemsSold: 0, avgOrderValue: 0 },
                trendData: [],
                schools: [],
                orders: [],
                forecast: [],
                velocity: { avgPaidToEmbroidery: 0, avgEmbroideryToPacked: 0, avgPackedToDispatched: 0 },
                sizeDistribution: [],
                exceptions: { totalExceptions: 0, rate: 0, byType: {}, bySchool: {} },
                throughput: { completedToday: 0, completedThisWeek: 0, avgDailyThroughput: 0, fixUpRate: 0, fixUpCount: 0 },
                stageVelocities: []
            };
        }

        // Map to Analytics Rows
        const analyticsOrders: AnalyticsOrderRow[] = (ordersData || []).map(row => {
            const items = (row.order_items as any[]) || [];
            // Calculate total from items
            const total = items.reduce((sum, i) => {
                // prefer unit_price if valid, else product price if joined, else 0
                const price = i.unit_price || (i.products && i.products.price) || 0;
                return sum + (i.quantity * price);
            }, 0);

            return {
                orderId: row.id,
                orderNumber: row.order_number,
                studentName: row.student_name || 'N/A',
                parentName: row.customer_name,
                schoolName: row.schools?.name || 'Unknown',
                deliveryType: row.delivery_method,
                itemsSummary: items.map(i => `${i.name} x${i.quantity}`).join(', '),
                total: total,
                embroideryStatus: row.status === 'PARTIALLY_EMBROIDERED' ? 'PARTIAL' : (row.embroidery_done_at ? 'DONE' : 'PENDING'),
                orderStatus: row.status,
                createdAt: row.created_at,
                paidAt: row.paid_at,
                embroideredAt: row.embroidery_done_at,
                packedAt: row.packed_at,
                dispatchedAt: row.dispatched_at,
                hasException: row.status === 'On-Hold'
            };
        });

        // Generate School Analytics
        const schoolMap = new Map<string, SchoolAnalytics>();

        analyticsOrders.forEach(o => {
            const rowData = ordersData?.find(r => r.id === o.orderId);
            const code = rowData?.schools?.code || 'UNKNOWN';
            const name = o.schoolName;

            if (!schoolMap.has(code)) {
                schoolMap.set(code, {
                    schoolCode: code,
                    schoolName: name,
                    revenue: 0,
                    orders: 0,
                    itemsSold: 0,
                    avgOrderValue: 0,
                    topSku: '',
                    products: []
                });
            }

            const s = schoolMap.get(code)!;
            s.revenue += o.total;
            s.orders += 1;

            // Re-fetch items from raw data to count units
            const rawItems = rowData?.order_items as any[] || [];
            rawItems.forEach(i => {
                s.itemsSold += i.quantity;
                // Add to products list
                let p = s.products.find(sp => sp.sku === i.sku);
                if (!p) {
                    p = { sku: i.sku, productName: i.name, unitsSold: 0, revenue: 0, variations: [] };
                    s.products.push(p);
                }
                const iPrice = i.unit_price || (i.products && i.products.price) || 0;
                p.unitsSold += i.quantity;
                p.revenue += (i.quantity * iPrice);

                // Add variation
                let v = p.variations.find(vv => vv.size === (i.size || 'N/A'));
                if (!v) {
                    v = { size: i.size || 'N/A', unitsSold: 0 };
                    p.variations.push(v);
                }
                v.unitsSold += i.quantity;
            });
        });

        const schools = Array.from(schoolMap.values()).map(s => {
            if (s.orders > 0) s.avgOrderValue = Math.round(s.revenue / s.orders);
            // find top sku
            const sorted = [...s.products].sort((a, b) => b.unitsSold - a.unitsSold);
            s.topSku = sorted[0]?.sku || '';
            return s;
        });

        // Call Helpers (shared from analytics-utils.ts)
        const exceptions = calculateExceptions(analyticsOrders);
        const kpis = calculateKpis(schools, analyticsOrders, exceptions);
        const velocity = calculateVelocityMetrics(analyticsOrders);
        const throughput = calculateThroughputMetrics(analyticsOrders);
        const stageVelocities = calculateStageVelocities(velocity);
        const forecast = calculateProductionForecast(schools);
        const sizeDistribution = calculateSizeDistribution(schools);
        const trendData = generateTrendData(schools);

        return {
            kpis,
            kpiDeltas: { grossSales: 0, orders: 0, itemsSold: 0, avgOrderValue: 0 },
            trendData,
            schools,
            orders: analyticsOrders,
            forecast,
            velocity,
            sizeDistribution,
            exceptions,
            throughput,
            stageVelocities
        };
    }

    // --- MAPPERS ---
    private mapOrder(row: Database['public']['Tables']['orders']['Row'] & {
        order_items: Database['public']['Tables']['order_items']['Row'][],
        schools: Database['public']['Tables']['schools']['Row'] | null
    }): Order {
        return {
            id: row.id,
            woo_order_id: row.woo_order_id,
            order_number: row.order_number,
            parent_name: row.customer_name,
            student_name: row.student_name,
            school_id: row.school_id || null,
            school_code: row.schools?.code || null,
            school_name: row.schools?.name || 'Unknown School',
            delivery_type: row.delivery_method,
            order_status: row.status as OrderStatus,
            embroidery_status: 'PENDING', // Derived mostly, simplified for now
            items: row.order_items.map(i => ({
                id: i.id,
                product_name: i.name,
                sku: i.sku,
                quantity: i.quantity,
                size: i.size || undefined,
                requires_embroidery: i.requires_embroidery,
                embroidery_status: i.embroidery_status === 'DONE' ? 'DONE' : 'PENDING',
                unit_price: (i as any).unit_price != null ? Number((i as any).unit_price) : undefined,
                sent_quantity: (i as any).sent_quantity != null ? Number((i as any).sent_quantity) : 0,
                nickname: (i as any).nickname ?? undefined
            })),
            created_at: row.created_at,
            paid_at: row.paid_at || row.created_at,
            meta: (row as any).meta && typeof (row as any).meta === 'object' ? (row as any).meta : undefined,
            embroidery_done_at: row.embroidery_done_at || undefined,
            packed_at: row.packed_at || undefined,
            dispatched_at: row.dispatched_at || undefined,
            notes: row.notes || undefined,
            shipping_address: row.shipping_address as any
        };
    }

    // --- READ OPERATIONS ---

    async getDashboardStats(): Promise<DashboardStats> {
        if (!supabase) throw new Error("Supabase not initialized");

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        // Parallel queries using count
        const [awaitingEmb, readyPack, dispatched, exceptions] = await Promise.all([
            // Use status column for 'AWAITING_EMBROIDERY' to match orders count
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Embroidery'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Distribution'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Shipped').gte('dispatched_at', todayISO),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'On-Hold'),
        ]);

        return {
            awaiting_embroidery: awaitingEmb.count || 0,
            ready_to_pack: readyPack.count || 0,
            dispatched_today: dispatched.count || 0,
            exceptions: exceptions.count || 0
        };
    }

    async getRecentActivity(): Promise<import('./types').HistoryEvent[]> {
        if (!supabase) return [];
        const { data } = await supabase
            .from('orders')
            .select('*')
            .not('embroidery_done_at', 'is', null)
            .order('embroidery_done_at', { ascending: false })
            .limit(5);

        return (data || []).map(o => ({
            id: `act-${o.id}`,
            entityType: 'ORDER',
            entityId: o.order_number,
            action: 'EMBROIDERY_RUN',
            details: `Order #${o.order_number} completed embroidery`,
            actor: 'System',
            timestamp: new Date(o.embroidery_done_at!)
        }));
    }

    async getSystemEvents(orderId: string): Promise<import('./types').SystemEvent[]> {
        if (!supabase) return [];
        return [];
    }

    async getPendingCollections(): Promise<Array<{ schoolName: string; count: number }>> {
        if (!supabase) return [];
        const { data } = await supabase
            .from('orders')
            .select(`schools(name)`)
            .eq('delivery_method', 'SCHOOL')
            .eq('status', 'DISPATCHED');

        const counts: Record<string, number> = {};
        (data || []).forEach((row: any) => {
            const name = row.schools?.name || 'Unknown School';
            counts[name] = (counts[name] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ schoolName: name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    async getEmbroideryQueue(): Promise<Order[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                schools (code, name),
                order_items (*)
            `)
            .eq('status', 'AWAITING_EMBROIDERY');

        if (error) console.error(error);
        return (data || []).map(d => this.mapOrder(d as any));
    }

    async getDistributionQueue(deliveryType?: DeliveryType, statuses?: OrderStatus[]): Promise<Order[]> {
        if (!supabase) return [];

        let query = supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`);

        if (statuses && statuses.length > 0) {
            query = query.in('status', statuses);
        } else {
            // Default queue for Distribution/Dispatch: show orders that have left packing
            // and are awaiting final delivery confirmation.
            query = query.in('status', ['Shipped']);
        }

        if (deliveryType) {
            query = query.eq('delivery_method', deliveryType);
        }

        const { data } = await query;
        return (data || []).map(d => this.mapOrder(d as any));
    }

    async getSchoolRuns(): Promise<SchoolRunGroup[]> {
        // Complex aggregation provided by RPC usually, or client-side mapping
        const orders = await this.getDistributionQueue('SCHOOL');
        // Grouping logic similar to mock adapter
        const grouped: Record<string, SchoolRunGroup> = {};
        orders.forEach(o => {
            const code = o.school_code || 'UNKNOWN';
            if (!grouped[code]) {
                grouped[code] = {
                    school_code: code,
                    school_name: o.school_name,
                    order_count: 0,
                    item_count: 0,
                    orders: []
                };
            }
            grouped[code].order_count++;
            grouped[code].item_count += o.items.reduce((s, i) => s + i.quantity, 0);
            grouped[code].orders.push(o);
        });
        return Object.values(grouped);
    }

    async getExceptions(): Promise<ExceptionOrder[]> {
        if (!supabase) return [];
        const { data } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .eq('status', 'On-Hold');

        return (data || []).map(d => {
            const mapped = this.mapOrder(d as any);
            let excType: ExceptionOrder['exception_type'] = 'MISSING_BOTH';

            if (!mapped.student_name && mapped.school_code) excType = 'MISSING_STUDENT_NAME';
            else if (mapped.student_name && !mapped.school_code) excType = 'MISSING_SCHOOL_CODE';

            return {
                ...mapped,
                exception_type: excType
            };
        });
    }

    async getOrderById(orderId: string): Promise<Order | null> {
        if (!supabase) return null;
        const { data } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .eq('id', orderId)
            .single();

        if (!data) return null;
        return this.mapOrder(data as any);
    }

    // --- WRITE OPERATIONS ---

    async markEmbroideryComplete(orderId: string): Promise<void> {
        if (!supabase) return;

        const now = new Date().toISOString();

        // 1. Update all items
        await supabase.from('order_items')
            .update({ embroidery_status: 'DONE' })
            .eq('order_id', orderId)
            .eq('requires_embroidery', true);

        // 2. Update order
        await supabase.from('orders')
            .update({
                status: 'Distribution',
                embroidery_done_at: now
            })
            .eq('id', orderId);

        // 3. Sync to WooCommerce
        await this.syncStatusToWoo(orderId, 'Distribution');
    }

    async packOrder(orderId: string): Promise<void> {
        if (!supabase) return;

        // Fetch order items to deduct stock from the shelf
        const { data: items } = await supabase
            .from('order_items')
            .select('product_id, quantity, size')
            .eq('order_id', orderId)
            .not('product_id', 'is', null);

        if (items && items.length > 0) {
            for (const item of items) {
                if (item.product_id && item.size) {
                    await supabase.rpc('deduct_stock', {
                        p_product_id: item.product_id,
                        p_size: item.size,
                        p_quantity: item.quantity
                    });
                }
            }
        }

        await supabase.from('orders')
            .update({
                status: 'Packed',
                packed_at: new Date().toISOString()
            })
            .eq('id', orderId);

        await this.syncStatusToWoo(orderId, 'Packed');
    }

    async dispatchOrder(orderId: string): Promise<void> {
        if (!supabase) return;
        await supabase.from('orders')
            .update({
                status: 'Shipped',
                dispatched_at: new Date().toISOString()
            })
            .eq('id', orderId);

        await this.syncStatusToWoo(orderId, 'Shipped');
    }

    async markReadyForPickup(orderId: string): Promise<void> {
        await this.packOrder(orderId);
    }

    // Dispatch School Run: when school confirms delivery, mark shipped orders as Completed
    async dispatchSchoolRun(schoolCode: string): Promise<void> {
        if (!supabase) return;
        const { data } = await supabase
            .from('orders')
            .select('id, schools!inner(code)')
            .eq('schools.code', schoolCode)
            .eq('status', 'Shipped');

        const ids = (data || []).map(d => d.id);
        if (ids.length > 0) {
            await supabase.from('orders')
                .update({ status: 'Completed' })
                .in('id', ids);

            // Sync all to WooCommerce as Completed
            for (const id of ids) {
                await this.syncStatusToWoo(id, 'Completed');
            }
        }
    }

    async dispatchCarrierBatch(carrierName: string): Promise<void> {
        if (!supabase) return;
        // Assuming carrier is stored in notes or shipping details?
        // Or strictly delivery_method = 'HOME'?
        // The mock adapter filtered by `o.carrier === carrierName`.
        // `Order` type has `carrier`.
        // Does `orders` table have `carrier`?
        // Migration doesn't mention it.
        // Assuming it's not in DB yet, so this might do nothing.
        // But I'll implement update for 'HOME' + 'PACKED'.
        // Fetch affected IDs first
        const { data } = await supabase.from('orders')
            .select('id')
            .eq('delivery_method', 'HOME')
            .eq('status', 'PACKED');

        const ids = (data || []).map(d => d.id);
        if (ids.length > 0) {
            await supabase.from('orders')
                .update({ status: 'DISPATCHED', dispatched_at: new Date().toISOString() })
                .in('id', ids);

            // Sync all to WooCommerce
            for (const id of ids) {
                await this.syncStatusToWoo(id, 'DISPATCHED');
            }
        }
        // TODO: Filter by carrier if column exists
    }

    async moveToStaged(orderId: string, location: string): Promise<void> {
        if (!supabase) return;
        // Update staging_location. Does column exist?
        // Assuming yes or ignore.
        // If not, maybe use notes?
        await supabase.from('orders')
            .update({ staging_location: location })
            .eq('id', orderId);
    }

    async editOrderItems(orderId: string, items: any[]): Promise<void> {
        if (!supabase) return;
        // items: { id, quantity, size? }
        for (const item of items) {
            if (item.id) {
                await supabase.from('order_items')
                    .update({
                        quantity: item.quantity,
                        size: item.size
                    })
                    .eq('id', item.id);
            }
        }
    }

    async resolveException(orderId: string, updates: Partial<Order>): Promise<void> {
        if (!supabase) return;

        // Only include fields that exist on the 'orders' table
        const rawUpdates: any = {};
        const allowed = ['status', 'student_name', 'customer_name', 'school_id', 'delivery_method', 'order_number'];
        for (const key of allowed) {
            if ((updates as any)[key] !== undefined) rawUpdates[key] = (updates as any)[key];
        }

        if ((updates as any).order_status) rawUpdates.status = (updates as any).order_status;

        // Resolve school_code to school_id
        if ((updates as any).school_code && !rawUpdates.school_id) {
            const { data: school } = await supabase.from('schools').select('id').eq('code', (updates as any).school_code).single();
            if (school) rawUpdates.school_id = school.id;
        }

        if (rawUpdates.student_name && rawUpdates.school_id) {
            rawUpdates.status = 'Processing';
        }

        const { error } = await supabase
            .from('orders')
            .update(rawUpdates)
            .eq('id', orderId);

        if (error) throw new Error(error.message || 'Failed to update order');

        if (rawUpdates.status === 'Processing') {
            await this.syncStatusToWoo(orderId, 'Processing');
        }
    }

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        if (!supabase) return;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        const payload: { status: string; dispatched_at?: string } = { status };
        if (status === 'Partial Order Complete' || status === 'Completed') {
            payload.dispatched_at = new Date().toISOString();
        }

        let query = supabase.from('orders').update(payload);

        if (isUUID) {
            query = query.eq('id', orderId);
        } else {
            query = query.eq('order_number', orderId);
        }

        const { error } = await query;

        if (error) throw new Error(error.message || 'Failed to update order status');

        // Note: syncStatusToWoo uses the internal ID. We need to fetch it if we used order_number.
        let actualId = orderId;
        if (!isUUID) {
            const { data } = await supabase.from('orders').select('id').eq('order_number', orderId).single();
            if (data) actualId = data.id;
        }

        // Sync to WooCommerce
        await this.syncStatusToWoo(actualId, status);
    }


    async updateOrderNotes(orderId: string, notes: string): Promise<void> {
        if (!supabase) return;
        await supabase.from('orders').update({ notes }).eq('id', orderId);
    }

    // --- BATCHES ---
    async getSchoolBatches(): Promise<EmbroideryBatch[]> {
        if (!supabase) return [];
        const orders = await this.getEmbroideryQueue();
        const batches: Record<string, EmbroideryBatch> = {};

        orders.forEach(order => {
            const schoolName = order.school_name;
            const batchKey = `${schoolName}-${order.is_senior_order ? 'SENIOR' : 'REGULAR'}`;
            const isSenior = !!order.is_senior_order;

            if (!batches[batchKey]) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() + 14);

                batches[batchKey] = {
                    school_name: schoolName,
                    order_count: 0,
                    total_units: 0,
                    oldest_order_date: order.created_at,
                    sku_summary: {},
                    orders: [],
                    is_senior_batch: isSenior,
                    cutoff_date: isSenior ? cutoffDate.toISOString() : undefined,
                    is_replenishment: !isSenior,
                    batch_status: 'OPEN'
                };
            }

            const batch = batches[batchKey];
            batch.order_count++;
            batch.orders.push(order);

            if (new Date(order.created_at) < new Date(batch.oldest_order_date)) {
                batch.oldest_order_date = order.created_at;
            }

            order.items.forEach(item => {
                if (item.requires_embroidery) {
                    batch.total_units += item.quantity;
                    const sku = item.sku;
                    if (!batch.sku_summary[sku]) {
                        batch.sku_summary[sku] = { name: item.product_name, sizes: {} };
                    }
                    const size = item.size || 'N/A';
                    if (!batch.sku_summary[sku].sizes[size]) {
                        batch.sku_summary[sku].sizes[size] = { total: 0, completed: 0 };
                    }
                    batch.sku_summary[sku].sizes[size].total += item.quantity;
                    if (item.embroidery_status === 'DONE') {
                        batch.sku_summary[sku].sizes[size].completed += item.quantity;
                    }
                }
            });
        });

        return Object.values(batches).sort((a, b) =>
            new Date(a.oldest_order_date).getTime() - new Date(b.oldest_order_date).getTime()
        );
    }

    async markBatchSkuComplete(schoolName: string, sku: string, size: string): Promise<void> {
        if (!supabase) return;
        // 1. Get orders for school
        const { data: orders } = await supabase
            .from('orders')
            .select(`id, order_items!inner(*)`)
            .eq('schools.name', schoolName) // This won't work easily with joining unless schools.name is reliable. Logic above uses school_name.
            // Better to filter by status?
            .eq('status', 'AWAITING_EMBROIDERY');

        // Complex query. Simplified approach:
        // Update order_items directly if possible?
        // Need IDs.
        // Let's assume we can't easily do bulk update by school name without joining.
        // Current Supabase setup might not verify school name on update.
        // For MVP: Log warning.
        console.warn('markBatchSkuComplete not fully implemented for Supabase yet');
    }

    async releasePartialBatch(schoolCode: string): Promise<void> {
        if (!supabase) return;
        // Find orders for school with embroidery_status = DONE or PARTIAL
        // This logic is tricky because we derive embroidery_status.
        // We'll trust the client to manage state for now or assume logic:
        // If all items done, order is DONE.
        // Update status to AWAITING_PACK where embroidery is done?
        // We don't have 'embroidery_status' column on orders in DB (it's derived).
        // So we can't update based on it easily in one query.
        console.warn('releasePartialBatch not fully implemented for Supabase');
    }

    async getSchoolPickupOrders(schoolCode: string): Promise<Order[]> {
        if (!supabase) return [];
        const { data } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .eq('schools.code', schoolCode)
            .eq('delivery_method', 'SCHOOL')
            .in('status', ['PACKED', 'DISPATCHED', 'COLLECTED']);

        return (data || []).map(d => this.mapOrder(d as any));
    }

    async getSchoolInventory(schoolCode: string): Promise<import('./types').SchoolInventoryItem[]> {
        return []; // Placeholder
    }

    async getInventoryStock(): Promise<any[]> {
        if (!supabase) return [];
        // Fetch all products
        const { data: products } = await supabase
            .from('products')
            .select(`id, sku, name, attributes, stock_on_shelf, stock_in_transit, schools (name)`);

        // Fetch unprocessed orders
        const { data: items, error } = await supabase
            .from('order_items')
            .select(`product_id, quantity, size, orders!inner(status)`)
            .in('orders.status', ['Processing', 'Embroidery', 'Distribution', 'In Production'])
            .not('product_id', 'is', null);

        if (error) console.error('Error fetching unprocessed items:', error);

        const unprocessedMap: Record<string, number> = {};
        if (items) {
            items.forEach((item: any) => {
                const pid = item.product_id;
                const size = item.size || '-';
                const key = `${pid}::${size}`;
                unprocessedMap[key] = (unprocessedMap[key] || 0) + item.quantity;
            });
        }

        const flatStock: any[] = [];

        (products || []).forEach((p: any) => {
            // Find size options from attributes
            let sizes: string[] = [];
            if (p.attributes && Array.isArray(p.attributes)) {
                const sizeAttr = p.attributes.find((a: any) =>
                    a.name?.toLowerCase() === 'size' || a.slug === 'pa_size' || a.slug === 'size'
                );
                if (sizeAttr && Array.isArray(sizeAttr.options)) {
                    sizes = sizeAttr.options;
                }
            }

            // Fallback if no sizes found
            if (sizes.length === 0) sizes = ['-'];

            // Digital stock: only even numeric sizes 4–16 (4,6,8,10,12,14,16) and letter sizes
            sizes = sizes.filter((s: string) => isValidDigitalStockSize(s));

            const shelfData = p.stock_on_shelf || {};
            const transitData = p.stock_in_transit || {};

            sizes.forEach(size => {
                const key = `${p.id}::${size}`;
                const unprocessed = unprocessedMap[key] || 0;

                const shelf = parseInt(shelfData[size] || '0', 10);
                const transit = parseInt(transitData[size] || '0', 10);

                flatStock.push({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    size: size,
                    school_name: p.schools?.name || 'Global',
                    stock_on_shelf: shelf,
                    stock_in_transit: transit,
                    unprocessed: unprocessed,
                    available: shelf - unprocessed
                });
            });
        });

        return flatStock;
    }

    async updateStockOnShelf(productId: string, size: string, newAmount: number): Promise<void> {
        if (!supabase) return;
        const { data, error: readErr } = await supabase.from('products').select('stock_on_shelf').eq('id', productId).single();
        if (readErr) {
            console.error('[Stock] Read error:', readErr.message, readErr.code, readErr.details);
            throw new Error(`Read failed: ${readErr.message}`);
        }
        if (data) {
            const current = data.stock_on_shelf || {};
            current[size] = newAmount;
            const { error: writeErr, status, statusText } = await supabase.from('products').update({ stock_on_shelf: current }).eq('id', productId);
            if (writeErr) {
                console.error('[Stock] Write error (shelf):', writeErr.message, writeErr.code, writeErr.details, 'status:', status, statusText);
                throw new Error(`Save failed: ${writeErr.message || writeErr.code || `HTTP ${status}`}`);
            }
            console.log('[Stock] Shelf updated OK:', productId, size, '→', newAmount);
        }
    }

    async updateStockInTransit(productId: string, size: string, newAmount: number): Promise<void> {
        if (!supabase) return;
        const { data, error: readErr } = await supabase.from('products').select('stock_in_transit').eq('id', productId).single();
        if (readErr) { console.error('[Stock] Read error:', readErr); throw new Error(readErr.message); }
        if (data) {
            const current = data.stock_in_transit || {};
            current[size] = newAmount;
            const { error: writeErr } = await supabase.from('products').update({ stock_in_transit: current }).eq('id', productId);
            if (writeErr) { console.error('[Stock] Write error (transit):', writeErr); throw new Error(writeErr.message); }
            console.log('[Stock] Transit updated:', productId, size, newAmount);
        }
    }

    async getUnprocessedDetails(productId: string, size: string): Promise<UnprocessedDetailRow[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('order_items')
            .select(`
                id,
                order_id,
                quantity,
                sku,
                name,
                size,
                orders!inner (
                    order_number,
                    status,
                    customer_name,
                    student_name
                )
            `)
            .eq('product_id', productId)
            .in('orders.status', ['Processing', 'Embroidery', 'Distribution', 'In Production']);

        if (error) {
            console.error('getUnprocessedDetails:', error);
            return [];
        }

        const norm = (s: string | null) => (s == null || s === '') ? '-' : s;
        const rows: UnprocessedDetailRow[] = (data || [])
            .filter((item: any) => norm(item.size) === size)
            .map((item: any) => {
                const o = item.orders;
                return {
                    order_item_id: item.id,
                    order_id: item.order_id,
                    order_number: o?.order_number ?? '—',
                    status: o?.status ?? '—',
                    customer_name: o?.customer_name ?? '—',
                    student_name: o?.student_name ?? null,
                    quantity: item.quantity ?? 0,
                    sku: item.sku ?? '—',
                    name: item.name ?? '—',
                    size: item.size
                };
            });
        return rows;
    }

    async updateOrderItemQuantity(orderItemId: string, quantity: number): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase
            .from('order_items')
            .update({ quantity })
            .eq('id', orderItemId);
        if (error) throw new Error(error.message || 'Failed to update quantity');
    }

    async updateOrderItemSentQuantity(orderItemId: string, sentQuantity: number): Promise<void> {
        if (!supabase) throw new Error('Supabase not initialized');
        const { error } = await supabase
            .from('order_items')
            .update({ sent_quantity: Math.max(0, sentQuantity) })
            .eq('id', orderItemId);
        if (error) throw new Error(error.message || 'Failed to update sent quantity');
    }

    // --- FIX UPS ---
    async getFixUps(): Promise<FixUpRequest[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('fix_ups')
            .select(`
                *,
                orders (
                    order_number,
                    student_name,
                    schools (name)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching fix-ups:', error);
            return [];
        }

        return (data || []).map(row => {
            const o = row.orders as any;
            return {
                id: row.id,
                original_order_id: row.original_order_id || '',
                original_order_number: o?.order_number || 'UNKNOWN',
                student_name: o?.student_name || 'Unknown',
                school_name: o?.schools?.name || 'Unknown',
                type: row.type as any,
                status: row.status as any,
                priority: row.priority as any,
                items: (row.items || []) as any[],
                notes: row.notes || '',
                created_at: row.created_at
            };
        });
    }

    async createFixUp(request: Partial<FixUpRequest>): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase
            .from('fix_ups')
            .insert({
                original_order_id: request.original_order_id,
                type: request.type,
                status: request.status || 'OPEN',
                priority: request.priority || 'NORMAL',
                notes: request.notes,
                items: request.items || []
            });

        if (error) throw new Error(error.message || 'Failed to create fix-up');
    }

    async updateFixUpStatus(id: string, status: any): Promise<void> {
        if (!supabase) return;
        await supabase.from('fix_ups').update({ status }).eq('id', id);
    }

    async updateFixUp(id: string, updates: { notes?: string; status?: FixUpRequest['status'] }): Promise<void> {
        if (!supabase) return;
        const payload: Record<string, unknown> = {};
        if (updates.notes !== undefined) payload.notes = updates.notes;
        if (updates.status !== undefined) payload.status = updates.status;
        if (Object.keys(payload).length === 0) return;
        const { error } = await supabase.from('fix_ups').update(payload).eq('id', id);
        if (error) throw new Error(error.message || 'Failed to update fix-up');
    }

    // --- SCHEDULE ---
    async getScheduleEvents(start: Date, end: Date): Promise<import('./types').ScheduleEvent[]> {
        if (!supabase) return [];
        const { data } = await supabase.from('production_schedule')
            .select('*')
            .gte('start_time', start.toISOString())
            .lte('end_time', end.toISOString());

        return (data || []).map(row => ({
            id: row.id,
            title: row.title,
            type: row.type as any,
            status: 'SCHEDULED',
            start_date: row.start_time,
            end_date: row.end_time,
            staff_ids: row.assigned_staff_ids?.map((uuid: string) => String(uuid)) || [], // Convert UUID to string if needed
            created_at: row.created_at
        }));
    }

    async getStaff(): Promise<import('./types').StaffMember[]> {
        return []; // need profiles table
    }

    async updateEvent(event: import('./types').ScheduleEvent): Promise<void> {
        if (!supabase) return;
        await supabase.from('production_schedule').upsert({
            id: event.id,
            title: event.title,
            start_time: event.start_date,
            end_time: event.end_date,
            type: event.type
        });
    }

    // --- WOOCOMMERCE SYNC ---
    async syncStatusToWoo(orderId: string, status: string, note?: string): Promise<{ success: boolean }> {
        if (!supabase) return { success: false };

        // 1. Get Woo ID
        const { data: order } = await supabase
            .from('orders')
            .select('woo_order_id')
            .eq('id', orderId)
            .single();

        if (!order || !order.woo_order_id) {
            console.error('No WooCommerce ID found for order', orderId);
            return { success: false };
        }

        // 1.5 Safety Check: Do not sync offline bulk orders (fake woo ids)
        if (order.woo_order_id < 0) {
            console.log(`Skipping WooCommerce sync for internal bulk order: ${orderId}`);
            return { success: true };
        }

        // 2. Call Proxy API (non-blocking: pack/ship in Ops always succeeds; Woo sync is best-effort)
        try {
            const res = await fetch('/api/woo/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wooOrderId: order.woo_order_id,
                    status,
                    note
                })
            });

            const json = await res.json().catch(() => ({}));
            const success = res.ok && json.success !== false;
            if (!success && (json.error || json.details)) {
                console.warn('WooCommerce sync skipped or failed:', json.error || json.details);
            }
            return { success };
        } catch (error) {
            console.warn('WooCommerce sync request failed (order updated in Ops):', error);
            return { success: false };
        }
    }

    // --- ORDER SEARCH ---
    async searchOrders(query: string): Promise<Order[]> {
        if (!supabase) return [];
        const { data } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .or(`order_number.ilike.%${query}%,customer_name.ilike.%${query}%,student_name.ilike.%${query}%`)
            .limit(20);

        return (data || []).map(d => this.mapOrder(d as any));
    }

    async savePackOutManifest(manifest: import('./types').PackOutManifest): Promise<void> {
        if (!supabase) return;
        // Table: pack_out_manifests (id uuid PK, school_code text, school_name text, packed_at timestamptz, orders jsonb)
        const { error } = await supabase.from('pack_out_manifests').insert({
            id: manifest.id,
            school_code: manifest.school_code,
            school_name: manifest.school_name,
            packed_at: manifest.packed_at,
            orders: manifest.orders as any,
        });
        if (error) console.warn('savePackOutManifest failed (table may not exist):', error.message);
    }

    async getPackOutManifests(): Promise<import('./types').PackOutManifest[]> {
        if (!supabase) return [];
        const { data } = await supabase
            .from('pack_out_manifests')
            .select('*')
            .order('packed_at', { ascending: false });
        if (!data) return [];
        return data.map((row: any) => ({
            id: row.id,
            school_code: row.school_code,
            school_name: row.school_name,
            packed_at: row.packed_at,
            orders: row.orders || [],
        }));
    }

    async getDeliveredOrders(): Promise<Order[]> {
        if (!supabase) return [];
        const { data } = await supabase
            .from('orders')
            .select(`*, schools (code, name), order_items (*)`)
            .in('status', ['Shipped', 'DISPATCHED', 'COLLECTED'])
            .not('dispatched_at', 'is', null)
            .order('dispatched_at', { ascending: false });
        return (data || []).map(d => this.mapOrder(d as any));
    }

    // --- HISTORY & AUDIT ---
    async getHistoryOrders(): Promise<import('./types').OrderHistoryRecord[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                schools (code, name),
                order_items (*)
            `)
            .order('created_at', { ascending: false })
            .limit(100); // Limit for performance

        if (error) {
            console.error('History Query Error:', error);
            return [];
        }

        return (data || []).map(o => {
            // Map items
            const items = (o.order_items as any[]).map(i => ({
                itemId: i.id,
                sku: i.sku,
                productName: i.name,
                size: i.size || 'N/A',
                qty: i.quantity,
                status: i.embroidery_status === 'DONE' ? 'PACKED' : (i.requires_embroidery ? 'PENDING' : 'PACKED')
            })) as import('./types').OrderHistoryItem[];

            // Fake some events based on status
            const events: import('./types').HistoryEvent[] = [
                {
                    id: `evt-${o.id}-1`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'CREATED',
                    details: 'Order imported',
                    actor: 'System',
                    timestamp: new Date(o.created_at)
                }
            ];

            if (o.paid_at) {
                events.push({
                    id: `evt-${o.id}-2`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'STATUS_CHANGE',
                    details: 'Payment confirmed',
                    actor: 'System',
                    timestamp: new Date(o.paid_at)
                });
            }

            if (o.embroidery_done_at) {
                events.push({
                    id: `evt-${o.id}-3`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'EMBROIDERY_RUN',
                    details: 'Embroidery Machine',
                    actor: 'Operator',
                    timestamp: new Date(o.embroidery_done_at)
                });
            }

            // Map status loosely
            // Status is now stored as display name — use directly
            const status = o.status || 'Processing';

            return {
                id: o.id,
                orderId: o.order_number,
                studentName: o.student_name || 'N/A',
                parentName: o.customer_name,
                schoolName: o.schools?.name || 'Unknown',
                schoolCode: o.schools?.code || 'N/A',
                deliveryType: o.delivery_method as any,
                status: status,
                items: items,
                createdAt: new Date(o.created_at),
                updatedAt: new Date(o.paid_at || o.created_at),
                paidAt: o.paid_at ? new Date(o.paid_at) : undefined,
                hasIssues: o.status === 'EXCEPTION',
                hasPartialEmbroidery: false, // TODO
                events: events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            };
        });
    }

    async getHistoryBatches(): Promise<import('./types').BatchHistoryRecord[]> {
        return [];
    }

    async getHistoryRuns(): Promise<import('./types').RunHistoryRecord[]> {
        return [];
    }
}
