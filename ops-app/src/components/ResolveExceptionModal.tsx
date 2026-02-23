'use client';

import { useState } from 'react';
import { ExceptionOrder } from '@/lib/types';

interface ResolveExceptionModalProps {
    order: ExceptionOrder;
    onClose: () => void;
    onResolve: (orderId: string, updates: { student_name?: string; school_code?: string; school_name?: string }) => void;
}

export function ResolveExceptionModal({ order, onClose, onResolve }: ResolveExceptionModalProps) {
    const [studentName, setStudentName] = useState(order.student_name || '');
    const [schoolCode, setSchoolCode] = useState(order.school_code || '');
    const [schoolName, setSchoolName] = useState(order.school_name || '');

    const handleSubmit = () => {
        onResolve(order.id, {
            student_name: studentName || undefined,
            school_code: schoolCode || undefined,
            school_name: schoolName || undefined,
        });
        onClose();
    };

    const showStudentField = !order.student_name;
    const showSchoolField = !order.school_code;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-lg">Resolve Exception</h2>
                        <p className="text-sm text-gray-500">{order.order_number}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                        ×
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">⚠️</span>
                            <div>
                                <p className="text-sm text-amber-900 font-medium">
                                    Action Required for {order.parent_name}
                                </p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Contact parent or check WooCommerce notes. This order is blocked.
                                </p>
                            </div>
                        </div>
                    </div>

                    {showStudentField && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Student Name *
                            </label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="Enter student name"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                    )}

                    {showSchoolField && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    School Code *
                                </label>
                                <select
                                    value={schoolCode}
                                    onChange={(e) => {
                                        setSchoolCode(e.target.value);
                                        const schoolNames: Record<string, string> = {
                                            'STMARY': "St Mary's College",
                                            'STPETER': "St Peter's Primary",
                                            'ROSARY': 'Rosary School',
                                        };
                                        setSchoolName(schoolNames[e.target.value] || '');
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select school...</option>
                                    <option value="STMARY">St Mary&apos;s College</option>
                                    <option value="STPETER">St Peter&apos;s Primary</option>
                                    <option value="ROSARY">Rosary School</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-outline">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="btn btn-success"
                        disabled={showStudentField && !studentName || showSchoolField && !schoolCode}
                    >
                        ✓ Resolve Exception
                    </button>
                </div>
            </div>
        </div>
    );
}
