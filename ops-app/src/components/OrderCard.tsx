'use client';

import { Order } from '@/lib/types';
import { AgeBadge } from './AgeBadge';

interface OrderCardProps {
    order: Order;
    showAge?: boolean;
    actions?: React.ReactNode;
    onClick?: () => void;
}

export function OrderCard({ order, showAge = true, actions, onClick }: OrderCardProps) {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const deliveryBadge = {
        HOME: { label: 'Home', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        SCHOOL: { label: 'School', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        STORE: { label: 'Store', class: 'bg-amber-50 text-amber-700 border-amber-200' },
    }[order.delivery_type] || { label: order.delivery_type, class: 'bg-slate-100' };

    return (
        <div
            className="bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-pointer p-4 group"
            onClick={onClick}
        >
            {/* Header: Order # + Status */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-base tracking-tight">{order.order_number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${deliveryBadge.class}`}>
                            {deliveryBadge.label}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <span className="text-slate-900">{order.parent_name}</span>
                        {/* <span className="text-slate-300">•</span>
                        <span>{order.email}</span> */}
                    </div>
                </div>
                {showAge && <AgeBadge timestamp={order.paid_at} />}
            </div>

            {/* Core Data Grid */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 bg-slate-50/50 p-2 rounded border border-slate-100/50">
                <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student</div>
                    <div className="text-sm font-semibold text-slate-700 truncate">{order.student_name || '—'}</div>
                </div>
                <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">School</div>
                    <div className="text-sm font-medium text-slate-600 truncate">{order.school_name || '—'}</div>
                </div>
            </div>

            {/* Item Summary (Engineered List) */}
            <div className="space-y-1 mb-4">
                {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs border-b border-dashed border-slate-100 pb-1 last:border-0 last:pb-0">
                        <span className="text-slate-600 truncate flex-1 pr-2">
                            {item.product_name} <span className="text-slate-400 font-mono">({item.size})</span>
                        </span>
                        <span className="font-bold text-slate-800 bg-slate-100 px-1.5 rounded">x{item.quantity}</span>
                    </div>
                ))}
                {order.items.length > 3 && (
                    <div className="text-[10px] text-slate-400 font-medium italic pt-1">
                        + {order.items.length - 3} more items...
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            {actions && (
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {actions}
                </div>
            )}
        </div>
    );
}
