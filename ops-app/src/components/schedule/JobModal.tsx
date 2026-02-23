'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { StaffMember, ShiftType, ShiftStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface JobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: JobFormData) => void;
    onDelete?: () => void;
    initialData?: JobFormData;
    staff: StaffMember[];
}

export interface JobFormData {
    id?: string;
    title: string;
    type: ShiftType;
    status: ShiftStatus;
    start: string; // ISO
    end: string; // ISO
    staffIds: string[];
    notes: string;
}

const emptyForm: JobFormData = {
    title: '',
    type: 'PRODUCTION',
    status: 'SCHEDULED',
    start: '',
    end: '',
    staffIds: [],
    notes: ''
};

export function JobModal({ isOpen, onClose, onSave, onDelete, initialData, staff }: JobModalProps) {
    const [formData, setFormData] = useState<JobFormData>(emptyForm);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || { ...emptyForm, start: new Date().toISOString(), end: new Date().toISOString() });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const toggleStaff = (id: string) => {
        setFormData(prev => ({
            ...prev,
            staffIds: prev.staffIds.includes(id)
                ? prev.staffIds.filter(sid => sid !== id)
                : [...prev.staffIds, id]
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
                {/* Header */}
                <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                            {formData.id ? 'Edit Assignment' : 'New Assignment'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Production Job Details</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-md">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Job Title</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. St Mary's Grade 12 Run"
                        />
                    </div>

                    {/* Type & Status Row */}
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as ShiftType })}
                                >
                                    <option value="PRODUCTION">Production</option>
                                    <option value="EMBROIDERY">Embroidery</option>
                                    <option value="DISPATCH">Dispatch</option>
                                    <option value="FIX_UP">Fix-Up</option>
                                    <option value="SENIOR_PRIORITY">Senior Priority</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as ShiftStatus })}
                                >
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="EXCEPTION">Exception</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staff Assignment */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assign Staff</label>
                        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 min-h-[3rem]">
                            {staff.map(s => {
                                const isSelected = formData.staffIds.includes(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => toggleStaff(s.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm",
                                            isSelected
                                                ? "bg-white text-slate-900 ring-1 ring-slate-200 shadow-sm"
                                                : "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 shadow-none"
                                        )}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", s.avatar_color || 'bg-slate-400')} />
                                        {s.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[100px] resize-none placeholder:text-slate-400"
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add job specifics..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-2">
                        {formData.id && onDelete ? (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="text-red-500 text-sm font-medium hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : <div />}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 active:transform active:scale-95"
                            >
                                <Save className="w-4 h-4" />
                                Save Assignment
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
