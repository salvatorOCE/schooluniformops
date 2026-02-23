'use client';

import { useEffect, useCallback, useRef } from 'react';

interface HotkeyConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
    /** If true, hotkey works even when an input/textarea is focused */
    global?: boolean;
}

/**
 * Custom hook for keyboard shortcuts.
 * Automatically unregisters when component unmounts.
 *
 * Usage:
 *   useHotkeys([
 *     { key: 'd', action: markDone, description: 'Mark Done' },
 *     { key: 'ArrowRight', action: nextOrder, description: 'Next Order' },
 *     { key: 'Escape', action: goBack, description: 'Back', global: true },
 *   ]);
 */
export function useHotkeys(hotkeys: HotkeyConfig[], enabled = true) {
    const hotkeysRef = useRef(hotkeys);
    hotkeysRef.current = hotkeys;

    const handler = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // Skip if user is typing in an input, unless hotkey is global
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        for (const hk of hotkeysRef.current) {
            if (isInput && !hk.global) continue;

            const keyMatch = e.key.toLowerCase() === hk.key.toLowerCase() || e.code.toLowerCase() === hk.key.toLowerCase();
            const ctrlMatch = hk.ctrl ? (e.ctrlKey || e.metaKey) : true;
            const shiftMatch = hk.shift ? e.shiftKey : true;
            const altMatch = hk.alt ? e.altKey : true;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                e.preventDefault();
                hk.action();
                return;
            }
        }
    }, [enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handler]);
}

/**
 * Returns a formatted list of active hotkeys for display in a help tooltip.
 */
export function formatHotkeys(hotkeys: HotkeyConfig[]): string[] {
    return hotkeys.map(hk => {
        const parts: string[] = [];
        if (hk.ctrl) parts.push('⌘');
        if (hk.shift) parts.push('⇧');
        if (hk.alt) parts.push('⌥');

        // Friendly key names
        const keyName = {
            'arrowright': '→',
            'arrowleft': '←',
            'arrowup': '↑',
            'arrowdown': '↓',
            'escape': 'Esc',
            'enter': '↵',
            ' ': 'Space',
        }[hk.key.toLowerCase()] || hk.key.toUpperCase();

        parts.push(keyName);
        return `${parts.join('')} — ${hk.description}`;
    });
}
