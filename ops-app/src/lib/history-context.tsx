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

export function HistoryProvider({ children }: { children: ReactNode }) {
    const adapter = useData();
    const [orders, setOrders] = useState<OrderHistoryRecord[]>([]);
    const [batches, setBatches] = useState<BatchHistoryRecord[]>([]);
    const [runs, setRuns] = useState<RunHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [o, b, r] = await Promise.all([
                adapter.getHistoryOrders(),
                adapter.getHistoryBatches(),
                adapter.getHistoryRuns()
            ]);
            setOrders(o);
            setBatches(b);
            setRuns(r);
        } catch (error) {
            console.error("Failed to load history data:", error);
        } finally {
            setLoading(false);
        }
    }, [adapter]);

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
            setOrders(prev => prev.map(o => {
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

    const getOrder = (orderId: string) => orders.find(o => o.orderId === orderId);

    return (
        <HistoryContext.Provider value={{ orders, batches, runs, loading, logEvent, getOrder, refresh }}>
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

