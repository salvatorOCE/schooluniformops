'use client';

import { useToast, ToastType } from '@/lib/toast-context';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const iconMap: Record<ToastType, React.ElementType> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const styleMap: Record<ToastType, string> = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
};

const iconColorMap: Record<ToastType, string> = {
    success: 'text-emerald-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
};

export function Toaster() {
    const { toasts, dismiss } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((t) => {
                const Icon = iconMap[t.type];
                return (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300 ${styleMap[t.type]}`}
                    >
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColorMap[t.type]}`} />
                        <p className="text-sm font-medium flex-1 leading-relaxed">{t.message}</p>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="p-0.5 rounded hover:bg-black/5 transition-colors flex-shrink-0"
                        >
                            <X className="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
