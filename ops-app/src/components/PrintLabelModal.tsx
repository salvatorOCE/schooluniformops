'use client';

import { Order } from '@/lib/types';

interface PrintLabelModalProps {
    order: Order;
    onClose: () => void;
}

export function PrintLabelModal({ order, onClose }: PrintLabelModalProps) {
    const renderHomeLabel = () => (
        <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg bg-white">
            <div className="text-center mb-6">
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">SHIPPING LABEL</h3>
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">School Uniform Solutions</p>
            </div>

            <div className="border-t border-b py-4 my-4">
                <p className="text-xs text-gray-500 mb-1">SHIP TO:</p>
                <p className="font-bold">{order.parent_name}</p>
                {order.shipping_address && (
                    <>
                        <p>{order.shipping_address.line1}</p>
                        {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                        <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postcode}</p>
                    </>
                )}
            </div>

            <div className="flex justify-between text-sm">
                <div>
                    <p className="text-gray-500">Order #</p>
                    <p className="font-bold">{order.order_number}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-500">Items</p>
                    <p className="font-bold">{order.items.reduce((sum, i) => sum + i.quantity, 0)}</p>
                </div>
            </div>

            {/* Barcode placeholder */}
            <div className="mt-4 h-12 bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                [BARCODE PLACEHOLDER]
            </div>
        </div>
    );

    const renderSchoolLabel = () => (
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center mb-4">
                <h3 className="font-bold text-lg">SCHOOL DELIVERY</h3>
                <p className="text-2xl font-bold text-blue-600">{order.school_name}</p>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1">STUDENT</p>
                <p className="text-xl font-bold">{order.student_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-gray-500">Order #</p>
                    <p className="font-bold">{order.order_number}</p>
                </div>
                <div>
                    <p className="text-gray-500">Parent</p>
                    <p className="font-bold">{order.parent_name}</p>
                </div>
            </div>

            <div className="mt-4 border-t pt-4">
                <p className="text-xs text-gray-500 mb-2">ITEMS</p>
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                        <span>{item.product_name} ({item.size}){item.nickname ? ` — ${item.nickname}` : ''}</span>
                        <span>×{item.quantity}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStoreLabel = () => (
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center mb-4">
                <h3 className="font-bold text-lg">STORE PICKUP</h3>
                <p className="text-sm text-gray-500">Ready for Collection</p>
            </div>

            <div className="bg-green-100 rounded-lg p-4 mb-4 text-center">
                <p className="text-xs text-green-700 mb-1">PICKUP CODE</p>
                <p className="text-3xl font-bold font-mono text-green-800">
                    {order.order_number.split('-')[1]}
                </p>
            </div>

            <div className="text-center mb-4">
                <p className="text-gray-500 text-sm">Customer</p>
                <p className="font-bold text-lg">{order.parent_name}</p>
            </div>

            <div className="text-sm text-center text-gray-500">
                <p>{order.items.reduce((sum, i) => sum + i.quantity, 0)} items • {order.order_number}</p>
            </div>

            {/* Barcode placeholder */}
            <div className="mt-4 h-12 bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                [BARCODE PLACEHOLDER]
            </div>
        </div>
    );

    const labelTypes = {
        HOME: { title: 'Shipping Label', render: renderHomeLabel },
        SCHOOL: { title: 'School Manifest Label', render: renderSchoolLabel },
        STORE: { title: 'Pickup Shelf Label', render: renderStoreLabel },
    };

    const { title, render } = labelTypes[order.delivery_type];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="font-bold text-lg">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                        ×
                    </button>
                </div>

                <div className="p-4">
                    {render()}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-outline">
                        Cancel
                    </button>
                    <button className="btn btn-primary">
                        🖨️ Print Label
                    </button>
                </div>
            </div>
        </div>
    );
}
