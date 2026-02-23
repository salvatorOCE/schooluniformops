'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Density = 'comfort' | 'compact';

interface UIContextType {
    density: Density;
    toggleDensity: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [density, setDensity] = useState<Density>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ops-ui-density');
            return (saved === 'comfort' || saved === 'compact') ? saved : 'comfort';
        }
        return 'comfort';
    });

    const toggleDensity = () => {
        setDensity(prev => {
            const next = prev === 'comfort' ? 'compact' : 'comfort';
            localStorage.setItem('ops-ui-density', next);
            return next;
        });
    };

    return (
        <UIContext.Provider value={{ density, toggleDensity }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
