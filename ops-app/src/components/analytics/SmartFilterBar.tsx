'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAnalyticsFilters } from '@/lib/analytics-context';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { Calendar, ChevronDown, X, Building2, Tag, Ruler, Clock } from 'lucide-react';




const DATE_PRESETS = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'This Month', value: 'month' },
    { label: 'Term to Date', value: 'term' },
];

function formatDateForInput(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function parseDateFromInput(input: string): Date | null {
    const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }
    return null;
}

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
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm hover:bg-slate-50 transition-colors min-w-[140px]"
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
                    {/* Search Input */}
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

                    {/* Selected Pills */}
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

                    {/* Options List */}
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

                    {/* Clear Button */}
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

export function SmartFilterBar() {
    const { filters, filterOptions, setSchools, setProducts, setSizes, setStatuses, setDatePreset, setCustomDateRange, resetFilters } = useAnalyticsFilters();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [fromDate, setFromDate] = useState(formatDateForInput(filters.dateRange.start));
    const [toDate, setToDate] = useState(formatDateForInput(filters.dateRange.end));
    const datePickerRef = useRef<HTMLDivElement>(null);

    const currentPresetLabel = DATE_PRESETS.find(p => p.value === filters.dateRange.preset)?.label || 'Custom';

    const handleDatePreset = (preset: string) => {
        setDatePreset(preset as 'today' | '7d' | '30d' | 'term');
        setShowDatePicker(false);
    };

    const applyCustomDateRange = () => {
        const start = parseDateFromInput(fromDate);
        const end = parseDateFromInput(toDate);
        if (start && end && start <= end) {
            setCustomDateRange(start, end);
            setShowDatePicker(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const schoolOptions = filterOptions.schools;
    const productOptions = filterOptions.products;
    const sizeOptions = filterOptions.sizes;
    const statusOptions = filterOptions.statuses;

    const hasActiveFilters = filters.schools.length > 0 || filters.products.length > 0 || filters.sizes.length > 0 || filters.statuses.length > 0;

    const clearAllFilters = () => {
        setSchools([]);
        setProducts([]);
        setSizes([]);
        setStatuses([]);
        resetFilters();
    };

    return (
        <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
                {/* Date Range Picker */}
                <div ref={datePickerRef} className="relative">
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{currentPresetLabel}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {showDatePicker && (
                        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-md shadow-lg z-50 p-3">
                            <div className="grid grid-cols-2 gap-1 mb-3">
                                {DATE_PRESETS.map(preset => (
                                    <button
                                        key={preset.value}
                                        onClick={() => handleDatePreset(preset.value)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${filters.dateRange.preset === preset.value
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                                <div className="text-xs font-medium text-slate-500 mb-2">Custom Range</div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-wider">From</label>
                                        <input
                                            type="text"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            placeholder="DD/MM/YYYY"
                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                                        />
                                    </div>
                                    <span className="text-slate-400 mt-4">→</span>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-wider">To</label>
                                        <input
                                            type="text"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            placeholder="DD/MM/YYYY"
                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={applyCustomDateRange}
                                    className="w-full mt-2 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
                                >
                                    Apply Range
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200" />

                {/* Schools Dropdown */}
                <MultiSelectDropdown
                    label="Schools"
                    icon={Building2}
                    options={schoolOptions}
                    selected={filters.schools}
                    onSelect={setSchools}
                />

                {/* Products Dropdown */}
                <MultiSelectDropdown
                    label="Products"
                    icon={Tag}
                    options={productOptions}
                    selected={filters.products}
                    onSelect={setProducts}
                />

                {/* Statuses Dropdown */}
                <MultiSelectDropdown
                    label="Statuses"
                    icon={Clock}
                    options={statusOptions}
                    selected={filters.statuses}
                    onSelect={setStatuses}
                    searchable={false}
                />

                {/* Sizes Dropdown */}
                <MultiSelectDropdown
                    label="Sizes"
                    icon={Ruler}
                    options={sizeOptions}
                    selected={filters.sizes}
                    onSelect={setSizes}
                    searchable={false}
                />

                {/* Clear All */}
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                    >
                        Clear all
                    </button>
                )}
            </div>
        </div>
    );
}
