import { supabaseAdmin } from './supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize order number to digits (e.g. "SUS 191" / "SUS-0191" -> "191") */
function normalizeOrderNumberDigits(value: string): string {
    const trimmed = value.trim().replace(/^SUS[- ]*/i, '');
    const digits = trimmed.replace(/\D/g, '');
    return digits || trimmed;
}

/** Resolve orderId (UUID or order_number like "SUS 191", "SUS-0191", "191") to Supabase order UUID */
export async function resolveOrderUuid(orderId: string): Promise<string | null> {
    if (!supabaseAdmin) return null;
    if (UUID_REGEX.test(orderId)) return orderId;

    const candidates: string[] = [orderId.trim()];
    const digits = normalizeOrderNumberDigits(orderId);
    if (digits && !candidates[0].includes(digits)) {
        candidates.push(`SUS ${digits}`, `SUS ${digits.padStart(4, '0')}`, `SUS-${digits}`, `SUS-${digits.padStart(4, '0')}`);
    }

    for (const candidate of candidates) {
        const { data } = await supabaseAdmin.from('orders').select('id').eq('order_number', candidate).maybeSingle();
        if (data != null && (data as { id?: string }).id) return (data as { id: string }).id;
    }
    return null;
}
