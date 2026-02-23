// Fuzzy search utilities for smart filter system

/**
 * Normalize text for comparison - removes punctuation, extra spaces, lowercases
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[''`"]/g, '')           // Remove quotes
        .replace(/[-_\/\\()[\]{}]/g, ' ') // Replace separators with spaces
        .replace(/[^\w\s]/g, '')          // Remove other punctuation
        .replace(/\s+/g, ' ')             // Collapse multiple spaces
        .trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses a combination of token matching and substring matching
 */
export function fuzzyScore(query: string, target: string): number {
    const normalizedQuery = normalizeText(query);
    const normalizedTarget = normalizeText(target);

    if (!normalizedQuery) return 0;
    if (normalizedTarget === normalizedQuery) return 1;
    if (normalizedTarget.includes(normalizedQuery)) return 0.9;

    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    const targetTokens = normalizedTarget.split(' ').filter(Boolean);

    let matchedTokens = 0;
    for (const qt of queryTokens) {
        for (const tt of targetTokens) {
            if (tt.startsWith(qt) || tt.includes(qt)) {
                matchedTokens++;
                break;
            }
        }
    }

    // Score based on how many query tokens matched
    const tokenScore = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;

    // Bonus for shorter targets (more specific matches)
    const lengthBonus = Math.max(0, 1 - (normalizedTarget.length / 50)) * 0.1;

    return Math.min(tokenScore + lengthBonus, 1);
}

/**
 * Check if query fuzzy-matches target with score >= threshold
 */
export function fuzzyMatch(query: string, target: string, threshold = 0.5): boolean {
    return fuzzyScore(query, target) >= threshold;
}

/**
 * Parse natural language date input
 */
export function parseDateInput(input: string): { start: Date; end: Date } | null {
    const normalized = input.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Presets
    if (normalized === 'today') {
        return { start: today, end: today };
    }

    // "last X days" pattern
    const lastDaysMatch = normalized.match(/last\s*(\d+)\s*days?/);
    if (lastDaysMatch) {
        const days = parseInt(lastDaysMatch[1]);
        const start = new Date(today);
        start.setDate(start.getDate() - days);
        return { start, end: today };
    }

    // "last X weeks" pattern
    const lastWeeksMatch = normalized.match(/last\s*(\d+)\s*weeks?/);
    if (lastWeeksMatch) {
        const weeks = parseInt(lastWeeksMatch[1]);
        const start = new Date(today);
        start.setDate(start.getDate() - (weeks * 7));
        return { start, end: today };
    }

    if (normalized === 'this week') {
        const dayOfWeek = today.getDay();
        const start = new Date(today);
        start.setDate(start.getDate() - dayOfWeek);
        return { start, end: today };
    }

    if (normalized === 'this month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start, end: today };
    }

    if (normalized.includes('term')) {
        // School term - approximate to last 10 weeks
        const start = new Date(today);
        start.setDate(start.getDate() - 70);
        return { start, end: today };
    }

    // Try to parse date range with separator
    const rangeSeparators = [' - ', ' to ', '-'];
    for (const sep of rangeSeparators) {
        if (normalized.includes(sep)) {
            const parts = normalized.split(sep).map(p => p.trim());
            if (parts.length === 2) {
                const start = parseFlexibleDate(parts[0]);
                const end = parseFlexibleDate(parts[1]);
                if (start && end) {
                    return { start, end };
                }
            }
        }
    }

    // Try single date
    const singleDate = parseFlexibleDate(normalized);
    if (singleDate) {
        return { start: singleDate, end: singleDate };
    }

    return null;
}

/**
 * Parse a flexible date format
 */
function parseFlexibleDate(input: string): Date | null {
    const today = new Date();
    const currentYear = today.getFullYear();

    // DD/MM/YY or DD/MM/YYYY
    const slashMatch = input.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (slashMatch) {
        const day = parseInt(slashMatch[1]);
        const month = parseInt(slashMatch[2]) - 1;
        let year = slashMatch[3] ? parseInt(slashMatch[3]) : currentYear;
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    // DD-MM-YY or DD-MM-YYYY
    const dashMatch = input.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?$/);
    if (dashMatch) {
        const day = parseInt(dashMatch[1]);
        const month = parseInt(dashMatch[2]) - 1;
        let year = dashMatch[3] ? parseInt(dashMatch[3]) : currentYear;
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    // Month name patterns: "Jan 1", "1 Jan", "January 1"
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    for (let i = 0; i < months.length; i++) {
        const pattern = new RegExp(`(${months[i]}\\w*)\\s*(\\d{1,2})|^(\\d{1,2})\\s*(${months[i]}\\w*)`, 'i');
        const match = input.match(pattern);
        if (match) {
            const day = parseInt(match[2] || match[3]);
            return new Date(currentYear, i, day);
        }
    }

    return null;
}

export interface FilterSuggestion {
    type: 'school' | 'product' | 'sku' | 'size' | 'delivery' | 'date' | 'text';
    label: string;
    value: string;
    displayValue?: string;
}

/**
 * Parse typed filter patterns like "school: mary" or "sku: jacket"
 */
export function parseTypedFilter(input: string): { type: string; value: string } | null {
    const patterns = [
        { regex: /^school:\s*(.+)/i, type: 'school' },
        { regex: /^sku:\s*(.+)/i, type: 'sku' },
        { regex: /^product:\s*(.+)/i, type: 'product' },
        { regex: /^size:\s*(.+)/i, type: 'size' },
        { regex: /^delivery:\s*(.+)/i, type: 'delivery' },
        { regex: /^date:\s*(.+)/i, type: 'date' },
    ];

    for (const { regex, type } of patterns) {
        const match = input.match(regex);
        if (match) {
            return { type, value: match[1].trim() };
        }
    }

    return null;
}
