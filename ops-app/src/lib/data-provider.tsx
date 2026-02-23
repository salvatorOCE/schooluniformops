'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { DataAdapter } from './data-adapter';
import { MockAdapter } from './mock-adapter';
import { SupabaseAdapter } from './supabase-adapter';

const DataContext = createContext<DataAdapter | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
    // In the future, we can toggle this based on env vars or user settings
    const adapter = useMemo(() => {
        // Default to Real Data unless explicitly requesting Mock
        const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
        return useMockData ? new MockAdapter() : new SupabaseAdapter();
    }, []);

    return (
        <DataContext.Provider value={adapter}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
