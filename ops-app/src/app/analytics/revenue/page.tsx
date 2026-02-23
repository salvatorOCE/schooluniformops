'use client';

import { BarChart3 } from 'lucide-react';

export default function AnalyticsRevenue() {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center p-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Revenue Analysis</h3>
            <p className="text-slate-500 max-w-sm mt-2">
                Detailed financial breakdowns including tax, shipping, and coupons will appear here.
            </p>
        </div>
    );
}
