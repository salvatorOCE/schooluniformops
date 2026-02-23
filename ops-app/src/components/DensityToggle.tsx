'use client';

import { useUI } from '@/lib/ui-context';
import { Layers, Minimize2 } from 'lucide-react';

export function DensityToggle() {
    const { density, toggleDensity } = useUI();

    return (
        <button
            onClick={toggleDensity}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700 text-xs text-slate-400 hover:text-white transition-all group"
            title={`Switch to ${density === 'comfort' ? 'High Density' : 'Comfort'} Mode`}
        >
            {density === 'comfort' ? (
                <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="font-medium">Compact Mode</span>
                </>
            ) : (
                <>
                    <Layers className="w-3.5 h-3.5" />
                    <span className="font-medium">Comfort Mode</span>
                </>
            )}
        </button>
    );
}
