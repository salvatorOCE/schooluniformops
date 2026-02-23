'use client';

import { getAgeBadgeColor, getAgeLabel } from '@/lib/utils';

interface AgeBadgeProps {
    timestamp: string;
    label?: string;
}

export function AgeBadge({ timestamp, label }: AgeBadgeProps) {
    const color = getAgeBadgeColor(timestamp);
    const age = getAgeLabel(timestamp);

    const colorClasses = {
        green: 'badge-green',
        yellow: 'badge-yellow',
        red: 'badge-red',
    };

    return (
        <span className={`badge ${colorClasses[color]}`}>
            {label && <span className="mr-1">{label}:</span>}
            {age}
        </span>
    );
}
