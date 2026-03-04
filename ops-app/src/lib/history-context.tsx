'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useData } from './data-provider';
import {
    HistoryEntityType,
    HistoryActionType,
    HistoryEvent,
    OrderHistoryItem,
    OrderHistoryRecord,
    BatchHistoryRecord,
    RunHistoryRecord
} from './types';

// --- Context State ---

interface HistoryContextType {
    orders: OrderHistoryRecord[];
    batches: BatchHistoryRecord[];
    runs: RunHistoryRecord[];
    loading: boolean;
    logEvent: (event: Omit<HistoryEvent, 'id' | 'timestamp'>) => void;
    getOrder: (orderId: string) => OrderHistoryRecord | undefined;
    /** Refetch orders/batches/runs from the adapter (e.g. after syncing dates from WooCommerce) */
    refresh: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

// --- Provider ---

interface HistoryProviderProps {
    children: ReactNode;
    /** When set (school user), only orders for this school are exposed */
    schoolCode?: string | null;
}

export function HistoryProvider({ children, schoolCode }: HistoryProviderProps) {
    const adapter = useData();
    const [orders, setOrders] = useState<OrderHistoryRecord[]>([]);
    const [batches, setBatches] = useState<BatchHistoryRecord[]>([]);
    const [runs, setRuns] = useState<RunHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (schoolCode?.trim()) params.set('schoolCode', schoolCode.trim());
            const [ordersRes, b, r] = await Promise.all([
                fetch(`/api/orders/history?${params.toString()}`),
                adapter.getHistoryBatches(),
                adapter.getHistoryRuns()
            ]);
            let o: OrderHistoryRecord[] = [];
            if (ordersRes.ok) {
                const raw = await ordersRes.json();
                o = (Array.isArray(raw) ? raw : []).map((row: any) => ({
                    ...row,
                    createdAt: new Date(row.createdAt),
                    updatedAt: new Date(row.updatedAt),
                    paidAt: row.paidAt ? new Date(row.paidAt) : undefined,
                    events: (row.events || []).map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) })),
                })) as OrderHistoryRecord[];
            }
            setOrders(o);
            setBatches(b);
            setRuns(r);
        } catch (error) {
            console.error("Failed to load history data:", error);
        } finally {
            setLoading(false);
        }
    }, [adapter, schoolCode]);

    const filteredOrders = schoolCode
        ? orders.filter((o) => {
            const norm = (v: string | null | undefined) => (v || '').trim().toUpperCase();
            const target = norm(schoolCode);
            if (!target) return true;
            const code = norm(o.schoolCode);
            const name = norm(o.schoolName);

            // Direct or prefix match on code
            if (code && (code === target || code.startsWith(target) || target.startsWith(code))) {
                return true;
            }
            // Fuzzy match on name (e.g. "WARRADALE" inside "WARRADALE PRIMARY SCHOOL")
            if (name && (name.includes(target) || target.includes(name))) {
                return true;
            }
            return false;
        })
        : orders;

    useEffect(() => {
        load();
    }, [load]);

    const refresh = useCallback(() => load(), [load]);

    const logEvent = (eventData: Omit<HistoryEvent, 'id' | 'timestamp'>) => {
        const newEvent: HistoryEvent = {
            ...eventData,
            id: crypto.randomUUID(),
            timestamp: new Date()
        };

        // If it's an order event, append to the specific order's timeline
        if (eventData.entityType === 'ORDER') {
            setOrders(prev => prev.map((o) => {
                if (o.orderId === eventData.entityId) {
                    return {
                        ...o,
                        events: [newEvent, ...o.events], // Newest first for internal storage, but UI might reverse
                        updatedAt: new Date()
                    };
                }
                return o;
            }));
        }

        // Also could add to a global event log if we had one
        console.log('Event Logged:', newEvent);
    };

    const getOrder = (orderId: string) => filteredOrders.find(o => o.orderId === orderId);

    return (
        <HistoryContext.Provider value={{ orders: filteredOrders, batches, runs, loading, logEvent, getOrder, refresh }}>
            {children}
        </HistoryContext.Provider>
    );
}

export function useHistory() {
    const context = useContext(HistoryContext);
    if (!context) {
        throw new Error('useHistory must be used within a HistoryProvider');
    }
    return context;
}

