'use client';

import { SchoolRunGroup } from '@/lib/types';

interface PackingListViewProps {
    sessions: SchoolRunGroup[];
    onOpenSession: (session: SchoolRunGroup) => void;
}

export function PackingListView({ sessions, onOpenSession }: PackingListViewProps) {
    if (sessions.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-4xl mb-4">🎉</p>
                <p className="text-xl font-bold text-slate-800">No Orders to Pack</p>
                <p className="text-slate-500">Distribution queue is empty.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
                <div
                    key={session.school_code}
                    className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                    onClick={() => onOpenSession(session)}
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                                {session.school_name.charAt(0)}
                            </div>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                Ready to Pack
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                            {session.school_name}
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">
                            {session.school_code}
                        </p>

                        <div className="flex border-t border-slate-100 pt-4 gap-6">
                            <div>
                                <div className="text-2xl font-bold text-slate-800">{session.order_count}</div>
                                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Orders</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800">{session.item_count}</div>
                                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Items</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center group-hover:bg-blue-50 transition-colors">
                        <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Open Session</span>
                        <span className="text-slate-400 group-hover:text-blue-600">→</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
