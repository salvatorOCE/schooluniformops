// Mock data generator for School-First Analytics

import {
    AnalyticsFilters,
    AnalyticsSummary,
    SchoolAnalytics,
    ProductAnalytics,
    VariationStats,
    AnalyticsOrderRow,
    AnalyticsKpis,
    ProductionForecast,
    VelocityMetrics,
    SizeDistribution,
    ExceptionMetrics,
    ThroughputMetrics,
    StageVelocity,
} from './analytics-types';

// School definitions
const SCHOOLS = [
    { code: 'STMARY', name: "St Mary's College" },
    { code: 'STPETER', name: "St Peter's Primary" },
    { code: 'ROSARY', name: 'Rosary School' },
    { code: 'TRINITY', name: 'Trinity College' },
    { code: 'HOLY', name: 'Holy Cross Primary' },
];

// Product catalog
const PRODUCTS = [
    { sku: 'POLO-NVY', name: 'Polo Shirt (Navy)', price: 45 },
    { sku: 'POLO-WHT', name: 'Polo Shirt (White)', price: 45 },
    { sku: 'DRESS-NVY', name: 'Summer Dress (Navy)', price: 65 },
    { sku: 'SHORT-NVY', name: 'Sports Shorts (Navy)', price: 35 },
    { sku: 'CARD-NVY', name: 'Cardigan (Navy)', price: 55 },
    { sku: 'JACKET-NVY', name: 'Winter Jacket', price: 89 },
    { sku: 'SOCK-3PK', name: 'Crew Socks (3-Pack)', price: 18 },
    { sku: 'HAT-NVY', name: 'School Hat', price: 22 },
];

