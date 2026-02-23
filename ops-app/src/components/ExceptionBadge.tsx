'use client';

interface ExceptionBadgeProps {
    type: 'MISSING_STUDENT_NAME' | 'MISSING_SCHOOL_CODE' | 'MISSING_BOTH';
}

export function ExceptionBadge({ type }: ExceptionBadgeProps) {
    const labels = {
        MISSING_STUDENT_NAME: 'Missing Student Name',
        MISSING_SCHOOL_CODE: 'Missing School Code',
        MISSING_BOTH: 'Missing Student & School',
    };

    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <span>⚠️</span>
            {labels[type]}
        </span>
    );
}
