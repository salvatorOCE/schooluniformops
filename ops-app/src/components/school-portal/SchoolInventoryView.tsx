import { SchoolInventoryItem } from '@/lib/types';
import { Shirt, Info, RefreshCw } from 'lucide-react';

interface SchoolInventoryViewProps {
    inventory: SchoolInventoryItem[];
    onRestockRequest: (sku: string) => void;
}

export function SchoolInventoryView({ inventory, onRestockRequest }: SchoolInventoryViewProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-lg text-slate-800">Current Stock Levels</h2>
                <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="divide-y divide-slate-100">
                {inventory.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${item.status === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                                    item.status === 'LOW' ? 'bg-amber-100 text-amber-600' :
                                        'bg-slate-100 text-slate-500'
                                }`}>
                                <Shirt className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">{item.product_name}</h4>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span className="font-mono bg-slate-100 px-1.5 rounded">{item.size}</span>
                                    <span>• SKU: {item.sku}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className={`text-2xl font-bold font-mono ${item.status === 'CRITICAL' ? 'text-red-600' :
                                    item.status === 'LOW' ? 'text-amber-600' :
                                        'text-slate-900'
                                }`}>
                                {item.current_stock}
                            </div>
                            <div className="text-xs text-slate-400">In Stock</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-200">
                Inventory data is synced live with HQ. Replenishment logic active.
            </div>
        </div>
    );
}
