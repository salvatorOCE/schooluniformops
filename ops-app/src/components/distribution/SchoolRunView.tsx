'use client';

import { Order, SchoolRunGroup } from '@/lib/types';
import { OrderCard } from '@/components/OrderCard';
import { useState } from 'react';

interface SchoolRunViewProps {
    batches: SchoolRunGroup[];
    onPack: (orderId: string) => void;
    onPackSchoolInfo: (schoolCode: string) => void;
    onDispatchRun: (schoolCode: string) => void;
    onPrintLabel: (order: Order) => void;
    onReportIssue: (order: Order) => void;
}

export function SchoolRunView({ batches, onPack, onPackSchoolInfo, onDispatchRun, onPrintLabel, onReportIssue }: SchoolRunViewProps) {
    const [expandedSchool, setExpandedSchool] = useState<string | null>(null);

    const toggleSchool = (code: string) => {
        setExpandedSchool(current => current === code ? null : code);
    };

    if (batches.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-4xl mb-4">🏫</p>
                <p className="text-xl font-semibold text-gray-700">No School Runs Active</p>
                <p className="text-gray-500">All school orders are packed or queue is empty.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {batches.map((batch) => (
                <div key={batch.school_code} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* Header */}
                    <div
                        className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => toggleSchool(batch.school_code)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                {batch.school_name.substring(0, 1)}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{batch.school_name}</h3>
                                <div className="flex gap-3 text-sm text-slate-500">
                                    <span>📦 {batch.order_count} Orders</span>
                                    <span>👕 {batch.item_count} Items</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPackSchoolInfo(batch.school_code);
                                }}
                                className="btn bg-blue-600 hover:bg-blue-700 text-white border-none px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
                            >
                                Pack Batch
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDispatchRun(batch.school_code);
                                }}
                                className="btn bg-green-600 hover:bg-green-700 text-white border-none px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
                            >
                                Order Delivered &amp; Complete
                            </button>
                            <span className={`transform transition-transform ${expandedSchool === batch.school_code ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </div>
                    </div>

                    {/* Orders Grid */}
                    {expandedSchool === batch.school_code && (
                        <div className="p-4 bg-slate-50/50 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {batch.orders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        showAge={true}
                                        actions={
                                            <div className="flex gap-2 w-full">
                                                <button
                                                    onClick={() => onPrintLabel(order)}
                                                    className="btn btn-outline flex-1 text-xs"
                                                >
                                                    Print
                                                </button>
                                                <button
                                                    onClick={() => onPack(order.id)}
                                                    className="btn btn-primary flex-1 text-xs"
                                                >
                                                    Pack
                                                </button>
                                                <button
                                                    onClick={() => onReportIssue(order)}
                                                    className="btn btn-ghost text-red-500 hover:bg-red-50 px-2"
                                                    title="Report Issue"
                                                >
                                                    ⚠️
                                                </button>
                                            </div>
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
