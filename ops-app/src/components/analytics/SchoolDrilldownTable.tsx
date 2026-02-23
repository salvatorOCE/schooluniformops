'use client';

import { useState } from 'react';
import { SchoolAnalytics, ProductAnalytics, VariationStats, AnalyticsOrderRow } from '@/lib/analytics-types';
import { ChevronRight, ChevronDown, Eye, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/csv-export';

interface SchoolDrilldownTableProps {
    schools: SchoolAnalytics[];
    orders: AnalyticsOrderRow[];
    onViewOrders: (orders: AnalyticsOrderRow[], context: string) => void;
}

export function SchoolDrilldownTable({ schools, orders, onViewOrders }: SchoolDrilldownTableProps) {
    const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

    const toggleSchool = (code: string) => {
        const next = new Set(expandedSchools);
        if (next.has(code)) {
            next.delete(code);
        } else {
            next.add(code);
        }
        setExpandedSchools(next);
    };

    const toggleProduct = (key: string) => {
        const next = new Set(expandedProducts);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        setExpandedProducts(next);
    };

    const getSchoolOrders = (schoolName: string) =>
        orders.filter(o => o.schoolName === schoolName);

    return (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="col-span-4">School / Product / Size</div>
                <div className="col-span-2 text-right">Revenue</div>
                <div className="col-span-1 text-right">Orders</div>
                <div className="col-span-1 text-right">Items</div>
                <div className="col-span-1 text-right">AOV</div>
                <div className="col-span-1">Top SKU</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* School Rows */}
            {schools.map((school) => {
                const isExpanded = expandedSchools.has(school.schoolCode);
                const schoolOrders = getSchoolOrders(school.schoolName);

                return (
                    <div key={school.schoolCode}>
                        {/* Level 1: School */}
                        <div
                            className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => toggleSchool(school.schoolCode)}
                        >
                            <div className="col-span-4 flex items-center gap-2">
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="font-semibold text-slate-900">{school.schoolName}</span>
                            </div>
                            <div className="col-span-2 text-right font-medium text-slate-900">
                                ${school.revenue.toLocaleString()}
                            </div>
                            <div className="col-span-1 text-right text-slate-600">{school.orders}</div>
                            <div className="col-span-1 text-right text-slate-600">{school.itemsSold}</div>
                            <div className="col-span-1 text-right text-slate-600">${school.avgOrderValue}</div>
                            <div className="col-span-1">
                                <span className="text-xs font-mono text-slate-500">{school.topSku}</span>
                            </div>
                            <div className="col-span-2 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => onViewOrders(schoolOrders, school.schoolName)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                    title="View Orders"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => exportToCSV(schoolOrders, {
                                        filename: `school_orders_${school.schoolCode}`,
                                        columns: [
                                            { key: 'orderNumber', label: 'Order #' },
                                            { key: 'studentName', label: 'Student' },
                                            { key: 'parentName', label: 'Parent' },
                                            { key: 'deliveryType', label: 'Delivery' },
                                            { key: 'itemsSummary', label: 'Items' },
                                            { key: 'total', label: 'Total', formatter: (v: number) => `$${v}` },
                                            { key: 'orderStatus', label: 'Status' },
                                        ]
                                    })}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                    title="Export CSV"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Level 2: Products */}
                        {isExpanded && school.products.map((product) => {
                            const productKey = `${school.schoolCode}-${product.sku}`;
                            const isProductExpanded = expandedProducts.has(productKey);

                            return (
                                <div key={productKey}>
                                    <div
                                        className="grid grid-cols-12 gap-2 px-4 py-2 pl-10 border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer transition-colors bg-slate-50/50"
                                        onClick={() => toggleProduct(productKey)}
                                    >
                                        <div className="col-span-4 flex items-center gap-2">
                                            {product.variations.length > 0 ? (
                                                isProductExpanded ? (
                                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                                )
                                            ) : (
                                                <div className="w-3" />
                                            )}
                                            <span className="text-sm text-slate-700">{product.productName}</span>
                                            <span className="text-xs font-mono text-slate-400">{product.sku}</span>
                                        </div>
                                        <div className="col-span-2 text-right text-sm text-slate-700">
                                            ${product.revenue.toLocaleString()}
                                        </div>
                                        <div className="col-span-1 text-right text-sm text-slate-500">-</div>
                                        <div className="col-span-1 text-right text-sm text-slate-600">{product.unitsSold}</div>
                                        <div className="col-span-1 text-right text-sm text-slate-500">-</div>
                                        <div className="col-span-1"></div>
                                        <div className="col-span-2"></div>
                                    </div>

                                    {/* Level 3: Variations */}
                                    {isProductExpanded && product.variations.map((variation, idx) => (
                                        <div
                                            key={`${productKey}-${variation.size}-${idx}`}
                                            className="grid grid-cols-12 gap-2 px-4 py-1.5 pl-16 border-b border-slate-50 bg-slate-50/30"
                                        >
                                            <div className="col-span-4 text-xs text-slate-500">
                                                Size: {variation.size}
                                                {variation.color && ` / ${variation.color}`}
                                            </div>
                                            <div className="col-span-2"></div>
                                            <div className="col-span-1"></div>
                                            <div className="col-span-1 text-right text-xs text-slate-500">{variation.unitsSold}</div>
                                            <div className="col-span-4"></div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {schools.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    No data matches the current filters.
                </div>
            )}
        </div>
    );
}
