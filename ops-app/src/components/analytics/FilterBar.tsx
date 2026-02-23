'use client';

import { useAnalyticsFilters } from '@/lib/analytics-context';
import { SCHOOLS } from '@/lib/analytics-mock';
import { Search, Calendar, Building2, Truck, Layers, X } from 'lucide-react';

const DATE_PRESETS = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'term', label: 'Term to Date' },
];

const DELIVERY_OPTIONS = [
    { value: 'HOME', label: 'Home' },
    { value: 'SCHOOL', label: 'School' },
    { value: 'STORE', label: 'Store' },
];

const GROUP_BY_OPTIONS = [
    { value: 'school-product', label: 'School → Product' },
    { value: 'product', label: 'Product (Cross-school)' },
    { value: 'delivery', label: 'Delivery Type' },
];

export function AnalyticsFilterBar() {
    const {
        filters,
        setDatePreset,
        setSchools,
        setDeliveryTypes,
        setSearchQuery,
        setGroupBy,
        resetFilters,
    } = useAnalyticsFilters();

    const hasActiveFilters =
        filters.schools.length > 0 ||
        filters.deliveryTypes.length > 0 ||
        filters.searchQuery !== '' ||
        filters.dateRange.preset !== '30d';

    return (
        <div className="bg-white border border-slate-200 rounded-md p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
                {/* Date Preset */}
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <select
                        value={filters.dateRange.preset}
                        onChange={(e) => setDatePreset(e.target.value as any)}
                        className="text-sm border border-slate-200 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                        {DATE_PRESETS.map((preset) => (
                            <option key={preset.value} value={preset.value}>
                                {preset.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200" />

                {/* School Filter */}
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <select
                        value={filters.schools[0] || ''}
                        onChange={(e) => setSchools(e.target.value ? [e.target.value] : [])}
                        className="text-sm border border-slate-200 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                        <option value="">All Schools</option>
                        {SCHOOLS.map((school) => (
                            <option key={school.code} value={school.code}>
                                {school.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Delivery Type Filter */}
                <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <select
                        value={filters.deliveryTypes[0] || ''}
                        onChange={(e) => setDeliveryTypes(e.target.value ? [e.target.value as any] : [])}
                        className="text-sm border border-slate-200 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                        <option value="">All Delivery</option>
                        {DELIVERY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Group By */}
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <select
                        value={filters.groupBy}
                        onChange={(e) => setGroupBy(e.target.value as any)}
                        className="text-sm border border-slate-200 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                        {GROUP_BY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200" />

                {/* Search */}
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search SKU or product..."
                        value={filters.searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-sm border border-slate-200 rounded px-3 py-1.5 w-full bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
