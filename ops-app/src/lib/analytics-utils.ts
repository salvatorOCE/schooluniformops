import {
    AnalyticsOrderRow,
    AnalyticsKpis,
    ProductionForecast,
    VelocityMetrics,
    SizeDistribution,
    ExceptionMetrics,
    ThroughputMetrics,
    StageVelocity,
    SchoolAnalytics,
} from './analytics-types';

export function calculateProductionForecast(schools: SchoolAnalytics[]): ProductionForecast[] {
    // Generate next 14 days forecast
    const forecast: ProductionForecast[] = [];

    for (let i = 0; i < 14; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        // Random daily load with weekly pattern
        const day = date.getDay();
        const isWeekend = day === 0 || day === 6;
        const baseLoad = isWeekend ? 0 : 50; // Mock base load

        const schoolBreakdown: Record<string, number> = {};
        let remaining = baseLoad;

        // Distribute among top 3 schools
        schools.slice(0, 3).forEach((s, idx) => {
            const share = remaining * (0.5 / (idx + 1));
            schoolBreakdown[s.schoolCode] = Math.round(share);
            remaining -= Math.round(share);
        });
        schoolBreakdown['OTHER'] = remaining;

        forecast.push({
            date: date.toISOString(),
            totalUnits: baseLoad,
            schools: schoolBreakdown
        });
    }
    return forecast;
}

export function calculateVelocityMetrics(orders: AnalyticsOrderRow[]): VelocityMetrics {
    let paidToEmb = 0;
    let embToPack = 0;
    let packToDisp = 0;
    let c1 = 0, c2 = 0, c3 = 0;

    orders.forEach(o => {
        if (o.paidAt && o.embroideredAt) {
            paidToEmb += (new Date(o.embroideredAt).getTime() - new Date(o.paidAt).getTime()) / (1000 * 60 * 60);
            c1++;
        }
        if (o.embroideredAt && o.packedAt) {
            embToPack += (new Date(o.packedAt).getTime() - new Date(o.embroideredAt).getTime()) / (1000 * 60 * 60);
            c2++;
        }
        if (o.packedAt && o.dispatchedAt) {
            packToDisp += (new Date(o.dispatchedAt).getTime() - new Date(o.packedAt).getTime()) / (1000 * 60 * 60);
            c3++;
        }
    });

    return {
        avgPaidToEmbroidery: c1 ? Math.round(paidToEmb / c1) : 0,
        avgEmbroideryToPacked: c2 ? Math.round(embToPack / c2) : 0,
        avgPackedToDispatched: c3 ? Math.round(packToDisp / c3) : 0
    };
}

export function calculateSizeDistribution(schools: SchoolAnalytics[]): SizeDistribution[] {
    const sizeMap = new Map<string, number>();

    schools.forEach(s => {
        s.products.forEach(p => {
            p.variations.forEach(v => {
                sizeMap.set(v.size, (sizeMap.get(v.size) || 0) + v.unitsSold);
            });
        });
    });

    const totalUnits = Array.from(sizeMap.values()).reduce((a, b) => a + b, 0) || 1;

    return Array.from(sizeMap.entries())
        .map(([size, units]) => ({
            size,
            units,
            percentage: Math.round((units / totalUnits) * 100)
        }))
        .sort((a, b) => {
            const SIZES = ['4', '6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL'];
            return SIZES.indexOf(a.size) - SIZES.indexOf(b.size);
        });
}

export function calculateExceptions(orders: AnalyticsOrderRow[]): ExceptionMetrics {
    const exceptions = orders.filter(o => o.hasException);
    const byType: Record<string, number> = {};
    const bySchool: Record<string, number> = {};

    exceptions.forEach(e => {
        if (e.exceptionType) byType[e.exceptionType] = (byType[e.exceptionType] || 0) + 1;
        bySchool[e.schoolName] = (bySchool[e.schoolName] || 0) + 1;
    });

    return {
        totalExceptions: exceptions.length,
        rate: orders.length ? parseFloat(((exceptions.length / orders.length) * 100).toFixed(1)) : 0,
        byType,
        bySchool
    };
}

