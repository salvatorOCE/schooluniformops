'use client';

import React, { createContext, useContext, useState } from 'react';

type Density = 'comfort' | 'compact';

interface UIContextType {
    density: Density;
    toggleDensity: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [density] = useState<Density>('comfort');

    const toggleDensity = () => {};

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
