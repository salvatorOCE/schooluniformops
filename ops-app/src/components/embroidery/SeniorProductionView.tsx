import { EmbroideryBatch, Order, OrderItem } from '@/lib/types';
import { ChevronLeft, CheckCircle, Printer, FileText, Filter, ArrowUpDown, Keyboard } from 'lucide-react';
import { useState, useMemo } from 'react';
import { DistributionReportModal } from './DistributionReportModal';
import { useHotkeys } from '@/lib/use-hotkeys';
import { exportToCSV } from '@/lib/csv-export';

interface SeniorProductionViewProps {
    batch: EmbroideryBatch;
    onBack: () => void;
    onRelease: (batch: EmbroideryBatch) => void;
    onToggleItemComplete: (orderId: string, itemId: string, currentStatus: string) => void;
}

export function SeniorProductionView({ batch, onBack, onRelease, onToggleItemComplete }: SeniorProductionViewProps) {
    const [filterEmbroidered, setFilterEmbroidered] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
    const [sortBy, setSortBy] = useState<'GARMENT' | 'NAME' | 'CLASS'>('GARMENT');
    const [showReportModal, setShowReportModal] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Flatten items for tabular production view
    const productionItems = useMemo(() => {
        const items: {
            orderId: string;
            itemId: string;
            studentName: string;
            studentLast: string;
            studentNick: string;
            classId: string;
            garment: string;
            size: string;
            sku: string;
            receipt: string;
            status: 'PENDING' | 'DONE';
        }[] = [];

        batch.orders.forEach(order => {
            order.items.forEach(item => {
                if (item.requires_embroidery) {
                    items.push({
                        orderId: order.id,
                        itemId: item.id,
                        studentName: order.student_name || 'Unknown',
                        studentLast: order.student_last_name || '',
                        studentNick: order.student_nickname || '',
                        classId: order.class_id || '',
                        garment: item.product_name,
                        size: item.size || 'N/A',
                        sku: item.sku,
                        receipt: order.order_number,
                        status: item.embroidery_status === 'DONE' ? 'DONE' : 'PENDING'
                    });
                }
            });
        });

        // Smart Sort
        return items.sort((a, b) => {
            if (sortBy === 'GARMENT') {
                // Garment -> Size -> Name
                const gDiff = a.garment.localeCompare(b.garment);
                if (gDiff !== 0) return gDiff;
                const sDiff = a.size.localeCompare(b.size); // Naive string sort for size
                if (sDiff !== 0) return sDiff;
                return a.studentName.localeCompare(b.studentName);
            }
            if (sortBy === 'NAME') {
                return a.studentName.localeCompare(b.studentName);
            }
            if (sortBy === 'CLASS') {
                const cDiff = a.classId.localeCompare(b.classId);
                if (cDiff !== 0) return cDiff;
                return a.studentName.localeCompare(b.studentName);
            }
            return 0;
        });

    }, [batch.orders, sortBy]);

    const filteredItems = productionItems.filter(i => {
        if (filterEmbroidered === 'ALL') return true;
        return i.status === filterEmbroidered;
    });

    const percentComplete = Math.round((productionItems.filter(i => i.status === 'DONE').length / productionItems.length) * 100) || 0;

    // Keyboard shortcuts
    useHotkeys([
        {
            key: 'd',
            description: 'Toggle Done',
            action: () => {
                const item = filteredItems[focusedIndex];
                if (item) onToggleItemComplete(item.orderId, item.itemId, item.status);
            }
        },
        {
            key: 'ArrowDown',
            description: 'Next Item',
            action: () => setFocusedIndex(i => Math.min(i + 1, filteredItems.length - 1))
        },
        {
            key: 'ArrowUp',
            description: 'Previous Item',
            action: () => setFocusedIndex(i => Math.max(i - 1, 0))
        },
        {
            key: 'Escape',
            description: 'Back to Dashboard',
            global: true,
            action: onBack
        },
        {
            key: 'e',
            description: 'Export CSV',
            action: () => exportToCSV(filteredItems, {
                filename: `senior_batch_${batch.school_name}`,
                columns: [
                    { key: 'studentName', label: 'Student' },
                    { key: 'studentLast', label: 'Last Name' },
                    { key: 'studentNick', label: 'Nickname' },
                    { key: 'garment', label: 'Garment' },
                    { key: 'size', label: 'Size' },
                    { key: 'classId', label: 'Class' },
                    { key: 'receipt', label: 'Receipt' },
                    { key: 'status', label: 'Status' },
                ]
            })
        },
    ]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">{batch.school_name}</h1>
                            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded border border-purple-200 uppercase">
                                Senior Batch
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            {productionItems.length} Total Pieces • {batch.order_count} Orders • Cutoff: {batch.cutoff_date ? new Date(batch.cutoff_date).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        className="btn btn-outline gap-2 text-slate-600"
                        onClick={() => setShowReportModal(true)}
                    >
                        <FileText className="w-4 h-4" />
                        Report
                    </button>
                    <button
                        className="btn btn-outline gap-2 text-slate-600"
                        onClick={() => exportToCSV(filteredItems, {
                            filename: `senior_batch_${batch.school_name}`,
                            columns: [
                                { key: 'studentName', label: 'Student' },
                                { key: 'studentLast', label: 'Last Name' },
                                { key: 'studentNick', label: 'Nickname' },
                                { key: 'garment', label: 'Garment' },
                                { key: 'size', label: 'Size' },
                                { key: 'classId', label: 'Class' },
                                { key: 'receipt', label: 'Receipt' },
                                { key: 'status', label: 'Status' },
                            ]
                        })}
                    >
                        <Printer className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={() => setShowShortcuts(s => !s)}
                        className={`p-2 rounded-lg transition-colors ${showShortcuts ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:bg-slate-100'}`}
                        title="Keyboard shortcuts"
                    >
                        <Keyboard className="w-4 h-4" />
                    </button>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-xs font-bold text-slate-500 uppercase">Progress</span>
                        <span className="text-xl font-mono font-bold text-slate-900">{percentComplete}%</span>
                    </div>
                    {percentComplete === 100 && (
                        <button
                            onClick={() => onRelease(batch)}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 transition-colors animate-pulse"
                        >
                            Release to Distribution
                        </button>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase px-2"><Filter className="w-3 h-3 inline mr-1" /> Filter:</span>
                    {(['ALL', 'PENDING', 'DONE'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterEmbroidered(f)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${filterEmbroidered === f
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase px-2"><ArrowUpDown className="w-3 h-3 inline mr-1" /> Sort:</span>
                    {(['GARMENT', 'NAME', 'CLASS'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setSortBy(s)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${sortBy === s
                                ? 'bg-purple-100 text-purple-700'
                                : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Production Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-3 w-16 text-center">Done</th>
                            <th className="px-6 py-3">Student (Front)</th>
                            <th className="px-6 py-3">Nickname / Last (Back)</th>
                            <th className="px-6 py-3">Garment</th>
                            <th className="px-6 py-3 text-center">Size</th>
                            <th className="px-6 py-3 text-center">Class</th>
                            <th className="px-6 py-3 text-right">Receipt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.map((item, idx) => (
                            <tr
                                key={`${item.orderId}-${item.itemId}`}
                                className={`hover:bg-slate-50 transition-colors ${item.status === 'DONE' ? 'bg-slate-50/50' : ''} ${idx === focusedIndex ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-50/30' : ''}`}
                                onClick={() => setFocusedIndex(idx)}
                            >
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => onToggleItemComplete(item.orderId, item.itemId, item.status)}
                                        className={`w-8 h-8 rounded flex items-center justify-center transition-all ${item.status === 'DONE'
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-white border-2 border-slate-300 text-transparent hover:border-slate-400'
                                            }`}
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-lg font-bold block ${item.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                        {item.studentName}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-lg font-bold font-mono block ${item.status === 'DONE' ? 'text-slate-400' : 'text-purple-700'}`}>
                                        {item.studentNick || item.studentLast || '—'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`font-medium ${item.status === 'DONE' ? 'text-slate-400' : 'text-slate-700'}`}>
                                        {item.garment}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-slate-100 text-slate-600 font-mono font-bold px-2 py-1 rounded">
                                        {item.size}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center text-slate-500 font-medium">
                                    {item.classId || '—'}
                                </td>
                                <td className="px-6 py-4 text-right text-slate-400 font-mono text-xs">
                                    {item.receipt}
                                </td>
                            </tr>
                        ))}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-400">
                                    No items match current filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Keyboard Shortcut Help */}
            {showShortcuts && (
                <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center gap-6 text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Shortcuts</span>
                    <span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded">↑↓</kbd> Navigate</span>
                    <span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded">D</kbd> Toggle Done</span>
                    <span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded">E</kbd> Export CSV</span>
                    <span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded">Esc</kbd> Back</span>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <DistributionReportModal
                    batch={batch}
                    onClose={() => setShowReportModal(false)}
                />
            )}
        </div>
    );
}
