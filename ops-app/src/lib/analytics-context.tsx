'use client';

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { SCHOOLS as MOCK_SCHOOLS, PRODUCTS as MOCK_PRODUCTS, SIZES as MOCK_SIZES } from '@/lib/analytics-mock';
import { AnalyticsFilters, FilterOptions, DatePreset, GroupByOption, DeliveryFilter } from '@/lib/analytics-types';

const defaultFilters: AnalyticsFilters = {
    dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
        preset: '30d',
    },
    compareEnabled: false,
    schools: [],
    products: [],
    sizes: [],
    deliveryTypes: [],
    statuses: [],
    searchQuery: '',
    groupBy: 'school-product',
};

interface AnalyticsFilterContextType {
    filters: AnalyticsFilters;
    filterOptions: FilterOptions;
    setDatePreset: (preset: DatePreset) => void;
    setCustomDateRange: (start: Date, end: Date) => void;
    toggleCompare: () => void;
    setSchools: (schools: string[]) => void;
    setProducts: (products: string[]) => void;
    setSizes: (sizes: string[]) => void;
    setDeliveryTypes: (types: DeliveryFilter[]) => void;
    setStatuses: (statuses: string[]) => void;
    setSearchQuery: (query: string) => void;
    setGroupBy: (groupBy: GroupByOption) => void;
    resetFilters: () => void;
}

const AnalyticsFilterContext = createContext<AnalyticsFilterContextType | undefined>(undefined);

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
    const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        schools: MOCK_SCHOOLS.map(s => ({ value: s.code, label: s.name })),
        products: MOCK_PRODUCTS.map(p => ({ value: p.sku, label: p.name })),
        sizes: MOCK_SIZES.map(s => ({ value: s, label: `Size ${s}` })),
        statuses: [
            { value: 'Processing', label: 'Processing' },
            { value: 'Embroidery', label: 'Embroidery' },
            { value: 'Distribution', label: 'Distribution' },
            { value: 'Packed', label: 'Packed' },
            { value: 'Shipped', label: 'Shipped' },
        ]
    });

    // Fetch real filter options from Supabase on mount
    useEffect(() => {
        const fetchFilterOptions = async () => {
            // Only attempt fetch if Supabase client is configured
            if (!supabase) return;

            try {
                const [schoolsRes, productsRes, variationsRes] = await Promise.all([
                    supabase.from('schools').select('code, name'),
                    supabase.from('products').select('sku, name'),
                    supabase.from('variations').select('attribute_size')
                ]);

                if (schoolsRes.data && schoolsRes.data.length > 0) {
                    setFilterOptions(prev => ({
                        ...prev,
                        schools: schoolsRes.data.map((s: any) => ({ value: s.code, label: s.name }))
                    }));
                }

                if (productsRes.data && productsRes.data.length > 0) {
                    setFilterOptions(prev => ({
                        ...prev,
                        products: productsRes.data.map((p: any) => ({ value: p.sku, label: p.name }))
                    }));
                }

                if (variationsRes.data && variationsRes.data.length > 0) {
                    // Extract unique sizes
                    const sizes = Array.from(new Set(variationsRes.data.map((v: any) => v.attribute_size).filter(Boolean)));
                    if (sizes.length > 0) {
                        setFilterOptions(prev => ({
                            ...prev,
                            sizes: sizes.map((s: any) => ({ value: s, label: `Size ${s}` }))
                        }));
                    }
                }
            } catch (error) {
                console.error('Error fetching filter options:', error);
                // Fallback is already set in initial state
            }
        };

        fetchFilterOptions();
    }, []);

    const setStatuses = (statuses: string[]) => setFilters(prev => ({ ...prev, statuses }));

    const setDatePreset = (preset: DatePreset) => {
        const end = new Date();
        const start = new Date();

        switch (preset) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case '7d':
                start.setDate(end.getDate() - 7);
                break;
            case '30d':
                start.setDate(end.getDate() - 30);
                break;
            case 'term':
                // Approximate term start (e.g., 3 months)
                start.setMonth(end.getMonth() - 3);
                break;
            default:
                break;
        }

        setFilters(prev => ({
            ...prev,
            dateRange: { start, end, preset },
        }));
    };

    const setCustomDateRange = (start: Date, end: Date) => {
        setFilters(prev => ({
            ...prev,
            dateRange: { start, end, preset: 'custom' },
        }));
    };

    const toggleCompare = () => {
        setFilters(prev => ({ ...prev, compareEnabled: !prev.compareEnabled }));
    };

    const setSchools = (schools: string[]) => {
        setFilters(prev => ({ ...prev, schools }));
    };

    const setProducts = (products: string[]) => {
        setFilters(prev => ({ ...prev, products }));
    };

    const setSizes = (sizes: string[]) => {
        setFilters(prev => ({ ...prev, sizes }));
    };

    const setDeliveryTypes = (types: DeliveryFilter[]) => {
        setFilters(prev => ({ ...prev, deliveryTypes: types }));
    };

    const setSearchQuery = (query: string) => {
        setFilters(prev => ({ ...prev, searchQuery: query }));
    };

    const setGroupBy = (groupBy: GroupByOption) => {
        setFilters(prev => ({ ...prev, groupBy }));
    };

    const resetFilters = () => {
        setFilters(defaultFilters);
    };

    return (
        <AnalyticsFilterContext.Provider
            value={{
                filters,
                filterOptions,
                setDatePreset,
                setCustomDateRange,
                toggleCompare,
                setSchools,
                setProducts,
                setSizes,
                setDeliveryTypes,
                setStatuses,
                setSearchQuery,
                setGroupBy,
                resetFilters,
            }}
        >
            {children}
        </AnalyticsFilterContext.Provider>
    );
}

export function useAnalyticsFilters() {
    const context = useContext(AnalyticsFilterContext);
    if (!context) {
        throw new Error('useAnalyticsFilters must be used within AnalyticsFilterProvider');
    }
    return context;
}
