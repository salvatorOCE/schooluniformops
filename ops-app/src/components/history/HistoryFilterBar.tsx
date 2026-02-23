'use client';

import { useState, useRef, useEffect } from 'react';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { Calendar, ChevronDown, X, Building2, Truck, AlertTriangle, Search } from 'lucide-react';
import { useHistory } from '@/lib/history-context';

/* --------------------------------------------------------------------------------
 * Reusable MultiSelectDropdown (Copied from SmartFilterBar for consistency)
 * -------------------------------------------------------------------------------- */
interface MultiSelectDropdownProps {
    label: string;
    icon: React.ElementType;
    options: { value: string; label: string }[];
    selected: string[];
    onSelect: (values: string[]) => void;
    searchable?: boolean;
}

function MultiSelectDropdown({ label, icon: Icon, options, selected, onSelect, searchable = true }: MultiSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredOptions = searchable && search
        ? options.filter(opt => fuzzyMatch(search, opt.label, 0.3) || fuzzyMatch(search, opt.value, 0.3))
        : options;

    const toggleOption = (value: string) => {
        if (selected.includes(value)) {
            onSelect(selected.filter(v => v !== value));
        } else {
            onSelect([...selected, value]);
        }
    };

    const removeSelected = (value: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(selected.filter(v => v !== value));
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getLabel = (value: string) => options.find(o => o.value === value)?.label || value;

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 md:gap-2 bg-white border border-slate-200 rounded-md px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm hover:bg-slate-50 transition-colors min-w-[110px] md:min-w-[140px]"
            >
                <Icon className="w-4 h-4 text-slate-400" />
                {selected.length === 0 ? (
                    <span className="text-slate-500">{label}</span>
                ) : selected.length === 1 ? (
                    <span className="text-slate-700 truncate max-w-[100px]">{getLabel(selected[0])}</span>
                ) : (
                    <span className="text-slate-700">{selected.length} selected</span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400 ml-auto" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-md shadow-lg z-50">
                    {searchable && (
                        <div className="p-2 border-b border-slate-100">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${label.toLowerCase()}...`}
                                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                                autoFocus
                            />
                        </div>
                    )}

                    {selected.length > 0 && (
                        <div className="p-2 border-b border-slate-100 flex flex-wrap gap-1">
                            {selected.map(value => (
                                <span
                                    key={value}
                                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded"
                                >
                                    {getLabel(value)}
                                    <button onClick={(e) => removeSelected(value, e)} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => toggleOption(option.value)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${selected.includes(option.value) ? 'bg-slate-50' : ''
                                    }`}
                            >
                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(option.value) ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                                    }`}>
                                    {selected.includes(option.value) && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-slate-700">{option.label}</span>
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-2 text-sm text-slate-400">No results found</div>
                        )}
                    </div>

                    {selected.length > 0 && (
                        <div className="p-2 border-t border-slate-100">
                            <button
                                onClick={() => onSelect([])}
                                className="w-full text-xs text-slate-500 hover:text-slate-700"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* --------------------------------------------------------------------------------
 * HistoryFilterBar Component
 * -------------------------------------------------------------------------------- */

export interface HistoryFilters {
    search: string;
    schools: string[];
    deliveryTypes: string[];
    statuses: string[];
    hasIssues: boolean;
}

interface HistoryFilterBarProps {
    filters: HistoryFilters;
    onFilterChange: (filters: HistoryFilters) => void;
}

export function HistoryFilterBar({ filters, onFilterChange }: HistoryFilterBarProps) {
    const { orders } = useHistory();

    // Derive options from data
    const uniqueSchools = Array.from(new Set(orders.map(o => o.schoolCode))).map(code => {
        const order = orders.find(o => o.schoolCode === code);
        return { value: code, label: order?.schoolName || code };
    });

    const deliveryOptions = [
        { value: 'HOME', label: 'Home Delivery' },
        { value: 'SCHOOL', label: 'School Pickup' },
        { value: 'STORE', label: 'Store Pickup' },
    ];

    const statusOptions = [
        { value: 'Processing', label: 'Processing' },
        { value: 'Embroidery', label: 'Embroidery' },
        { value: 'Distribution', label: 'Distribution' },
        { value: 'Shipped', label: 'Shipped' },
        { value: 'Completed', label: 'Completed' },
        { value: 'On-Hold', label: 'On-Hold' },
        { value: 'Failed', label: 'Failed' }
    ];

    const updateFilter = (key: keyof HistoryFilters, value: any) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="mb-3 md:mb-6 space-y-2 md:space-y-4">
            {/* Top Row: Global Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search orders, students, parents..."
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
                />
            </div>

            {/* Bottom Row: Faceted Filters */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <MultiSelectDropdown
                    label="Schools"
                    icon={Building2}
                    options={uniqueSchools}
                    selected={filters.schools}
                    onSelect={(vals) => updateFilter('schools', vals)}
                />

                <MultiSelectDropdown
                    label="Delivery"
                    icon={Truck}
                    options={deliveryOptions}
                    selected={filters.deliveryTypes}
                    onSelect={(vals) => updateFilter('deliveryTypes', vals)}
                />

                <MultiSelectDropdown
                    label="Status"
                    icon={Calendar} // Using generic icon or dedicated status icon
                    options={statusOptions}
                    selected={filters.statuses}
                    onSelect={(vals) => updateFilter('statuses', vals)}
                    searchable={false}
                />

                {/* Toggles */}
                <button
                    onClick={() => updateFilter('hasIssues', !filters.hasIssues)}
                    className={`flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-medium rounded-md border transition-colors ${filters.hasIssues
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <AlertTriangle className={`w-4 h-4 ${filters.hasIssues ? 'text-amber-600' : 'text-slate-400'}`} />
                    Has Issues
                </button>

                {/* Reset */}
                {(filters.search || filters.schools.length > 0 || filters.deliveryTypes.length > 0 || filters.statuses.length > 0 || filters.hasIssues) && (
                    <button
                        onClick={() => onFilterChange({ search: '', schools: [], deliveryTypes: [], statuses: [], hasIssues: false })}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2"
                    >
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}
