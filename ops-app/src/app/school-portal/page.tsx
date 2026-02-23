'use client';

import { useState } from 'react';
import { SchoolLogin } from '@/components/school-portal/SchoolLogin';
import { SchoolPickupView } from '@/components/school-portal/SchoolPickupView';
import { SchoolInventoryView } from '@/components/school-portal/SchoolInventoryView';
import { useData } from '@/lib/data-provider';
import { Order, SchoolInventoryItem } from '@/lib/types';
import { LayoutDashboard, PackageCheck, LogOut } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/toast-context';

export default function SchoolPortalPage() {
    const adapter = useData();
    const { toast } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [schoolCode, setSchoolCode] = useState('');
    const [activeTab, setActiveTab] = useState<'PICKUP' | 'INVENTORY'>('PICKUP');
    const [collectOrderId, setCollectOrderId] = useState<string | null>(null);

    // Data Stats
    const [orders, setOrders] = useState<Order[]>([]);
    const [inventory, setInventory] = useState<SchoolInventoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async (code: string) => {
        setLoading(true);
        const [o, i] = await Promise.all([
            adapter.getSchoolPickupOrders(code),
            adapter.getSchoolInventory(code)
        ]);
        setOrders(o);
        setInventory(i);
        setLoading(false);
    };

    const handleLogin = (code: string) => {
        setSchoolCode(code);
        setIsAuthenticated(true);
        loadData(code);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setSchoolCode('');
        setOrders([]);
    };

    const handleCollect = (orderId: string) => {
        setCollectOrderId(orderId);
    };

    const confirmCollect = () => {
        if (collectOrderId) {
            setOrders(prev => prev.filter(o => o.id !== collectOrderId));
            toast.success('Order collected — marked as complete');
            setCollectOrderId(null);
        }
    };

    if (!isAuthenticated) {
        return <SchoolLogin onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-slate-100 pb-20">
            {/* Mobile-Friendly Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div>
                        <h1 className="font-black text-xl text-slate-900 tracking-tight">SUS <span className="text-indigo-600">PORTAL</span></h1>
                        <p className="text-xs text-slate-500 font-bold">{schoolCode} OFFICE</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
                {/* Tab Navigation */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setActiveTab('PICKUP')}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'PICKUP'
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                            }`}
                    >
                        <PackageCheck className="w-8 h-8" />
                        <span className="font-bold">Pickup Queue</span>
                        <span className="text-xs opacity-80">{orders.length} Ready</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('INVENTORY')}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'INVENTORY'
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                            }`}
                    >
                        <LayoutDashboard className="w-8 h-8" />
                        <span className="font-bold">Inventory</span>
                        <span className="text-xs opacity-80">Check Stock</span>
                    </button>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="py-20 text-center animate-pulse">
                        <div className="loading loading-spinner loading-lg text-indigo-600 mb-4"></div>
                        <p className="text-slate-400 font-medium">Syncing with HQ...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'PICKUP' && (
                            <SchoolPickupView
                                orders={orders}
                                onCollect={handleCollect}
                            />
                        )}
                        {activeTab === 'INVENTORY' && (
                            <SchoolInventoryView
                                inventory={inventory}
                                onRestockRequest={() => toast.success('Restock request sent to HQ!')}
                            />
                        )}
                    </>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!collectOrderId}
                title="Confirm Collection"
                message="Has the parent collected this order?"
                confirmLabel="Yes, Collected"
                onConfirm={confirmCollect}
                onCancel={() => setCollectOrderId(null)}
            />
        </div>
    );
}
