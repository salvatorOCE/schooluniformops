'use client';

import { Order, SchoolRunGroup } from '@/lib/types';
import { useState } from 'react';
import { SchoolRunView } from './SchoolRunView';
import { HomeShippingView } from './HomeShippingView';
import { StorePickupView } from './StorePickupView';

interface DispatchManagerProps {
    schoolRuns: SchoolRunGroup[];
    homeOrders: Order[];
    storeOrders: Order[];
    onDispatchRun: (schoolCode: string) => void;
    onDispatchOrder: (orderId: string) => void;
    onBatchDispatchHome: (carrier: string) => void;
    onStageStore: (orderId: string, location: string) => void;
    onHandoverStore: (orderId: string) => void;
    onPrintLabel: (order: Order) => void;
    onReportIssue: (order: Order) => void;
}

export function DispatchManager({
    schoolRuns, homeOrders, storeOrders,
    onDispatchRun, onDispatchOrder, onBatchDispatchHome,
    onStageStore, onHandoverStore,
    onPrintLabel, onReportIssue
}: DispatchManagerProps) {
    const [mode, setMode] = useState<'SCHOOL' | 'HOME' | 'STORE'>('SCHOOL');

    return (
        <div className="space-y-6">
            {/* Sub-tabs for Dispatch Modes */}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 inline-flex">
                <button
                    onClick={() => setMode('SCHOOL')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'SCHOOL' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    🏫 School Deliveries
                </button>
                <button
                    onClick={() => setMode('HOME')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'HOME' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    🏠 Home Shipping
                </button>
                <button
                    onClick={() => setMode('STORE')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'STORE' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    🏪 Store Pickup
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                {mode === 'SCHOOL' && (
                    <SchoolRunView
                        batches={schoolRuns}
                        onPack={() => { }} // Not needed in Dispatch Phase (already packed)
                        onPackSchoolInfo={() => { }} // Not needed
                        onDispatchRun={onDispatchRun}
                        onPrintLabel={onPrintLabel}
                        onReportIssue={onReportIssue}
                    />
                )}

                {mode === 'HOME' && (
                    <HomeShippingView
                        orders={homeOrders}
                        onDispatch={onDispatchOrder}
                        onBatchDispatch={onBatchDispatchHome}
                        onPrintLabel={onPrintLabel}
                        onReportIssue={onReportIssue}
                    />
                )}

                {mode === 'STORE' && (
                    <StorePickupView
                        orders={storeOrders}
                        onPack={() => { }} // Not needed
                        onStage={onStageStore}
                        onHandover={onHandoverStore}
                        onPrintLabel={onPrintLabel}
                        onReportIssue={onReportIssue}
                    />
                )}
            </div>
        </div>
    );
}
