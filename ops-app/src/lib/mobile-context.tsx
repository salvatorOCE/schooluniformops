'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MobileContextType {
    isMobile: boolean;
    isSimulating: boolean;
    setIsSimulating: (simulating: boolean) => void;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

export function MobileProvider({ children }: { children: ReactNode }) {
    const [isSimulating, setIsSimulating] = useState(false);
    const [isMobileWindow, setIsMobileWindow] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobileWindow(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // It's "mobile" if either the window is truly small, OR the user clicked Simulate
    const isMobile = isMobileWindow || isSimulating;

    return (
        <MobileContext.Provider value={{ isMobile, isSimulating, setIsSimulating }}>
            {children}
        </MobileContext.Provider>
    );
}

export function useMobile() {
    const context = useContext(MobileContext);
    if (!context) {
        return { isMobile: false, isSimulating: false, setIsSimulating: () => { } };
    }
    return context;
}
