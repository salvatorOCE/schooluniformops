// Data adapter interface - swap mock for Supabase later

import { Order, SchoolRunGroup, ExceptionOrder, DashboardStats, DeliveryType } from './types';

export interface DataAdapter {
    // Read operations
    getDashboardStats(): Promise<DashboardStats>;
    getRecentActivity(): Promise<import('./types').HistoryEvent[]>;
    getPendingCollections(): Promise<Array<{ schoolName: string; count: number }>>;
    getEmbroideryQueue(): Promise<Order[]>;
    getDistributionQueue(deliveryType?: DeliveryType, statuses?: import('./types').OrderStatus[]): Promise<Order[]>;
    getPackingSessions(): Promise<SchoolRunGroup[]>;
    getAnalyticsSummary(filters?: Partial<import('./analytics-types').AnalyticsFilters>): Promise<import('./analytics-types').AnalyticsSummary>;
    getSchoolRuns(): Promise<SchoolRunGroup[]>;
    getBulkOrders(): Promise<Order[]>;
    createBulkOrder(
        schoolId: string,
        orderDetails: { orderNumber?: string, customerName?: string, studentName?: string, status?: string, requestedAt?: string, partialDelivery?: number[] },
        items: { productId?: string, productName: string, sku: string, size: string, quantity: number, price?: number }[]
    ): Promise<Order>;
    updateBulkOrder(
        orderId: string,
        schoolId: string,
        orderDetails: { orderNumber?: string, customerName?: string, studentName?: string, status?: string, requestedAt?: string, partialDelivery?: number[] },
        items: { productId?: string, productName: string, sku: string, size: string, quantity: number, price?: number }[]
    ): Promise<Order>;
    getExceptions(): Promise<ExceptionOrder[]>;
    getOrderById(orderId: string): Promise<Order | null>;
    getSchools(): Promise<import('./types').School[]>;
    getProductsBySchool(schoolId: string): Promise<import('./types').Product[]>;
    createSchool(name: string, code: string): Promise<import('./types').School>;

    // Write operations
    markEmbroideryComplete(orderId: string): Promise<void>;
    packOrder(orderId: string): Promise<void>;
    dispatchOrder(orderId: string): Promise<void>;
    markReadyForPickup(orderId: string): Promise<void>;
    dispatchSchoolRun(schoolCode: string): Promise<void>;
    dispatchCarrierBatch(carrierName: string): Promise<void>;
    moveToStaged(orderId: string, location: string): Promise<void>;
    editOrderItems(orderId: string, items: any[]): Promise<void>;
    resolveException(orderId: string, updates: Partial<Order>): Promise<void>;
    updateOrderStatus(orderId: string, status: string): Promise<void>;
    updateOrderNotes(orderId: string, notes: string): Promise<void>;

    // Batches & Production
    getSchoolBatches(): Promise<import('./types').EmbroideryBatch[]>;
    markBatchSkuComplete(schoolName: string, sku: string, size: string): Promise<void>;
    releasePartialBatch(schoolCode: string): Promise<void>;

    // Fix-Ups
    getFixUps(): Promise<import('./types').FixUpRequest[]>;
    createFixUp(request: Partial<import('./types').FixUpRequest>): Promise<void>;
    updateFixUpStatus(id: string, status: import('./types').FixUpStatus): Promise<void>;
    updateFixUp(id: string, updates: { notes?: string; status?: import('./types').FixUpStatus }): Promise<void>;

    // Schedule / Calendar
    getScheduleEvents(start: Date, end: Date): Promise<import('./types').ScheduleEvent[]>;
    getStaff(): Promise<import('./types').StaffMember[]>;
    updateEvent(event: import('./types').ScheduleEvent): Promise<void>;

    // WooCommerce Sync
    syncStatusToWoo(orderId: string, status: string, note?: string): Promise<{ success: boolean }>;

    // Order Search (for tracking)
    searchOrders(query: string): Promise<import('./types').Order[]>;

    // Pack-out manifests & delivered orders (Order Tracking module)
    savePackOutManifest(manifest: import('./types').PackOutManifest): Promise<void>;
    getPackOutManifests(): Promise<import('./types').PackOutManifest[]>;
    getDeliveredOrders(): Promise<Order[]>;

    // History & Audit
    getHistoryOrders(): Promise<import('./types').OrderHistoryRecord[]>;
    getHistoryBatches(): Promise<import('./types').BatchHistoryRecord[]>;
    getHistoryRuns(): Promise<import('./types').RunHistoryRecord[]>;
    getSystemEvents(orderId: string): Promise<import('./types').SystemEvent[]>;

    // School Portal
    getSchoolPickupOrders(schoolCode: string): Promise<Order[]>;
    getSchoolInventory(schoolCode: string): Promise<import('./types').SchoolInventoryItem[]>;

    // Stock Management
    getInventoryStock(): Promise<any[]>;
    updateStockOnShelf(productId: string, size: string, newAmount: number): Promise<void>;
    updateStockInTransit(productId: string, size: string, newAmount: number): Promise<void>;
    getUnprocessedDetails(productId: string, size: string): Promise<import('./types').UnprocessedDetailRow[]>;
    updateOrderItemQuantity(orderItemId: string, quantity: number): Promise<void>;
}

// Export the active adapter (mock for now)
export { MockAdapter } from './mock-adapter';
