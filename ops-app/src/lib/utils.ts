import { OrderStatus, OrderItem, Order } from './types';

/** Heuristic: item is senior if product name contains senior/year 6/yr 6 (matches Woo split logic). */
export function isItemSenior(item: OrderItem): boolean {
    const name = (item.product_name || '').toLowerCase();
    return ['senior', 'year 6', 'yr 6', 'leaver'].some(kw => name.includes(kw));
}

export function getNonSeniorItems(order: Order): OrderItem[] {
    return order.items.filter(i => !isItemSenior(i));
}

export function getSeniorItems(order: Order): OrderItem[] {
    return order.items.filter(i => isItemSenior(i));
}

export function hasSeniorItems(order: Order): boolean {
    return order.items.some(i => isItemSenior(i));
}

export function hasNonSeniorItems(order: Order): boolean {
    return order.items.some(i => !isItemSenior(i));
}

/** Order with only non-senior items (for display in Non-Senior section). */
export function orderWithOnlyNonSeniorItems(order: Order): Order {
    const items = getNonSeniorItems(order);
    if (items.length === 0) return order;
    return {
        ...order,
        items,
        is_senior_order: false,
    };
}

/** Order with only senior items (for display in Senior section). */
export function orderWithOnlySeniorItems(order: Order): Order {
    const items = getSeniorItems(order);
    if (items.length === 0) return order;
    return {
        ...order,
        items,
        is_senior_order: true,
    };
}

export function getStatusLabel(status: string): string {
    return status || 'Unknown';
}

export function getStatusColor(status: string | undefined): string {
    const s = (status ?? '').toLowerCase();
    if (s.includes('processing')) return 'bg-green-100 text-green-700 border-green-200';
    if (s.includes('completed')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes('shipped')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (s.includes('pending')) return 'bg-slate-100 text-slate-600 border-slate-200';
    if (s.includes('production')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s.includes('cancelled')) return 'bg-red-100 text-red-700 border-red-200';
    if (s.includes('failed')) return 'bg-red-100 text-red-700 border-red-200';
    if (s.includes('on-hold')) return 'bg-red-100 text-red-700 border-red-200';
    if (s.includes('partial order complete') || s.includes('partial completion')) return 'bg-teal-100 text-teal-700 border-teal-200';

    return 'bg-slate-50 text-slate-500 border-slate-100';
}

// Utility functions

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function getAgeInHours(dateString: string): number {
    const now = new Date();
    const then = new Date(dateString);
    return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60));
}

export function getAgeBadgeColor(dateString: string): 'green' | 'yellow' | 'red' {
    const hours = getAgeInHours(dateString);
    if (hours < 24) return 'green';
    if (hours < 48) return 'yellow';
    return 'red';
}

export function getAgeLabel(dateString: string): string {
    const hours = getAgeInHours(dateString);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

export function cn(...classes: (string | boolean | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}
