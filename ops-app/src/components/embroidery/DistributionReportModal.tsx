import { useState } from 'react';
import { X, FileText, Printer, Download, Check } from 'lucide-react';
import { EmbroideryBatch } from '@/lib/types';

interface DistributionReportModalProps {
    batch: EmbroideryBatch;
    onClose: () => void;
}

export function DistributionReportModal({ batch, onClose }: DistributionReportModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [reportType, setReportType] = useState<'LIST' | 'LABELS'>('LIST');

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setGenerated(true);
            setTimeout(() => {
                onClose();
            }, 800);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Generate Distribution Report</h2>
                        <p className="text-sm text-slate-500">{batch.school_name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setReportType('LIST')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${reportType === 'LIST'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                }`}
                        >
                            <div className="mb-3 p-2 bg-white rounded-lg w-fit shadow-xs border border-slate-100">
                                <FileText className={`w-6 h-6 ${reportType === 'LIST' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            </div>
                            <div className="font-bold text-sm">Class List (PDF)</div>
                            <div className="text-xs opacity-70 mt-1">Grouped by Class ID. Best for classroom handouts.</div>
                        </button>

                        <button
                            onClick={() => setReportType('LABELS')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${reportType === 'LABELS'
                                ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                                : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                                }`}
                        >
                            <div className="mb-3 p-2 bg-white rounded-lg w-fit shadow-xs border border-slate-100">
                                <Printer className={`w-6 h-6 ${reportType === 'LABELS' ? 'text-purple-600' : 'text-slate-400'}`} />
                            </div>
                            <div className="font-bold text-sm">Thermal Labels</div>
                            <div className="text-xs opacity-70 mt-1">Individual stickers for bags. 4x6" format.</div>
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 border border-slate-200">
                        <h4 className="font-bold text-slate-700 mb-2 uppercase tracking-wide">Report Summary</h4>
                        <div className="flex justify-between py-1 border-b border-slate-200 border-dashed">
                            <span>Total Orders</span>
                            <span className="font-mono text-slate-900">{batch.order_count}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200 border-dashed">
                            <span>Total Items</span>
                            <span className="font-mono text-slate-900">{batch.total_units}</span>
                        </div>
                        <div className="flex justify-between py-1 pt-2">
                            <span>Est. Pages</span>
                            <span className="font-mono text-slate-900">{reportType === 'LIST' ? Math.ceil(batch.order_count / 20) : batch.total_units}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || generated}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200/50 ${generated
                            ? 'bg-green-600 text-white cursor-default'
                            : isGenerating
                                ? 'bg-indigo-400 text-white cursor-wait'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                            }`}
                    >
                        {generated ? (
                            <>
                                <Check className="w-6 h-6" />
                                Done
                            </>
                        ) : isGenerating ? (
                            <>
                                <span className="loading loading-spinner loading-md"></span>
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                Generate Report
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