const SIZES = ['4', '6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL'];
const FIRST_NAMES = ['Emma', 'Lucas', 'Olivia', 'Noah', 'Ava', 'Liam', 'Sophia', 'Mason', 'Isabella', 'Ethan'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor'];
const DELIVERY_TYPES: ('HOME' | 'SCHOOL' | 'STORE')[] = ['HOME', 'SCHOOL', 'STORE'];

// Seeded random for consistent SSR/CSR hydration
let seed = 12345;
function seededRandom(): number {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function resetSeed(): void {
    seed = 12345;
}

function randomInt(min: number, max: number): number {
    return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(seededRandom() * arr.length)];
}

function generateVariations(totalUnits: number): VariationStats[] {
    const variations: VariationStats[] = [];
    let remaining = totalUnits;
    const usedSizes = new Set<string>();

    while (remaining > 0 && usedSizes.size < 5) {
        const size = randomChoice(SIZES);
        if (usedSizes.has(size)) continue;
        usedSizes.add(size);

        const units = remaining === totalUnits
            ? Math.ceil(remaining * 0.4)
            : Math.min(remaining, randomInt(1, Math.ceil(remaining * 0.5)));

        variations.push({ size, unitsSold: units });
        remaining -= units;
    }

    if (remaining > 0 && variations.length > 0) {
        variations[0].unitsSold += remaining;
    }

    return variations.sort((a, b) => b.unitsSold - a.unitsSold);
}

function generateProductsForSchool(): ProductAnalytics[] {
    const numProducts = randomInt(4, 8);
    const products: ProductAnalytics[] = [];
    const usedProducts = new Set<string>();

    while (products.length < numProducts) {
        const product = randomChoice(PRODUCTS);
        if (usedProducts.has(product.sku)) continue;
        usedProducts.add(product.sku);

        const unitsSold = randomInt(15, 200);
        const revenue = unitsSold * product.price;

        products.push({
            sku: product.sku,
            productName: product.name,
            unitsSold,
            revenue,
            variations: generateVariations(unitsSold),
        });
    }

    return products.sort((a, b) => b.revenue - a.revenue);
}

function generateSchoolAnalytics(): SchoolAnalytics[] {
    return SCHOOLS.map(school => {
        const products = generateProductsForSchool();
        const revenue = products.reduce((sum, p) => sum + p.revenue, 0);
        const itemsSold = products.reduce((sum, p) => sum + p.unitsSold, 0);
        const orders = Math.ceil(itemsSold / randomInt(2, 4));

        return {
            schoolCode: school.code,
            schoolName: school.name,
            revenue,
            orders,
            itemsSold,
            avgOrderValue: Math.round(revenue / orders),
            topSku: products[0]?.sku || '',
            products,
        };
    }).sort((a, b) => b.revenue - a.revenue);
}

// --- Helper Functions for Operational Data ---

function addHours(date: Date, hours: number): Date {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
}

function generateOrders(schools: SchoolAnalytics[]): AnalyticsOrderRow[] {
    const orders: AnalyticsOrderRow[] = [];
    let orderId = 1000;

    schools.forEach(school => {
        const numOrders = Math.min(school.orders, 50);

        for (let i = 0; i < numOrders; i++) {
            orderId++;
            const firstName = randomChoice(FIRST_NAMES);
            const lastName = randomChoice(LAST_NAMES);
            const parentFirst = randomChoice(FIRST_NAMES);
            const deliveryType = randomChoice(DELIVERY_TYPES);

            const numItems = randomInt(1, 4);
            const items = Array.from({ length: numItems }, () => {
                const product = randomChoice(school.products);
                return `${product.productName} x${randomInt(1, 3)}`;
            });

            const total = randomInt(45, 350);
            const daysAgo = randomInt(0, 30);
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);

            // Lifecycle Timestamps for Velocity
            // Paid shortly after creation
            const paidAt = addHours(createdAt, randomInt(0, 2));

            // Embroidery takes 1-5 days typically
            let embroideredAt: Date | undefined;
            const embroideryStatus = randomChoice(['PENDING', 'DONE']);
            if (embroideryStatus === 'DONE') {
                embroideredAt = addHours(paidAt, randomInt(24, 120));
            }

            // Packing takes 4-24 hours after embroidery
            let packedAt: Date | undefined;
            const orderStatus = randomChoice(['AWAITING_EMBROIDERY', 'AWAITING_PACK', 'DISPATCHED']);

            if (orderStatus === 'AWAITING_PACK' && embroideredAt) {
                // In packing queue or just packed? Let's assume packed if dispatched
            }

            if (orderStatus === 'DISPATCHED' && embroideredAt) {
                packedAt = addHours(embroideredAt, randomInt(4, 24));
            }

            // Dispatch takes 2-24 hours after packing
            let dispatchedAt: Date | undefined;
            if (orderStatus === 'DISPATCHED' && packedAt) {
                dispatchedAt = addHours(packedAt, randomInt(2, 24));
            }

            // Exceptions
            const hasException = seededRandom() < 0.05; // 5% exception rate
            const exceptionType = hasException ? randomChoice(['Out of Stock', 'Missing Info', 'Quality Issue']) : undefined;

            orders.push({
                orderId: `ORD-${orderId}`,
                orderNumber: `SUS-${orderId}`,
                studentName: `${firstName} ${lastName}`,
                parentName: `${parentFirst} ${lastName}`,
                schoolName: school.schoolName,
                deliveryType,
                itemsSummary: items.join(', '),
                total,
                embroideryStatus,
                orderStatus,
                createdAt: createdAt.toISOString(),
                paidAt: paidAt.toISOString(),
                embroideredAt: embroideredAt?.toISOString(),
                packedAt: packedAt?.toISOString(),
                dispatchedAt: dispatchedAt?.toISOString(),
                hasException,
                exceptionType,
            });
        }
    });

    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

import {
    calculateProductionForecast,
    calculateVelocityMetrics,
    calculateSizeDistribution,
    calculateExceptions,
    calculateThroughputMetrics,
    calculateStageVelocities,
    generateTrendData,
    calculateKpis
} from './analytics-utils';

export function getAnalyticsSummary(filters?: Partial<AnalyticsFilters>): AnalyticsSummary {
    // Reset seed to ensure consistent SSR/CSR hydration
    resetSeed();

    let schools = generateSchoolAnalytics();
    let orders = generateOrders(schools);

    // Apply filters (mock implementation)
    if (filters?.schools && filters.schools.length > 0) {
        schools = schools.filter(s => filters.schools!.includes(s.schoolCode));
        orders = orders.filter(o => schools.some(s => s.schoolName === o.schoolName));
    }

    if (filters?.deliveryTypes && filters.deliveryTypes.length > 0) {
        orders = orders.filter(o => filters.deliveryTypes!.includes(o.deliveryType as any));
    }

    if (filters?.statuses && filters.statuses.length > 0) {
        orders = orders.filter(o => filters.statuses!.includes(o.orderStatus));
    }

    // Filter by products (SKUs)
    if (filters?.products && filters.products.length > 0) {
        schools = schools.map(school => ({
            ...school,
            products: school.products.filter(p => filters.products!.includes(p.sku)),
        })).filter(s => s.products.length > 0);

        // Also filter orders to match products (heuristic check)
        orders = orders.filter(o => {
            return filters.products!.some(sku => o.itemsSummary.includes(sku));
        });
    }

    // Filter by sizes
    if (filters?.sizes && filters.sizes.length > 0) {
        schools = schools.map(school => ({
            ...school,
            products: school.products.map(p => ({
                ...p,
                variations: p.variations.filter(v => filters.sizes!.includes(v.size)),
            })).filter(p => p.variations.length > 0),
        })).filter(s => s.products.length > 0);
    }

    if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        schools = schools.map(school => ({
            ...school,
            products: school.products.filter(
                p => p.sku.toLowerCase().includes(query) || p.productName.toLowerCase().includes(query)
            ),
        })).filter(s => s.products.length > 0);
    }

    // Recalculate School Metrics based on Filtered Orders (if significant filters applied)
    if ((filters?.statuses?.length ?? 0) > 0 || (filters?.deliveryTypes?.length ?? 0) > 0) {
        const orderMap = new Map<string, typeof orders>();
        orders.forEach(o => {
            const list = orderMap.get(o.schoolName) || [];
            list.push(o);
            orderMap.set(o.schoolName, list);
        });

        schools = schools.map(s => {
            const filteredSchoolOrders = orderMap.get(s.schoolName) || [];
            const revenue = filteredSchoolOrders.reduce((sum, o) => sum + o.total, 0);

            // 1. Reset product map
            const productStats = new Map<string, { sku: string; name: string; units: number; revenue: number }>();

            filteredSchoolOrders.forEach(o => {
                const items = o.itemsSummary.split(', ');
                items.forEach(itemStr => {
                    const [namePart, qtyPart] = itemStr.split(' x');
                    const qty = parseInt(qtyPart) || 1;
                    const cleanName = namePart.trim();

                    const originalProduct = s.products.find(p => p.productName === cleanName);
                    const sku = originalProduct?.sku || 'UNKNOWN';

                    const existing = productStats.get(sku);
                    if (existing) {
                        existing.units += qty;
                        existing.revenue += (originalProduct?.revenue ? (originalProduct.revenue / originalProduct.unitsSold) : 0) * qty;
                    } else {
                        productStats.set(sku, {
                            sku,
                            name: cleanName,
                            units: qty,
                            revenue: (originalProduct?.revenue ? (originalProduct.revenue / originalProduct.unitsSold) : 0) * qty
                        });
                    }
                });
            });

            // 2. Rebuild product list with new stats
            const filteredProducts = s.products.map(p => {
                const stat = productStats.get(p.sku);
                const newUnits = stat ? stat.units : 0;
                const newRevenue = stat ? stat.revenue : 0;
                const ratio = p.unitsSold > 0 ? newUnits / p.unitsSold : 0;

                return {
                    ...p,
                    unitsSold: newUnits,
                    revenue: newRevenue,
                    variations: p.variations.map(v => ({
                        ...v,
                        unitsSold: Math.round(v.unitsSold * ratio)
                    }))
                };
            }).filter(p => p.unitsSold > 0).sort((a, b) => b.unitsSold - a.unitsSold);

            return {
                ...s,
                revenue: revenue,
                orders: filteredSchoolOrders.length,
                itemsSold: Math.ceil(filteredSchoolOrders.length * 2.5),
                products: filteredProducts
            };
        });
    }

    // Calculate Operational Metrics
    const forecast = calculateProductionForecast(schools);
    const velocity = calculateVelocityMetrics(orders);
    const sizeDistribution = calculateSizeDistribution(schools);
    const exceptions = calculateExceptions(orders);

    // Pass exceptions to KPI calc
    const kpis = calculateKpis(schools, orders, exceptions);
    const trendData = generateTrendData(schools);

    // Mock deltas (random for demo)
    const kpiDeltas = {
        grossSales: Math.round((seededRandom() * 30) - 10),
        orders: Math.round((seededRandom() * 20) - 5),
        itemsSold: Math.round((seededRandom() * 25) - 8),
        avgOrderValue: Math.round((seededRandom() * 15) - 5),
    };

    return {
        kpis,
        kpiDeltas,
        trendData,
        schools,
        orders,
        forecast,
        velocity,
        sizeDistribution,
        exceptions,
        throughput: calculateThroughputMetrics(orders),
        stageVelocities: calculateStageVelocities(velocity),
    };
}

export { SCHOOLS, PRODUCTS, SIZES };
