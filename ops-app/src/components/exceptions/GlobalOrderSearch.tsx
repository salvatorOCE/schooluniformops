'use client';

import { useState, useEffect } from 'react';
import { Search, Package, User, School, ArrowRight } from 'lucide-react';
import { Order } from '@/lib/types';
import { useData } from '@/lib/data-provider';
import { getStatusLabel, getStatusColor } from '@/lib/utils';

interface GlobalOrderSearchProps {
    onSelectOrder: (order: Order) => void;
}

export function GlobalOrderSearch({ onSelectOrder }: GlobalOrderSearchProps) {
    const adapter = useData();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Order[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    // Debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    // Search Effect
    useEffect(() => {
        const search = async () => {
            if (debouncedQuery.length < 2) {
                setResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const data = await adapter.searchOrders(debouncedQuery);
                setResults(data);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        };

        search();
    }, [debouncedQuery]);

    return (
        <div className="relative w-full max-w-2xl z-20">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className={`h-5 w-5 ${isSearching ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 shadow-sm transition-all text-base"
                    placeholder="Search Order #, Student, or Parent..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                {query.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            {results.length} found
                        </span>
                    </div>
                )}
            </div>

            {/* Results Dropdown */}
            {query.length >= 2 && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-h-[60vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="py-1">
                        {results.map((order) => (
                            <div
                                key={order.id}
                                onClick={() => {
                                    setQuery('');
                                    setResults([]);
                                    onSelectOrder(order);
                                }}
                                className="group px-4 py-3 hover:bg-emerald-50/80 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border ${getStatusColor(order.order_status)}`}>
                                            {order.student_name ? order.student_name.charAt(0) : '#'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">{order.order_number}</span>
                                                <span className="text-sm text-slate-600 font-medium">{order.student_name || 'No Name'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.parent_name}</span>
                                                <span className="flex items-center gap-1"><School className="w-3 h-3" /> {order.school_name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block border ${getStatusColor(order.order_status)}`}>
                                                {getStatusLabel(order.order_status)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
