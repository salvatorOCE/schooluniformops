import { useState, useMemo } from 'react';
import { Order } from '@/lib/types';
import { Search, Package, Check, Clock, User } from 'lucide-react';

interface SchoolPickupViewProps {
    orders: Order[];
    onCollect: (orderId: string) => void;
}

export function SchoolPickupView({ orders, onCollect }: SchoolPickupViewProps) {
    const [search, setSearch] = useState('');

    const filteredOrders = useMemo(() => {
        if (!search) return orders;
        const q = search.toLowerCase();
        return orders.filter(o =>
            o.student_name?.toLowerCase().includes(q) ||
            o.order_number.toLowerCase().includes(q) ||
            o.parent_name.toLowerCase().includes(q)
        );
    }, [orders, search]);

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-10">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-6 h-6 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search student name or order..."
                        className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-lg"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrders.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-400">
                        <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-xl font-medium">No pickup orders found</p>
                        {search && <p className="text-sm">Try a different name</p>}
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded text-xs">
                                        {order.order_number}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">
                                    {order.student_name || 'Unknown Student'}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                                    <User className="w-4 h-4" />
                                    {order.parent_name}
                                </div>

                                <div className="space-y-1 mb-6">
                                    {order.items.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="text-sm text-slate-700 flex justify-between">
                                            <span>{item.quantity}x {item.product_name}</span>
                                            <span className="text-slate-400 font-mono text-xs">{item.size}</span>
                                        </div>
                                    ))}
                                    {order.items.length > 3 && (
                                        <div className="text-xs text-slate-400 italic">
                                            + {order.items.length - 3} more items...
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => onCollect(order.id)}
                                className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition-all group-hover:bg-indigo-600"
                            >
                                <Check className="w-5 h-5" />
                                Mark Collected
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
