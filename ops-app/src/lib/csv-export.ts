/**
 * CSV Export Utility
 *
 * Converts an array of objects into a downloadable CSV file.
 * Handles special characters, dates, nested objects, and arrays.
 */

interface CsvExportOptions<T> {
    /** Column definitions: key = object property, label = CSV header */
    columns: { key: keyof T | string; label: string; formatter?: (value: any, row: T) => string }[];
    /** Filename without extension */
    filename: string;
}

function escapeCSV(value: unknown): string {
    if (value === null || value === undefined) return '';

    let str: string;

    if (value instanceof Date) {
        str = value.toISOString();
    } else if (typeof value === 'object') {
        str = JSON.stringify(value);
    } else {
        str = String(value);
    }

    // Escape quotes and wrap in quotes if contains special chars
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

function getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function exportToCSV<T extends Record<string, any>>(data: T[], options: CsvExportOptions<T>): void {
    if (data.length === 0) return;

    const { columns, filename } = options;

    // Header row
    const header = columns.map(c => escapeCSV(c.label)).join(',');

    // Data rows
    const rows = data.map(row =>
        columns.map(col => {
            const rawValue = getNestedValue(row, col.key as string);
            const formatted = col.formatter ? col.formatter(rawValue, row) : rawValue;
            return escapeCSV(formatted);
        }).join(',')
    );

    const csv = [header, ...rows].join('\n');

    // Trigger download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Pre-built column configs for common exports
export const CSV_PRESETS = {
    orders: (data: any[]) => exportToCSV(data, {
        filename: 'orders_export',
        columns: [
            { key: 'order_number', label: 'Order #' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'school_name', label: 'School' },
            { key: 'student_name', label: 'Student' },
            { key: 'order_status', label: 'Status' },
            { key: 'items', label: 'Item Count', formatter: (v: any[]) => String(v?.length || 0) },
            { key: 'total', label: 'Total', formatter: (v: number) => v?.toFixed(2) || '0.00' },
            { key: 'created_at', label: 'Created', formatter: (v: string) => v ? new Date(v).toLocaleDateString() : '' },
        ]
    }),
    production: (data: any[]) => exportToCSV(data, {
        filename: 'production_export',
        columns: [
            { key: 'school_name', label: 'School' },
            { key: 'order_count', label: 'Orders' },
            { key: 'total_units', label: 'Total Units' },
            { key: 'oldest_order_date', label: 'Oldest Order' },
            { key: 'batch_status', label: 'Status' },
        ]
    }),
};
