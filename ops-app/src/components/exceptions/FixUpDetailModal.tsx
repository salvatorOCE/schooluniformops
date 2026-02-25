'use client';

import { useState, useEffect } from 'react';
import { FixUpRequest, FixUpStatus } from '@/lib/types';
import { useData } from '@/lib/data-provider';
import { useToast } from '@/lib/toast-context';
import {
    X,
    RefreshCw,
    Scissors,
    AlertTriangle,
    AlertCircle,
    Clock,
    FileText,
    User,
    Package,
} from 'lucide-react';

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}
function PackageX(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" y1="22" x2="12" y2="12" />
            <path d="m14.5 9-5 5" />
            <path d="m9.5 9 5 5" />
        </svg>
    );
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
    SIZE_EXCHANGE: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100' },
    PRINT_ERROR: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    EMBROIDERY_ERROR: { icon: Scissors, color: 'text-purple-600', bg: 'bg-purple-100' },
    WRONG_PERSONALISATION: { icon: UserIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
    DAMAGED_ITEM: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-200' },
    MISSING_ITEM: { icon: PackageX, color: 'text-amber-600', bg: 'bg-amber-100' },
    OTHER: { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-100' },
};

const STATUS_OPTIONS: { value: FixUpStatus; label: string }[] = [
    { value: 'OPEN', label: 'Open' },
    { value: 'WAITING_STOCK', label: 'Ordering Stock' },
    { value: 'IN_PRODUCTION', label: 'In Production' },
    { value: 'PACKED', label: 'Packed' },
    { value: 'DISPATCHED', label: 'Completed' },
    { value: 'CLOSED', label: 'Closed' },
];

interface FixUpDetailModalProps {
    fixUp: FixUpRequest;
    onClose: () => void;
    onSave: () => void;
}

export function FixUpDetailModal({ fixUp, onClose, onSave }: FixUpDetailModalProps) {
    const adapter = useData();
    const { toast } = useToast();
    const [notes, setNotes] = useState(fixUp.notes || '');
    const [status, setStatus] = useState<FixUpStatus>(fixUp.status);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setNotes(fixUp.notes || '');
        setStatus(fixUp.status);
    }, [fixUp.id, fixUp.notes, fixUp.status]);

    const config = TYPE_CONFIG[fixUp.type] || TYPE_CONFIG['OTHER'];
    const Icon = config.icon;

    const hasChanges = notes !== (fixUp.notes || '') || status !== fixUp.status;

    const handleSave = async () => {
        if (!hasChanges) return;
        setSaving(true);
        try {
            await adapter.updateFixUp(fixUp.id, { notes, status });
            toast.success('Fix-up updated');
            onSave();
            onClose();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${config.bg} ${config.color}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{fixUp.type.replace(/_/g, ' ')}</h2>
                            <p className="text-sm text-slate-500">
                                {fixUp.original_order_number} • {fixUp.student_name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</p>
                            <p className="font-medium text-slate-900 mt-0.5">{fixUp.student_name}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">School</p>
                            <p className="font-medium text-slate-900 mt-0.5">{fixUp.school_name}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</p>
                            <p className={`font-medium mt-0.5 ${fixUp.priority === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>
                                {fixUp.priority}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Created</p>
                            <p className="font-medium text-slate-600 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(fixUp.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" /> Items
                        </p>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
                            {fixUp.items.map((item, idx) => (
                                <div key={item.id || idx} className="flex justify-between text-sm">
                                    <span className="text-slate-800 font-medium">
                                        {item.quantity}x {item.product_name}
                                    </span>
                                    <span className="text-slate-500 font-mono text-xs">{item.size}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes — editable */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> Notes
                        </p>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg p-3 text-sm placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 outline-none resize-y min-h-[100px]"
                            placeholder="Add notes or instructions for this fix-up…"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as FixUpStatus)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none bg-white"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex justify-end gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="px-4 py-2 text-sm font-medium bg-[#19966D] hover:bg-[#15805C] text-white rounded-lg shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
