// Analytics-specific type definitions for School-First model

export type DatePreset = 'today' | '7d' | '30d' | 'term' | 'custom';
export type GroupByOption = 'school-product' | 'school-category-product' | 'product' | 'delivery';
export type DeliveryFilter = 'HOME' | 'SCHOOL' | 'STORE';

export interface AnalyticsFilters {
    dateRange: {
        start: Date;
        end: Date;
        preset: DatePreset;
    };
    compareEnabled: boolean;
    schools: string[];           // Empty = All schools
    products: string[];          // Empty = All products (SKUs)
    sizes: string[];             // Empty = All sizes
    deliveryTypes: DeliveryFilter[];
    statuses: string[];
    searchQuery: string;         // SKU or product name
    groupBy: GroupByOption;
}

export interface FilterOptions {
    schools: { value: string; label: string }[];
    products: { value: string; label: string }[];
    sizes: { value: string; label: string }[];
    statuses: { value: string; label: string }[];
}

export interface AnalyticsKpis {
    grossSales: number;
    orders: number;
    itemsSold: number;
    avgOrderValue: number;
    topSchool: { name: string; revenue: number };
    topSku: { sku: string; name: string; units: number };
    deliveryMix: { home: number; school: number; store: number };
    exceptionRate: number; // New metric
}

export interface SchoolAnalytics {
    schoolCode: string;
    schoolName: string;
    revenue: number;
    orders: number;
    itemsSold: number;
    avgOrderValue: number;
    topSku: string;
    products: ProductAnalytics[];
}

export interface ProductAnalytics {
    sku: string;
    productName: string;
    unitsSold: number;
    revenue: number;
    variations: VariationStats[];
}

export interface VariationStats {
    size: string;
    color?: string;
    unitsSold: number;
}

export interface AnalyticsOrderRow {
    orderId: string;
    orderNumber: string;
    studentName: string;
    parentName: string;
    schoolName: string;
    deliveryType: string;
    itemsSummary: string;
    total: number;
    embroideryStatus: string;
    orderStatus: string;
    createdAt: string;
    // New lifecycle timestamps for Velocity Metrics
    paidAt?: string;
    embroideredAt?: string;
    packedAt?: string;
    dispatchedAt?: string;
    hasException?: boolean;
    exceptionType?: string;
}

// --- New Operational Intelligence Types ---

export interface ProductionForecast {
    date: string;
    totalUnits: number;
    schools: Record<string, number>; // schoolCode -> units
}

export interface VelocityMetrics {
    avgPaidToEmbroidery: number; // hours
    avgEmbroideryToPacked: number; // hours
    avgPackedToDispatched: number; // hours
}

export interface SizeDistribution {
    size: string;
    units: number;
    percentage: number;
}

export interface ExceptionMetrics {
    totalExceptions: number;
    rate: number; // percentage of total orders
    byType: Record<string, number>;
    bySchool: Record<string, number>;
}

export interface ThroughputMetrics {
    completedToday: number;
    completedThisWeek: number;
    avgDailyThroughput: number;
    fixUpRate: number; // percentage
    fixUpCount: number;
}

export interface StageVelocity {
    stage: string;
    avgHours: number;
    trend: 'up' | 'down' | 'flat'; // up = slower (bad), down = faster (good)
}

export interface AnalyticsSummary {
    kpis: AnalyticsKpis;
    kpiDeltas: {
        grossSales: number;
        orders: number;
        itemsSold: number;
        avgOrderValue: number;
    };
    trendData: TrendDataPoint[];
    schools: SchoolAnalytics[];
    orders: AnalyticsOrderRow[];
    // New Data Points
    forecast: ProductionForecast[];
    velocity: VelocityMetrics;
    sizeDistribution: SizeDistribution[];
    exceptions: ExceptionMetrics;
    throughput: ThroughputMetrics;
    stageVelocities: StageVelocity[];
}

export interface TrendDataPoint {
    date: string;
    revenue: number;
    orders: number;
    items: number;
    schools: Record<string, number>;
}
