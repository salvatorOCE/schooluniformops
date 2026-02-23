'use client';

import { SchoolRunGroup } from '@/lib/types';

interface ManifestModalProps {
    schoolRun: SchoolRunGroup;
    onClose: () => void;
}

export function ManifestModal({ schoolRun, onClose }: ManifestModalProps) {
    // Sort orders by student name
    const sortedOrders = [...schoolRun.orders].sort((a, b) =>
        (a.student_name || '').localeCompare(b.student_name || '')
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-lg">School Manifest</h2>
                        <p className="text-sm text-gray-500">{schoolRun.school_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                        ×
                    </button>
                </div>

                <div className="p-4">
                    {/* Header */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">School Code</p>
                                <p className="text-xl font-bold text-slate-800">{schoolRun.school_code}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600">{schoolRun.order_count}</p>
                                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">orders</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-slate-600">{schoolRun.item_count}</p>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">items</p>
                            </div>
                        </div>
                    </div>

                    {/* Sorted student list */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left p-3 font-semibold text-slate-600">Student Name</th>
                                    <th className="text-left p-3 font-semibold text-slate-600">Order #</th>
                                    <th className="text-left p-3 font-semibold text-slate-600">Items</th>
                                    <th className="text-center p-3 font-semibold text-slate-600">✓</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedOrders.map((order, idx) => (
                                    <tr key={order.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="p-3 font-medium">{order.student_name}</td>
                                        <td className="p-3 text-gray-600">{order.order_number}</td>
                                        <td className="p-3 text-gray-600">
                                            {order.items.map(i => `${i.product_name} (${i.size}) ×${i.quantity}`).join(', ')}
                                        </td>
                                        <td className="p-3 text-center">
                                            <input type="checkbox" className="w-4 h-4" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer note */}
                    <p className="text-xs text-gray-400 mt-4 text-center">
                        Manifest generated {new Date().toLocaleDateString('en-AU')} • {sortedOrders.length} students
                    </p>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-outline">
                        Cancel
                    </button>
                    <button className="btn btn-primary">
                        🖨️ Print Manifest
                    </button>
                </div>
            </div>
        </div>
    );
}
