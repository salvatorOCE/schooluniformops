'use client';

import { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import { useData } from '@/lib/data-provider';

interface BulkOrderModalProps {
    onClose: () => void;
    onSave: () => void;
}

interface SelectedItem {
    id: string; // unique row id
    productId: string;
    productName: string;
    sku: string;
    size: string;
    quantity: number;
    price: number;
}

export function BulkOrderModal({ onClose, onSave }: BulkOrderModalProps) {
    const adapter = useData();
    const [saving, setSaving] = useState(false);

    const [schoolId, setSchoolId] = useState('');
    const [isAddingSchool, setIsAddingSchool] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolCode, setNewSchoolCode] = useState('');

    const [orderNumber, setOrderNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [studentName, setStudentName] = useState('');
    const [orderStatus, setOrderStatus] = useState('Processing');

    const [items, setItems] = useState<SelectedItem[]>([]);

    const [schools, setSchools] = useState<{ id: string, name: string, code: string }[]>([]);
    const [products, setProducts] = useState<{ id: string, name: string, sku: string, price: number, sizes: string[] }[]>([]);

    // Fetch schools on mount
    useEffect(() => {
        const loadSchools = async () => {
            try {
                const data = await adapter.getSchools();
                setSchools(data);
            } catch (error) {
                console.error('Failed to load schools', error);
            }
        };
        loadSchools();
    }, [adapter]);

    // Fetch products when school changes
    useEffect(() => {
        const loadProducts = async () => {
            if (!schoolId) {
                setProducts([]);
                return;
            }
            try {
                const data = await adapter.getProductsBySchool(schoolId);
                setProducts(data);
            } catch (error) {
                console.error('Failed to load products', error);
            }
        };
        loadProducts();
    }, [schoolId, adapter]);

    const addItem = () => {
        setItems([...items, {
            id: Date.now().toString(),
            productId: '',
            productName: '',
            sku: '',
            size: '',
            quantity: 1,
            price: 0
        }]);
    };

    const updateItem = (id: string, updates: Partial<SelectedItem>) => {
        setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSave = async () => {
        if ((!schoolId && !isAddingSchool) || items.length === 0) return;
        if (isAddingSchool && (!newSchoolName || !newSchoolCode)) return;

        setSaving(true);
        try {
            let finalSchoolId = schoolId;
            if (isAddingSchool) {
                const newSchool = await adapter.createSchool(newSchoolName, newSchoolCode);
                finalSchoolId = newSchool.id;
            }

            await adapter.createBulkOrder(
                finalSchoolId,
                { orderNumber, customerName, studentName, status: orderStatus },
                items
            );
            onSave();
        } catch (error) {
            console.error('Failed to create bulk order:', error);
            alert('Failed to save bulk order. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const calculateTotal = () => items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Create Bulk Order</h2>
                        <p className="text-slate-500 text-sm mt-1">Record a manual offline order for a school</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        {/* School Selection */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-slate-700">School Details</label>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingSchool(!isAddingSchool)}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                    {isAddingSchool ? 'Select Existing School' : '+ Create New School'}
                                </button>
                            </div>

                            {isAddingSchool ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="School Name (e.g., St John's Grammar)"
                                            className="w-full border-slate-200 rounded-lg p-2.5 text-sm"
                                            value={newSchoolName}
                                            onChange={(e) => setNewSchoolName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="School Code (e.g., SJGS)"
                                            className="w-full border-slate-200 rounded-lg p-2.5 text-sm uppercase"
                                            value={newSchoolCode}
                                            onChange={(e) => setNewSchoolCode(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <select
                                    className="w-full border-slate-200 rounded-lg p-2.5 text-slate-700 bg-white"
                                    value={schoolId}
                                    onChange={(e) => setSchoolId(e.target.value)}
                                >
                                    <option value="">-- Choose a school --</option>
                                    {schools.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Order Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Order / PO Number (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Auto-generated if blank"
                                    className="w-full border-slate-200 rounded-lg p-2 text-sm"
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                                <select
                                    className="w-full border-slate-200 rounded-lg p-2 text-sm"
                                    value={orderStatus}
                                    onChange={(e) => setOrderStatus(e.target.value)}
                                >
                                    <option value="Processing">Processing</option>
                                    <option value="In Production">In Production</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Customer / Contact Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., School Admin"
                                    className="w-full border-slate-200 rounded-lg p-2 text-sm"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Department / Attention</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Uniform Shop"
                                    className="w-full border-slate-200 rounded-lg p-2 text-sm"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Order Items */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-slate-700">Order Items</label>
                                <button onClick={addItem} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Add Line Item
                                </button>
                            </div>

                            <div className="space-y-3">
                                {items.length === 0 ? (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                        <p className="text-slate-500 mb-2">No items added yet</p>
                                        <button onClick={addItem} className="btn bg-white border shadow-sm">
                                            Add First Item
                                        </button>
                                    </div>
                                ) : (
                                    items.map((item, index) => (
                                        <div key={item.id} className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">Template</label>
                                                <select
                                                    className="w-full border-slate-200 rounded text-sm py-1.5"
                                                    value={item.productId}
                                                    onChange={(e) => {
                                                        const p = products.find(p => p.id === e.target.value);
                                                        updateItem(item.id, {
                                                            productId: e.target.value,
                                                            productName: p?.name || '',
                                                            sku: p?.sku || '',
                                                            price: p?.price || 0
                                                        });
                                                    }}
                                                >
                                                    <option value="">Custom</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex-[1.5]">
                                                <label className="block text-xs text-slate-500 mb-1">Item Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Name"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5"
                                                    value={item.productName}
                                                    onChange={(e) => updateItem(item.id, { productName: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">SKU</label>
                                                <input
                                                    type="text"
                                                    placeholder="SKU"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5"
                                                    value={item.sku}
                                                    onChange={(e) => updateItem(item.id, { sku: e.target.value })}
                                                />
                                            </div>
                                            <div className="w-16">
                                                <label className="block text-xs text-slate-500 mb-1">Size</label>
                                                <input
                                                    type="text"
                                                    placeholder="Size"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5"
                                                    value={item.size}
                                                    onChange={(e) => updateItem(item.id, { size: e.target.value })}
                                                />
                                            </div>
                                            <div className="w-16">
                                                <label className="block text-xs text-slate-500 mb-1">Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5 px-2"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-xs text-slate-500 mb-1">Price</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5 px-2"
                                                    value={item.price}
                                                    onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
                    <div className="text-lg font-bold text-slate-900">
                        Total: ${calculateTotal().toFixed(2)}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            disabled={saving || (!schoolId && !isAddingSchool) || items.length === 0}
                        >
                            {saving ? 'Creating...' : 'Create Bulk Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
