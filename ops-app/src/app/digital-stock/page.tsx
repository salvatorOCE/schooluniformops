'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Package, Search, RefreshCw, Edit, X, Truck, ChevronDown, ChevronRight, Plus, School, AlertCircle, CheckCircle2, Trash2, Building2, ListOrdered, Eraser } from 'lucide-react';
import { useData } from '@/lib/data-provider';
import { isValidDigitalStockSize } from '@/lib/supabase-adapter';
import type { UnprocessedDetailRow } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useMobile } from '@/lib/mobile-context';

interface InventoryStockItem {
    id: string;
    sku: string;
    name: string;
    attributes?: Record<string, unknown> | null;
    size?: string;
    school_name: string;
    stock_on_shelf: number;
    stock_in_transit: number;
    unprocessed: number;
    available: number;
}

interface GarmentGroup {
    baseName: string;
    totalShelf: number;
    totalTransit: number;
    totalUnprocessed: number;
    totalAvailable: number;
    items: (InventoryStockItem & { size: string })[];
}

// Stat pill for mobile card — compact for density
const StatPill = ({ label, value, variant = 'default' }: { label: string; value: number | string; variant?: 'emerald' | 'amber' | 'red' | 'default' }) => {
    const v = variant === 'emerald' ? 'text-emerald-600' : variant === 'amber' ? 'text-amber-600' : variant === 'red' ? 'text-red-600' : 'text-slate-700';
    return (
        <div className="flex justify-between items-center py-0.5 border-b border-slate-100 last:border-0">
            <span className="text-[11px] text-slate-500">{label}</span>
            <span className={`text-xs font-semibold ${v}`}>{value}</span>
        </div>
    );
};

