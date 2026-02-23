import { useState, useEffect, useRef } from 'react';
import { Draggable } from '@fullcalendar/interaction';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/data-provider';
import { EmbroideryBatch } from '@/lib/types';
import { Loader2 } from 'lucide-react';

// Deterministic color generator for schools
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Pastel-ify the color
const getPastelColor = (str: string) => {
    const hex = stringToColor(str);
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    // Mix with white
    const rP = Math.floor((r + 255) / 2);
    const gP = Math.floor((g + 255) / 2);
    const bP = Math.floor((b + 255) / 2);
    return `rgb(${rP}, ${gP}, ${bP})`;
};

const getBorderColor = (str: string) => {
    const hex = stringToColor(str);
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    // Darken
    const rD = Math.floor(r * 0.8);
    const gD = Math.floor(g * 0.8);
    const bD = Math.floor(b * 0.8);
    return `rgb(${rD}, ${gD}, ${bD})`;
};

export function DraggableSidebar() {
    const containerRef = useRef<HTMLDivElement>(null);
    const adapter = useData();
    const [batches, setBatches] = useState<EmbroideryBatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const data = await adapter.getSchoolBatches();
                setBatches(data);
            } catch (error) {
                console.error("Failed to fetch batches", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBatches();
    }, [adapter]);

    useEffect(() => {
        if (!containerRef.current) return;

        // Cleanup previous instance if necessary? Draggable doesn't have a clear destroy method easily accessible in this pattern
        // but re-initializing on same element usually works or we can just run once.
        // Actually, typically we run this once.
        const draggable = new Draggable(containerRef.current, {
            itemSelector: '.fc-event',
            eventData: function (eventEl) {
                return {
                    title: eventEl.getAttribute('data-title'),
                    backgroundColor: eventEl.getAttribute('data-color'),
                    borderColor: eventEl.getAttribute('data-border'),
                    extendedProps: {
                        type: 'NEW_JOB'
                    }
                };
            }
        });

        return () => draggable.destroy();
    }, [batches]); // Re-bind when batches change to ensure new elements are draggable? Actually Draggable binds to container.

    const queueItems = batches.map((batch, index) => ({
        id: `batch-${index}`,
        title: `${batch.school_name} ${batch.is_senior_batch ? 'Seniors' : 'Embroidery'}`,
        color: getPastelColor(batch.school_name),
        border: getBorderColor(batch.school_name),
        count: batch.total_units,
        type: batch.is_senior_batch ? 'Senior' : 'Embroidery'
    }));

    return (
        <aside className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col z-10">
            <div className="p-5 border-b border-slate-200 bg-white shadow-sm z-20 flex justify-between items-center">
                <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Production Queue</h2>
                    <p className="text-sm font-medium text-slate-900">Unscheduled Jobs</p>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {!loading && queueItems.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        No unscheduled jobs.
                    </div>
                )}

                {queueItems.map(item => (
                    <div
                        key={item.id}
                        className={cn(
                            "fc-event group bg-white border border-slate-200 rounded-lg p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 relative overflow-hidden",
                            "hover:border-blue-300 hover:-translate-y-0.5"
                        )}
                        data-title={item.title}
                        data-color={item.color}
                        data-border={item.border}
                    >
                        {/* Colored Left Strip */}
                        <div
                            className="absolute left-0 top-0 bottom-0 w-1"
                            style={{ backgroundColor: item.color }}
                        />

                        <div className="pl-2.5">
                            <div className="flex justify-between items-start mb-2">
                                <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                                    style={{ backgroundColor: `${item.color}33`, color: item.border }} // using 33 for ~20% opacity hex
                                >
                                    {item.type}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity">
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-800 leading-snug mb-1">{item.title}</h3>
                            {item.count > 0 && (
                                <p className="text-xs text-slate-500 font-medium">{item.count} Items</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