export function calculateThroughputMetrics(orders: AnalyticsOrderRow[]): ThroughputMetrics {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const completedToday = orders.filter(o =>
        o.dispatchedAt && new Date(o.dispatchedAt) >= todayStart
    ).length;

    const completedThisWeek = orders.filter(o =>
        o.dispatchedAt && new Date(o.dispatchedAt) >= weekStart
    ).length;

    const fixUpCount = Math.round(orders.length * 0.03);
    const fixUpRate = orders.length ? parseFloat(((fixUpCount / orders.length) * 100).toFixed(1)) : 0;

    return {
        completedToday,
        completedThisWeek,
        avgDailyThroughput: Math.round(completedThisWeek / 7),
        fixUpRate,
        fixUpCount,
    };
}

export function calculateStageVelocities(velocity: VelocityMetrics): StageVelocity[] {
    return [
        { stage: 'Paid → Embroidery', avgHours: velocity.avgPaidToEmbroidery, trend: velocity.avgPaidToEmbroidery > 48 ? 'up' : 'down' },
        { stage: 'Embroidery → Packed', avgHours: velocity.avgEmbroideryToPacked, trend: velocity.avgEmbroideryToPacked > 12 ? 'up' : 'flat' },
        { stage: 'Packed → Dispatched', avgHours: velocity.avgPackedToDispatched, trend: velocity.avgPackedToDispatched > 12 ? 'up' : 'down' },
    ];
}

export function generateTrendData(schools: SchoolAnalytics[]): { date: string; revenue: number; orders: number; items: number; schools: Record<string, number> }[] {
    const days = 30;
    const trendData = [];
    const schoolNames = schools.slice(0, 5).map(s => s.schoolName);

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });

        // Base values with some variance
        const baseRevenue = 2500 + Math.random() * 3000;
        const baseOrders = 15 + Math.floor(Math.random() * 25);
        const baseItems = 40 + Math.floor(Math.random() * 60);

        // Weekend dip
        const dayOfWeek = date.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.4 : 1;

        const schoolContributions: Record<string, number> = {};
        const remaining = baseRevenue * weekendMultiplier;
        schoolNames.forEach((name, idx) => {
            const share = idx === 0 ? 0.3 : idx === 1 ? 0.25 : 0.15;
            const contribution = remaining * share * (0.8 + Math.random() * 0.4);
            schoolContributions[name] = Math.round(contribution);
        });
        schoolContributions['Other'] = Math.round(remaining * 0.15);

        trendData.push({
            date: dateStr,
            revenue: Math.round(baseRevenue * weekendMultiplier),
            orders: Math.round(baseOrders * weekendMultiplier),
            items: Math.round(baseItems * weekendMultiplier),
            schools: schoolContributions,
        });
    }

    return trendData;
}

export function calculateKpis(schools: SchoolAnalytics[], orders: AnalyticsOrderRow[], exceptions: ExceptionMetrics): AnalyticsKpis {
    const grossSales = schools.reduce((sum, s) => sum + s.revenue, 0);
    const totalOrders = schools.reduce((sum, s) => sum + s.orders, 0);
    const itemsSold = schools.reduce((sum, s) => sum + s.itemsSold, 0);

    const topSchool = schools[0];

    const productMap = new Map<string, { sku: string; name: string; units: number }>();
    schools.forEach(school => {
        school.products.forEach(product => {
            const existing = productMap.get(product.sku);
            if (existing) {
                existing.units += product.unitsSold;
            } else {
                productMap.set(product.sku, { sku: product.sku, name: product.productName, units: product.unitsSold });
            }
        });
    });
    const topSkuEntry = Array.from(productMap.values()).sort((a, b) => b.units - a.units)[0];

    const deliveryCounts = { home: 0, school: 0, store: 0 };
    orders.forEach(order => {
        if (order.deliveryType === 'HOME') deliveryCounts.home++;
        else if (order.deliveryType === 'SCHOOL') deliveryCounts.school++;
        else deliveryCounts.store++;
    });
    const totalDel = orders.length || 1;

    return {
        grossSales,
        orders: totalOrders,
        itemsSold,
        avgOrderValue: Math.round(grossSales / (totalOrders || 1)),
        topSchool: { name: topSchool?.schoolName || '', revenue: topSchool?.revenue || 0 },
        topSku: topSkuEntry || { sku: '', name: '', units: 0 },
        deliveryMix: {
            home: Math.round((deliveryCounts.home / totalDel) * 100),
            school: Math.round((deliveryCounts.school / totalDel) * 100),
            store: Math.round((deliveryCounts.store / totalDel) * 100),
        },
        exceptionRate: exceptions.rate,
    };
}