// Extracted Accordion Component for a Garment Row (layout driven by isMobile from context so simulator shows mobile UI)
const GarmentRow = ({
    garment,
    onAdjust,
    onDeleteProduct,
    onUnprocessedClick,
    isMobile
}: {
    garment: GarmentGroup;
    onAdjust: (item: InventoryStockItem) => void;
    onDeleteProduct: (productId: string, productName: string) => void;
    onUnprocessedClick?: (item: InventoryStockItem & { size: string }) => void;
    isMobile: boolean;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white border-b border-slate-100 last:border-b-0">
            {/* Mobile: stacked card layout — clear hierarchy, 44px touch targets */}
            {isMobile && (
            <div
                className={`block cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="mx-2 mb-1 mt-1 rounded-lg border border-slate-200 bg-white overflow-hidden">
                    {/* Row 1: Chevron | Name | Sizes | Delete — single line, no redundant Available row */}
                    <div className="flex items-center gap-1.5 px-3 py-2 min-h-[40px]">
                        <span className="text-slate-400 shrink-0" aria-hidden>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4" />}
                        </span>
                        <span className="flex-1 min-w-0 font-semibold text-slate-900 truncate text-sm">
                            {garment.baseName}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                            {garment.items.length} sizes
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteProduct(garment.items[0]?.id, garment.baseName); }}
                            className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors touch-manipulation"
                            title={`Delete ${garment.baseName}`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {/* Row 2: Compact 2x2 stats only (Available already in grid — no duplicate row) */}
                    <div className="px-3 pb-2 pt-0">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0 text-xs border-t border-slate-100 pt-2">
                            <StatPill label="In Transit" value={garment.totalTransit > 0 ? garment.totalTransit : '-'} variant="emerald" />
                            <StatPill label="On Shelf" value={garment.totalShelf} />
                            <StatPill label="Unprocessed" value={garment.totalUnprocessed > 0 ? garment.totalUnprocessed : '-'} variant="amber" />
                            <StatPill label="Available" value={garment.totalAvailable} variant={garment.totalAvailable < 0 ? 'red' : 'emerald'} />
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Desktop: table-like row */}
            {!isMobile && (
            <div
                className={`group/garment flex items-center px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 flex items-center gap-3">
                    <button className="text-slate-400 p-0.5 hover:bg-slate-200 rounded transition-colors">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-600" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <span className="font-semibold text-slate-900">{garment.baseName}</span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">{garment.items.length} sizes</span>
                </div>

                {/* Aggregated Stats */}
                <div className="flex-[2] flex items-center justify-end font-medium">
                    <div className="w-32 text-right pr-4">
                        <span className={`text-sm ${garment.totalTransit > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {garment.totalTransit > 0 ? garment.totalTransit : '-'}
                        </span>
                    </div>
                    <div className="w-32 text-right pr-4 text-sm text-slate-700">{garment.totalShelf}</div>
                    <div className="w-32 text-right pr-4">
                        <span className={`text-sm ${garment.totalUnprocessed > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {garment.totalUnprocessed > 0 ? garment.totalUnprocessed : '-'}
                        </span>
                    </div>
                    <div className="w-32 text-right pr-4">
                        <span className={`text-sm ${garment.totalAvailable < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {garment.totalAvailable}
                        </span>
                    </div>
                    <div className="w-20 text-right pr-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteProduct(garment.items[0]?.id, garment.baseName); }}
                            className="p-1 text-slate-400/50 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover/garment:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                            title={`Delete ${garment.baseName}`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
            )}

            {/* Expanded Sizes — mobile: cards; desktop: table */}
            {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-100 p-2 shadow-inner">
                    {/* Mobile: compact size cards */}
                    {isMobile && (
                    <div className="space-y-1">
                        {garment.items.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true, sensitivity: 'base' })).map(item => (
                            <div key={`${item.id}-${item.size}`} className="bg-white rounded border border-slate-200 p-2 flex items-center gap-2">
                                <span className="font-semibold text-slate-800 text-sm w-12 shrink-0">Size {item.size}</span>
                                <div className="grid grid-cols-4 gap-x-2 flex-1 min-w-0 text-[11px]">
                                    <span className="text-slate-500 truncate">Transit</span>
                                    <span className="text-slate-500 truncate">Shelf</span>
                                    <span className="text-slate-500 truncate">Open</span>
                                    <span className="text-slate-500 truncate">Avail</span>
                                    <span className={`font-semibold ${item.stock_in_transit > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{item.stock_in_transit || 0}</span>
                                    <span className="font-semibold text-slate-700">{item.stock_on_shelf}</span>
                                    {item.unprocessed > 0 && onUnprocessedClick ? (
                                        <button type="button" onClick={(e) => { e.stopPropagation(); onUnprocessedClick(item); }} className="font-semibold text-amber-600 hover:underline text-left" title="View details">
                                            {item.unprocessed}
                                        </button>
                                    ) : (
                                        <span className={`font-semibold ${item.unprocessed > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{item.unprocessed}</span>
                                    )}
                                    <span className={`font-semibold ${item.available < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{item.available}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAdjust(item); }}
                                    className="shrink-0 p-2 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors touch-manipulation"
                                    title="Adjust Stock"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    )}
                    {/* Desktop: table */}
                    {!isMobile && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-100/80 text-xs text-slate-500 uppercase font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 w-1/4">Size</th>
                                    <th className="px-5 py-3 text-right">In Transit</th>
                                    <th className="px-5 py-3 text-right">On Shelf</th>
                                    <th className="px-5 py-3 text-right">Unprocessed (Open)</th>
                                    <th className="px-5 py-3 text-right">Available</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {garment.items.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true, sensitivity: 'base' })).map(item => (
                                    <tr key={`${item.id}-${item.size}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3 font-semibold text-slate-800">{item.size}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`inline-flex items-center justify-center min-w-[32px] h-6 px-2 text-xs font-semibold rounded-full ${item.stock_in_transit > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'text-slate-400'}`}>
                                                {item.stock_in_transit || 0}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="inline-flex items-center justify-center min-w-[32px] h-6 px-2 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200/50">
                                                {item.stock_on_shelf}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {item.unprocessed > 0 && onUnprocessedClick ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); onUnprocessedClick(item); }}
                                                    className={`inline-flex items-center justify-center min-w-[32px] h-6 px-2 text-xs font-semibold rounded-full cursor-pointer hover:ring-2 hover:ring-amber-300 ${item.unprocessed > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 'text-slate-400'}`}
                                                    title="View unprocessed details"
                                                >
                                                    {item.unprocessed}
                                                </button>
                                            ) : (
                                                <span className={`inline-flex items-center justify-center min-w-[32px] h-6 px-2 text-xs font-semibold rounded-full ${item.unprocessed > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 'text-slate-400'}`}>
                                                    {item.unprocessed}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`inline-flex items-center justify-center min-w-[32px] h-6 px-2 text-xs font-semibold rounded-full ${item.available < 0 ? 'bg-red-50 text-red-700 border border-red-200/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'}`}>
                                                {item.available}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAdjust(item); }}
                                                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors touch-manipulation"
                                                title="Adjust Stock"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function DigitalStock() {
    const adapter = useData();
    const { isMobile } = useMobile();
    const [stock, setStock] = useState<InventoryStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // modal states
    const [isAdjusting, setIsAdjusting] = useState<InventoryStockItem | null>(null);
    const [newShelfStock, setNewShelfStock] = useState<number>(0);
    const [newTransitStock, setNewTransitStock] = useState<number>(0);
    const [updating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'inventory' | 'schools'>('inventory');

    // Add School modal
    const [showAddSchool, setShowAddSchool] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolCode, setNewSchoolCode] = useState('');
    const [addingSchool, setAddingSchool] = useState(false);

    // Add Product modal
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductSku, setNewProductSku] = useState('');
    const [newProductSchoolId, setNewProductSchoolId] = useState('');
    const [newProductSizes, setNewProductSizes] = useState('');
    const [newProductEmbroidery, setNewProductEmbroidery] = useState(false);
    const [newProductManufacturerName, setNewProductManufacturerName] = useState('');
    const [newProductManufacturerId, setNewProductManufacturerId] = useState('');
    const [newProductManufacturerIdKids, setNewProductManufacturerIdKids] = useState('');
    const [newProductManufacturerIdAdult, setNewProductManufacturerIdAdult] = useState('');
    const [addingProduct, setAddingProduct] = useState(false);

    // Unprocessed detail modal (where the count comes from; view / edit / clear)
    const [unprocessedDetail, setUnprocessedDetail] = useState<{ item: InventoryStockItem & { size: string } } | null>(null);
    const [unprocessedDetailRows, setUnprocessedDetailRows] = useState<UnprocessedDetailRow[]>([]);
    const [loadingUnprocessed, setLoadingUnprocessed] = useState(false);
    const [editingRow, setEditingRow] = useState<UnprocessedDetailRow | null>(null);
    const [editQty, setEditQty] = useState(0);
    const [savingRow, setSavingRow] = useState(false);

    // Schools list for dropdowns
    const [schools, setSchools] = useState<{ id: string; code: string; name: string }[]>([]);

    // Toast
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    const loadSchools = async () => {
        try {
            const data = await adapter.getSchools();
            setSchools(data);
        } catch (e) {
            console.error('Failed to load schools', e);
        }
    };

    const loadStock = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await adapter.getInventoryStock();
            setStock(data);
        } catch (error) {
            console.error('Failed to load stock', error);
        } finally {
            setLoading(false);
        }
    }, [adapter]);

    useEffect(() => {
        loadStock();
        loadSchools();
    }, [loadStock]);

    const groupedStock = useMemo(() => {
        const filtered = stock.filter(item =>
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.school_name.toLowerCase().includes(search.toLowerCase())
        );

        const schoolGroups = filtered.reduce((acc, curr) => {
            const school = curr.school_name || 'Global';
            if (!acc[school]) acc[school] = {};

            const baseName = curr.name;
            const size = curr.size || '-';

            if (!acc[school][baseName]) {
                acc[school][baseName] = {
                    baseName,
                    totalShelf: 0,
                    totalTransit: 0,
                    totalUnprocessed: 0,
                    totalAvailable: 0,
                    items: []
                };
            }

            acc[school][baseName].items.push({ ...curr, size });
            acc[school][baseName].totalShelf += curr.stock_on_shelf || 0;
            acc[school][baseName].totalTransit += curr.stock_in_transit || 0;
            acc[school][baseName].totalUnprocessed += curr.unprocessed || 0;
            acc[school][baseName].totalAvailable += curr.available || 0;

            return acc;
        }, {} as Record<string, Record<string, GarmentGroup>>);

        return Object.entries(schoolGroups)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([schoolName, garments]) => ({
                schoolName,
                garments: Object.values(garments).sort((a, b) => a.baseName.localeCompare(b.baseName))
            }));
    }, [stock, search]);

    const handleAdjustOpen = (item: InventoryStockItem) => {
        setIsAdjusting(item);
        setNewShelfStock(item.stock_on_shelf);
        setNewTransitStock(item.stock_in_transit || 0);
    };

    const handleUnprocessedClick = async (item: InventoryStockItem & { size: string }) => {
        setUnprocessedDetail({ item });
        setUnprocessedDetailRows([]);
        setLoadingUnprocessed(true);
        setEditingRow(null);
        try {
            const rows = await adapter.getUnprocessedDetails(item.id, item.size);
            setUnprocessedDetailRows(rows);
        } catch (e) {
            console.error('Failed to load unprocessed details', e);
            showToast('error', 'Failed to load details');
        } finally {
            setLoadingUnprocessed(false);
        }
    };

    const refreshUnprocessedDetails = async () => {
        if (!unprocessedDetail) return;
        const rows = await adapter.getUnprocessedDetails(unprocessedDetail.item.id, unprocessedDetail.item.size);
        setUnprocessedDetailRows(rows);
        if (rows.length === 0) {
            setUnprocessedDetail(null);
            loadStock();
        }
    };

    const handleClearUnprocessed = async (row: UnprocessedDetailRow) => {
        if (!confirm(`Set quantity to 0 for order #${row.order_number}? This will remove this line from the unprocessed count.`)) return;
        setSavingRow(true);
        try {
            await adapter.updateOrderItemQuantity(row.order_item_id, 0);
            showToast('success', 'Quantity set to 0');
            await refreshUnprocessedDetails();
        } catch (e) {
            showToast('error', 'Failed to update');
        } finally {
            setSavingRow(false);
        }
    };

    const handleSaveEditQty = async () => {
        if (!editingRow || editQty < 0) return;
        setSavingRow(true);
        try {
            await adapter.updateOrderItemQuantity(editingRow.order_item_id, editQty);
            showToast('success', 'Quantity updated');
            setEditingRow(null);
            await refreshUnprocessedDetails();
        } catch (e) {
            showToast('error', 'Failed to update');
        } finally {
            setSavingRow(false);
        }
    };

    const submitAdjustment = async () => {
        if (!isAdjusting) return;
        setUpdating(true);
        try {
            const size = isAdjusting.size || '-';
            if (newShelfStock !== isAdjusting.stock_on_shelf) {
                await adapter.updateStockOnShelf(isAdjusting.id, size, newShelfStock);
            }
            if (newTransitStock !== isAdjusting.stock_in_transit) {
                await adapter.updateStockInTransit(isAdjusting.id, size, newTransitStock);
            }
            await loadStock();
            setIsAdjusting(null);
            showToast('success', 'Stock updated successfully');
        } catch (error) {
            console.error('Failed to update stock', error);
            showToast('error', 'Failed to save stock changes');
        } finally {
            setUpdating(false);
        }
    };

    const handleAddSchool = async () => {
        if (!newSchoolName?.trim() || !newSchoolCode?.trim()) return;
        setAddingSchool(true);
        try {
            await adapter.createSchool(newSchoolName.trim(), newSchoolCode.trim());
            showToast('success', `Added "${newSchoolName}"`);
            setShowAddSchool(false);
            setNewSchoolName('');
            setNewSchoolCode('');
            await loadSchools();
            await loadStock();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to add school';
            showToast('error', msg);
        } finally {
            setAddingSchool(false);
        }
    };

    const handleAddProduct = async () => {
        if (!supabase || !newProductName) return;
        setAddingProduct(true);
        try {
            const sizes = newProductSizes
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .filter(isValidDigitalStockSize);
            const attributes: any[] = [];
            if (sizes.length > 0) {
                attributes.push({ name: 'Size', slug: 'pa_size', options: sizes });
            }

            const stockInit: Record<string, number> = {};
            (sizes.length > 0 ? sizes : ['-']).forEach(s => { stockInit[s] = 0; });

            const { error } = await supabase
                .from('products')
                .insert({
                    name: newProductName,
                    sku: newProductSku.trim() || null,
                    school_id: newProductSchoolId || null,
                    attributes: attributes.length > 0 ? attributes : null,
                    stock_on_shelf: stockInit,
                    stock_in_transit: { ...stockInit },
                    requires_embroidery: newProductEmbroidery,
                    price: 0,
                    manufacturer_name: newProductManufacturerName.trim() || null,
                    manufacturer_id: newProductManufacturerId.trim() || null,
                    manufacturer_id_kids: newProductManufacturerIdKids.trim() || null,
                    manufacturer_id_adult: newProductManufacturerIdAdult.trim() || null,
                });

            if (error) {
                showToast('error', error.code === '23505' ? (newProductSku.trim() ? `SKU "${newProductSku}" already exists` : 'A product with no SKU may already exist') : error.message);
                return;
            }
            showToast('success', `Added "${newProductName}"`);
            setShowAddProduct(false);
            setNewProductName('');
            setNewProductSku('');
            setNewProductSchoolId('');
            setNewProductSizes('');
            setNewProductEmbroidery(false);
            setNewProductManufacturerName('');
            setNewProductManufacturerId('');
            setNewProductManufacturerIdKids('');
            setNewProductManufacturerIdAdult('');
            await loadStock();
        } catch (error) {
            showToast('error', 'Failed to add product');
        } finally {
            setAddingProduct(false);
        }
    };

    const handleDeleteSchool = async (schoolName: string) => {
        if (!supabase) return;
        if (!confirm(`Delete "${schoolName}" and ALL its products? This cannot be undone.`)) return;
        try {
            const { data: school } = await supabase.from('schools').select('id').eq('name', schoolName).single();
            if (school) {
                await supabase.from('products').delete().eq('school_id', school.id);
                await supabase.from('schools').delete().eq('id', school.id);
            }
            showToast('success', `Deleted "${schoolName}"`);
            await loadSchools();
            await loadStock();
        } catch (error) {
            showToast('error', 'Failed to delete school');
        }
    };

    const handleDeleteSchoolById = async (schoolId: string, schoolName: string) => {
        if (!supabase) return;
        if (!confirm(`Delete "${schoolName}" and ALL its products? This cannot be undone.`)) return;
        try {
            await supabase.from('products').delete().eq('school_id', schoolId);
            await supabase.from('schools').delete().eq('id', schoolId);
            showToast('success', `Deleted "${schoolName}"`);
            await loadSchools();
            await loadStock();
        } catch (error) {
            showToast('error', 'Failed to delete school');
        }
    };

    const handleDeleteProduct = async (productId: string, productName: string) => {
        if (!supabase) return;
        if (!confirm(`Delete "${productName}"? This will remove all size/stock data and cannot be undone.`)) return;
        try {
            await supabase.from('order_items').delete().eq('product_id', productId);
            await supabase.from('products').delete().eq('id', productId);
            showToast('success', `Deleted "${productName}"`);
            await loadStock();
        } catch (error) {
            showToast('error', 'Failed to delete product');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 min-w-0 overflow-x-hidden">
            {/* Header + tab bar — full width, left-aligned like Orders module */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
            <div className={`w-full min-w-0 flex flex-col ${isMobile ? 'px-3 py-2 gap-1.5' : 'px-0 py-5 gap-4'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 min-w-0">
                    <div className="shrink-0 text-left">
                        <h1 className={`font-bold text-slate-900 tracking-tight inline-flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                            <Package className={`text-slate-500 shrink-0 ${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
                            <span>Digital In-House Stock</span>
                        </h1>
                        {!isMobile && (
                        <p className="text-slate-500 font-medium mt-0.5 text-sm">
                            Manage shelf inventory, transit stock, and reserved quantities.
                        </p>
                        )}
                        {isMobile && (
                        <p className="text-slate-500 mt-0 text-[11px] break-words">Shelf stock, transit & reserved.</p>
                        )}
                    </div>
                    {!isMobile && (
                    <div className="relative w-full sm:w-72 lg:w-96 shrink-0">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search Garment or School..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all focus:bg-white"
                        />
                    </div>
                    )}
                </div>
                {isMobile && (
                <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search Garment or School..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 min-h-[36px] text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                </div>
                )}
                <div className={`flex flex-wrap items-center gap-1.5 sm:gap-3 ${isMobile ? 'gap-1.5' : ''}`}>
                    <button
                        onClick={() => setShowAddSchool(true)}
                        className={`flex items-center justify-center gap-1 font-medium rounded-lg transition-colors shadow-sm touch-manipulation bg-[#002D2B] text-white hover:bg-[#004440] ${isMobile ? 'min-h-[36px] px-2.5 py-1.5 text-xs' : 'min-h-[44px] px-4 py-2.5 sm:py-2 text-sm'}`}
                    >
                        <Plus className={isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                        School
                    </button>
                    <button
                        onClick={() => setShowAddProduct(true)}
                        className={`flex items-center justify-center gap-1 font-medium rounded-lg transition-colors shadow-sm touch-manipulation bg-slate-900 text-white hover:bg-slate-800 ${isMobile ? 'min-h-[36px] px-2.5 py-1.5 text-xs' : 'min-h-[44px] px-4 py-2.5 sm:py-2 text-sm'}`}
                    >
                        <Plus className={isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                        Product
                    </button>
                    <button
                        onClick={loadStock}
                        disabled={loading}
                        className={`flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-sm touch-manipulation ${isMobile ? 'min-h-[36px] px-2.5 py-1.5 text-xs' : 'min-h-[44px] px-4 py-2.5 sm:py-2 text-sm'}`}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tab bar */}
            <div className={isMobile ? 'px-3 pb-1 pt-0' : 'pb-2 pt-0'}>
                <div className="flex rounded-lg bg-slate-100 p-0.5 gap-0.5" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === 'inventory'}
                        onClick={() => setActiveTab('inventory')}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-md font-semibold transition-colors touch-manipulation ${isMobile ? 'min-h-[36px] py-2 px-2 text-xs' : 'min-h-[44px] px-3 py-2.5 text-sm'} ${activeTab === 'inventory' ? 'bg-white text-[#002D2B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <Package className={isMobile ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
                        <span>Inventory</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'schools'}
                        onClick={() => setActiveTab('schools')}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-md font-semibold transition-colors touch-manipulation ${isMobile ? 'min-h-[36px] py-2 px-2 text-xs' : 'min-h-[44px] px-3 py-2.5 text-sm'} ${activeTab === 'schools' ? 'bg-white text-[#002D2B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <Building2 className={isMobile ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
                        <span>Schools</span>
                        <span className="bg-slate-200 text-slate-600 text-[10px] px-1 py-0.5 rounded-full">{schools.length}</span>
                    </button>
                </div>
            </div>
                {/* Table banner moved to main content so it aligns with cards — see below when inventory active */}
            </div>

            {/* Main content — full width, left-aligned like Orders (main already has p-8 from AppShell) */}
            <div className={`flex-1 w-full min-w-0 ${isMobile ? 'p-2 pb-8' : 'py-6'}`}>

                {/* Sticky table header — desktop inventory only; lives here so it aligns with cards */}
                {!isMobile && activeTab === 'inventory' && groupedStock.length > 0 && (
                    <div className="sticky top-0 z-10 flex items-center py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider -mx-0 mb-0">
                        <div className="flex-1 pl-4 pr-4 min-w-0">Garment Style</div>
                        <div className="flex-[2] flex justify-end shrink-0">
                            <div className="w-32 text-right pr-4">In Transit</div>
                            <div className="w-32 text-right pr-4">On Shelf</div>
                            <div className="w-32 text-right pr-4">Unprocessed</div>
                            <div className="w-32 text-right pr-4">Available</div>
                            <div className="w-20 text-right pr-2">Actions</div>
                        </div>
                    </div>
                )}

                {/* Schools Tab */}
                {activeTab === 'schools' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden min-w-0">
                        <div className={`bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 ${isMobile ? 'px-3 py-2' : 'px-6 py-4'}`}>
                            <h2 className="text-base font-bold text-slate-800 truncate min-w-0">All Active Schools</h2>
                            <button
                                onClick={() => setShowAddSchool(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                <Plus className="w-3 h-3" />
                                Add School
                            </button>
                        </div>
                        {schools.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                No schools yet. Add one to get started.
                            </div>
                        ) : (
                            <>
                                {/* Mobile: stacked cards with 44px touch targets */}
                                {isMobile && (
                                <div className="divide-y divide-slate-100">
                                    {schools.map(s => {
                                        const productCount = stock.filter(item => item.school_name === s.name).length;
                                        return (
                                            <div key={s.id} className="p-2.5 flex items-center justify-between gap-2 group">
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-slate-900 truncate text-sm">{s.name}</div>
                                                    <div className="font-mono text-slate-500 text-[11px] mt-0.5">{s.code}</div>
                                                    <span className={`inline-flex mt-1 text-[11px] font-semibold rounded px-1.5 py-0.5 ${productCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-slate-100 text-slate-400 border border-slate-200/50'}`}>
                                                        {productCount} products
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteSchoolById(s.id, s.name)}
                                                    className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors touch-manipulation shrink-0"
                                                    title={`Delete ${s.name}`}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                )}
                                {/* Desktop: table */}
                                {!isMobile && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100/80 text-xs text-slate-500 uppercase font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3">School Name</th>
                                            <th className="px-6 py-3">Code</th>
                                            <th className="px-6 py-3 text-right">Products</th>
                                            <th className="px-6 py-3 text-right w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {schools.map(s => {
                                            const productCount = stock.filter(item => item.school_name === s.name).length;
                                            return (
                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4 font-semibold text-slate-900">{s.name}</td>
                                                    <td className="px-6 py-4 font-mono text-slate-500 text-xs bg-slate-50">{s.code}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 text-xs font-semibold rounded-full ${productCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-slate-100 text-slate-400 border border-slate-200/50'}`}>
                                                            {productCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleDeleteSchoolById(s.id, s.name)}
                                                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 touch-manipulation"
                                                            title={`Delete ${s.name}`}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (<>
                    {loading && stock.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-slate-500">
                            Loading inventory...
                        </div>
                    ) : groupedStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300 shadow-sm">
                            <Package className="w-10 h-10 text-slate-300 mb-3" />
                            No garments matched your search.
                        </div>
                    ) : (
                        <div className={`space-y-4 pb-8 min-w-0 ${isMobile ? 'space-y-3 pb-6' : 'space-y-8 pb-12'}`}>
                            {groupedStock.map(({ schoolName, garments }) => (
                                <div key={schoolName} className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden min-w-0">
                                    {/* School header */}
                                    <div className={`bg-[#002D2B] border-b border-[#004440] flex items-center justify-between group/school gap-2 min-w-0 ${isMobile ? 'px-3 py-2' : 'px-6 py-4'}`}>
                                        <h2 className={`font-bold text-white uppercase tracking-wider flex items-center gap-2 min-w-0 truncate ${isMobile ? 'text-sm' : 'text-base sm:text-lg'}`}>
                                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 shrink-0" />
                                            {schoolName}
                                        </h2>
                                        {schoolName !== 'Global' && (
                                            <button
                                                onClick={() => handleDeleteSchool(schoolName)}
                                                className="p-1.5 text-emerald-700 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover/school:opacity-100"
                                                title={`Delete ${schoolName}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Column labels live in sticky header on desktop; mobile uses cards */}

                                    {/* Garment Iteration — mobile: no extra top padding */}
                                    <div className={`divide-y divide-slate-100 flex flex-col ${isMobile ? 'pt-0' : ''}`}>
                                        {garments.map(garment => (
                                            <GarmentRow
                                                key={garment.baseName}
                                                garment={garment}
                                                onAdjust={handleAdjustOpen}
                                                onDeleteProduct={handleDeleteProduct}
                                                onUnprocessedClick={handleUnprocessedClick}
                                                isMobile={isMobile}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>)}
            </div>
            {/* Adjust Stock Modal */}
            {isAdjusting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Edit className="w-5 h-5 text-slate-500" />
                                Adjust Stock
                            </h3>
                            <button
                                onClick={() => setIsAdjusting(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors focus:ring-2 focus:ring-slate-300 focus:outline-none"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {/* Product Info */}
                            <div>
                                <h4 className="font-semibold text-slate-900 text-base">{isAdjusting.name}</h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shadow-sm">{isAdjusting.school_name}</span>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="grid grid-cols-2 gap-4">
                                {/* In Transit Input */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                        <Truck className="w-3.5 h-3.5" />
                                        In-Transit
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={newTransitStock}
                                            onChange={(e) => setNewTransitStock(parseInt(e.target.value) || 0)}
                                            className="w-full pl-3 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">qty</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-tight font-medium">Ordered from supplier, arriving to embroid.</p>
                                </div>

                                {/* On Shelf Input */}
                                <div className="space-y-2 bg-slate-50 p-2.5 -mx-2.5 -mt-2.5 -mb-2.5 rounded-lg border border-slate-200/60 shadow-inner">
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        <Package className="w-3.5 h-3.5" />
                                        On Shelf
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={newShelfStock}
                                            onChange={(e) => setNewShelfStock(parseInt(e.target.value) || 0)}
                                            className="w-full pl-3 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition-shadow shadow-sm"
                                            autoFocus
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">qty</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-tight font-medium">Physical stock sitting in warehouse.</p>
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 shadow-sm">
                                <p className="text-sm text-slate-700 flex justify-between items-center font-medium">
                                    <span className="text-slate-600">Unprocessed Orders</span>
                                    <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-xs">{isAdjusting.unprocessed}</span>
                                </p>
                                <hr className="my-2 border-emerald-100/60" />
                                <p className="text-base text-slate-800 flex justify-between items-center font-bold">
                                    <span>Available Stock</span>
                                    <span className={`px-2 py-0.5 rounded border text-sm ${newShelfStock - isAdjusting.unprocessed < 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                                        {newShelfStock - isAdjusting.unprocessed}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                onClick={() => setIsAdjusting(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors focus:ring-2 focus:ring-slate-300 focus:outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitAdjustment}
                                disabled={updating}
                                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 shadow-sm transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            >
                                {updating ? 'Saving...' : 'Save Stock Updates'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unprocessed detail modal — where the count comes from; view / edit / clear */}
            {unprocessedDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => !loadingUnprocessed && setUnprocessedDetail(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-amber-50/50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <ListOrdered className="w-5 h-5 text-amber-600" />
                                Unprocessed — {unprocessedDetail.item.name} (Size {unprocessedDetail.item.size})
                            </h3>
                            <button onClick={() => setUnprocessedDetail(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 min-h-0">
                            <p className="text-sm text-slate-600 mb-3">Open orders that reserve this product/size. Edit quantity or clear to remove from count.</p>
                            {loadingUnprocessed ? (
                                <div className="py-8 text-center text-slate-500">Loading...</div>
                            ) : unprocessedDetailRows.length === 0 ? (
                                <div className="py-8 text-center text-slate-500">No unprocessed lines.</div>
                            ) : (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100 text-xs text-slate-600 uppercase font-medium">
                                            <tr>
                                                <th className="px-3 py-2">Order #</th>
                                                <th className="px-3 py-2">Status</th>
                                                <th className="px-3 py-2">Customer</th>
                                                <th className="px-3 py-2">Student</th>
                                                <th className="px-3 py-2 text-right">Qty</th>
                                                <th className="px-3 py-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {unprocessedDetailRows.map(row => (
                                                <tr key={row.order_item_id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 font-medium text-slate-800">{row.order_number}</td>
                                                    <td className="px-3 py-2 text-slate-600">{row.status}</td>
                                                    <td className="px-3 py-2 text-slate-600">{row.customer_name}</td>
                                                    <td className="px-3 py-2 text-slate-600">{row.student_name || '—'}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        {editingRow?.order_item_id === row.order_item_id ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={editQty}
                                                                onChange={(e) => setEditQty(parseInt(e.target.value, 10) || 0)}
                                                                className="w-16 px-2 py-1 border border-slate-300 rounded text-right"
                                                            />
                                                        ) : (
                                                            <span className="font-semibold">{row.quantity}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {editingRow?.order_item_id === row.order_item_id ? (
                                                            <div className="flex justify-end gap-1">
                                                                <button onClick={() => setEditingRow(null)} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                                                                <button onClick={handleSaveEditQty} disabled={savingRow} className="px-2 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded disabled:opacity-50">Save</button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-end gap-1">
                                                                <button onClick={() => { setEditingRow(row); setEditQty(row.quantity); }} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Edit quantity"><Edit className="w-4 h-4" /></button>
                                                                <button onClick={() => handleClearUnprocessed(row)} disabled={savingRow} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded" title="Set quantity to 0"><Eraser className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={() => setUnprocessedDetail(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add School Modal */}
            {showAddSchool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <School className="w-5 h-5 text-slate-500" />
                                Add School
                            </h3>
                            <button onClick={() => setShowAddSchool(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">School Name</label>
                                <input
                                    type="text"
                                    value={newSchoolName}
                                    onChange={(e) => setNewSchoolName(e.target.value)}
                                    placeholder="e.g. Flaxmill Primary School"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">School Code</label>
                                <input
                                    type="text"
                                    value={newSchoolCode}
                                    onChange={(e) => setNewSchoolCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. FLAXMILL"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                                <p className="text-[10px] text-slate-500">Short unique code used for internal reference</p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setShowAddSchool(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                            <button
                                onClick={handleAddSchool}
                                disabled={addingSchool || !newSchoolName || !newSchoolCode}
                                className="px-4 py-2 text-sm font-semibold text-white bg-[#002D2B] rounded-lg hover:bg-[#004440] disabled:opacity-50 shadow-sm transition-colors"
                            >
                                {addingSchool ? 'Adding...' : 'Add School'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {showAddProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Package className="w-5 h-5 text-slate-500" />
                                Add Product
                            </h3>
                            <button onClick={() => setShowAddProduct(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Product Name</label>
                                <input
                                    type="text"
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    placeholder="e.g. Polo Shirt - Navy"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">SKU (optional for manual products)</label>
                                <input
                                    type="text"
                                    value={newProductSku}
                                    onChange={(e) => setNewProductSku(e.target.value)}
                                    placeholder="Leave blank for sales outside WooCommerce"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">School</label>
                                <select
                                    value={newProductSchoolId}
                                    onChange={(e) => setNewProductSchoolId(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                >
                                    <option value="">No school (Global)</option>
                                    {schools.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sizes</label>
                                <input
                                    type="text"
                                    value={newProductSizes}
                                    onChange={(e) => setNewProductSizes(e.target.value)}
                                    placeholder="4, 6, 8, 10, 12, 14, 16 (even sizes only)"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                                <p className="text-[10px] text-slate-500">Comma-separated. Numeric sizes: even only (4, 6, 8 … 16). Letter sizes (S, M, L, XL) allowed.</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Manufacturer (for garment orders)</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <input
                                        type="text"
                                        value={newProductManufacturerName}
                                        onChange={(e) => setNewProductManufacturerName(e.target.value)}
                                        placeholder="Manufacturer name (e.g. AUSSIE PACIFIC)"
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                        <input
                                            type="text"
                                            value={newProductManufacturerId}
                                            onChange={(e) => setNewProductManufacturerId(e.target.value)}
                                            placeholder="Mfr ID (single)"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                        <input
                                            type="text"
                                            value={newProductManufacturerIdKids}
                                            onChange={(e) => setNewProductManufacturerIdKids(e.target.value)}
                                            placeholder="Kids ID"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                        <input
                                            type="text"
                                            value={newProductManufacturerIdAdult}
                                            onChange={(e) => setNewProductManufacturerIdAdult(e.target.value)}
                                            placeholder="Adult ID"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="embroidery-check"
                                    checked={newProductEmbroidery}
                                    onChange={(e) => setNewProductEmbroidery(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <label htmlFor="embroidery-check" className="text-sm text-slate-700 font-medium">Requires Embroidery</label>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setShowAddProduct(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                            <button
                                onClick={handleAddProduct}
                                disabled={addingProduct || !newProductName}
                                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 shadow-sm transition-colors"
                            >
                                {addingProduct ? 'Adding...' : 'Add Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-4 duration-200 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
