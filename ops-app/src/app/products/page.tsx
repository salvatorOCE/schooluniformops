'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Package, Search, RefreshCw, Pencil, X, Download, ChevronDown, ChevronRight, ImageIcon, BarChart3 } from 'lucide-react';
import { useData } from '@/lib/data-provider';
import { useSession } from '@/lib/session-context';
import { exportToCSV } from '@/lib/csv-export';
import { useMobile } from '@/lib/mobile-context';
import type { ProductListRow, ProductUpdatePayload } from '@/lib/types';

function formatDate(iso: string): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}

function manufacturerIdDisplay(p: ProductListRow): string {
    if (p.manufacturer_id) return p.manufacturer_id;
    const parts: string[] = [];
    if (p.manufacturer_id_kids) parts.push(`Kids: ${p.manufacturer_id_kids}`);
    if (p.manufacturer_id_adult) parts.push(`Adult: ${p.manufacturer_id_adult}`);
    return parts.length ? parts.join(' · ') : '—';
}

function totalCost(p: ProductListRow): number | null {
    const cost = p.cost != null ? Number(p.cost) : null;
    const emb = p.embroidery_print_cost != null ? Number(p.embroidery_print_cost) : null;
    if (cost == null && emb == null) return null;
    return (cost ?? 0) + (emb ?? 0);
}

function formatMoney(n: number | null): string {
    if (n == null) return '—';
    return `$${Number(n).toFixed(2)}`;
}

function ProductDetailPanel({ productId, isSchool }: { productId: string; isSchool: boolean }) {
    const [images, setImages] = useState<{ front: string | null; back: string | null; images: string[] } | null>(null);
    const [stats, setStats] = useState<Record<string, number> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const opts: RequestInit = { credentials: 'same-origin' };
        Promise.all([
            fetch(`/api/woo/product-images?productId=${encodeURIComponent(productId)}`, opts).then(async r => {
                const json = await r.json().catch(() => null);
                if (!r.ok || (json && 'error' in json)) return null;
                return json;
            }),
            fetch(`/api/products/${encodeURIComponent(productId)}/stats`, opts).then(async r => {
                const json = await r.json().catch(() => null);
                if (!r.ok || (json && 'error' in json)) return null;
                return json;
            }),
        ]).then(([imgRes, statsRes]) => {
            if (cancelled) return;
            setImages(imgRes?.front != null || imgRes?.images?.length ? imgRes : null);
            setStats(statsRes && typeof statsRes.unitsSold === 'number' ? statsRes : null);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [productId]);

    if (loading) {
        return <div className="px-4 py-6 text-sm text-slate-500">Loading…</div>;
    }

    const imageUrls = images?.images?.length ? images.images : [images?.front, images?.back].filter(Boolean) as string[];

    return (
        <div className="px-4 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row gap-6">
            {/* Photos */}
            <div className="shrink-0">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Photos
                </h4>
                {imageUrls.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {imageUrls.slice(0, 4).map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                alt={`Product ${i + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-slate-200 bg-white"
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">No images available</p>
                )}
            </div>
            {/* Analytics */}
            <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Analytics
                </h4>
                {stats ? (
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div><span className="text-slate-500">Units sold</span> <span className="font-medium text-slate-900">{stats.unitsSold ?? 0}</span></div>
                        <div><span className="text-slate-500">Orders</span> <span className="font-medium text-slate-900">{stats.numOrders ?? 0}</span></div>
                        <div><span className="text-slate-500">Avg per order</span> <span className="font-medium text-slate-900">{stats.avgPerOrder ?? 0}</span></div>
                        {!isSchool && (
                            <>
                                <div><span className="text-slate-500">Revenue</span> <span className="font-medium text-slate-900">{formatMoney(stats.revenue)}</span></div>
                                <div><span className="text-slate-500">Cost</span> <span className="font-medium text-slate-900">{formatMoney(stats.totalCost)}</span></div>
                                <div><span className="text-slate-500">Profit</span> <span className="font-medium text-emerald-700">{formatMoney(stats.profit)}</span></div>
                            </>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">No sales data yet</p>
                )}
            </div>
        </div>
    );
}

export default function AllProductsPage() {
    const adapter = useData();
    const { isMobile } = useMobile();
    const { role, schoolCode } = useSession();
    const [products, setProducts] = useState<ProductListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<ProductListRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState<{
        name: string;
        sku: string;
        category: string;
        price: string;
        school_id: string;
        manufacturer_name: string;
        manufacturer_id: string;
        manufacturer_id_kids: string;
        manufacturer_id_adult: string;
        manufacturer_product: string;
        is_available_for_sale: boolean;
        cost: string;
        embroidery_print_cost: string;
    }>({ name: '', sku: '', category: '', price: '', school_id: '', manufacturer_name: '', manufacturer_id: '', manufacturer_id_kids: '', manufacturer_id_adult: '', manufacturer_product: '', is_available_for_sale: true, cost: '', embroidery_print_cost: '' });
    const [editError, setEditError] = useState<string | null>(null);
    const [schools, setSchools] = useState<{ id: string; code: string; name: string }[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await adapter.getAllProducts();
            setProducts(data);
        } catch (e) {
            console.error('Failed to load products', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [adapter]);

    useEffect(() => {
        adapter.getSchools().then(setSchools).catch(() => {});
    }, [adapter]);

    const isSchool = role === 'school';

    const schoolScoped = useMemo(() => {
        if (role !== 'school' || !schoolCode) return products;
        const norm = (v: string | null | undefined) => (v || '').trim().toUpperCase();
        const target = norm(schoolCode);
        if (!target) return products;
        return products.filter((p) => {
            const code = norm(p.school_code);
            const name = norm(p.school_name);
            if (code && (code === target || code.startsWith(target) || target.startsWith(code))) {
                return true;
            }
            if (name && (name.includes(target) || target.includes(name))) {
                return true;
            }
            return false;
        });
    }, [products, role, schoolCode]);

    const filtered = useMemo(() => {
        if (!search.trim()) return schoolScoped;
        const q = search.toLowerCase().trim();
        return schoolScoped.filter(
            (p) =>
                (p.sku && p.sku.toLowerCase().includes(q)) ||
                p.name.toLowerCase().includes(q) ||
                (p.school_name && p.school_name.toLowerCase().includes(q)) ||
                (p.school_code && p.school_code.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q)) ||
                (!isSchool && (
                    (p.manufacturer_name && p.manufacturer_name.toLowerCase().includes(q)) ||
                    (p.manufacturer_id && p.manufacturer_id.toLowerCase().includes(q)) ||
                    (p.manufacturer_id_kids && p.manufacturer_id_kids.toLowerCase().includes(q)) ||
                    (p.manufacturer_id_adult && p.manufacturer_id_adult.toLowerCase().includes(q))
                ))
        );
    }, [schoolScoped, search, isSchool]);

    const openEdit = (p: ProductListRow) => {
        setEditing(p);
        setEditForm({
            name: p.name ?? '',
            sku: p.sku ?? '',
            category: p.category ?? '',
            price: p.price != null ? String(p.price) : '',
            school_id: p.school_id ?? '',
            manufacturer_name: p.manufacturer_name ?? '',
            manufacturer_id: p.manufacturer_id ?? '',
            manufacturer_id_kids: p.manufacturer_id_kids ?? '',
            manufacturer_id_adult: p.manufacturer_id_adult ?? '',
            manufacturer_product: p.manufacturer_product ?? '',
            is_available_for_sale: p.is_available_for_sale !== false,
            cost: p.cost != null ? String(p.cost) : '',
            embroidery_print_cost: p.embroidery_print_cost != null ? String(p.embroidery_print_cost) : '',
        });
        setEditError(null);
    };

    const validateAndSave = async () => {
        if (!editing) return;
        const nameTrim = editForm.name.trim();
        if (!nameTrim) {
            setEditError('Product name is required.');
            return;
        }
        const wantAvailable = editForm.is_available_for_sale;
        const hasMfrName = editForm.manufacturer_name.trim().length > 0;
        const hasMfrId = Boolean(
            editForm.manufacturer_id.trim() ||
            editForm.manufacturer_id_kids.trim() ||
            editForm.manufacturer_id_adult.trim()
        );
        if (wantAvailable && (!hasMfrName || !hasMfrId)) {
            setEditError('To mark as Available for Sale, both Manufacturer name and at least one Manufacturer ID (or Kids/Adult IDs) are required.');
            return;
        }
        setEditError(null);
        setSaving(true);
        try {
            const payload: ProductUpdatePayload = {
                name: nameTrim,
                sku: editForm.sku.trim() || null,
                category: editForm.category.trim() || null,
                price: editForm.price.trim() ? parseFloat(editForm.price) : 0,
                school_id: editForm.school_id.trim() || null,
                manufacturer_name: editForm.manufacturer_name.trim() || null,
                manufacturer_id: editForm.manufacturer_id.trim() || null,
                manufacturer_id_kids: editForm.manufacturer_id_kids.trim() || null,
                manufacturer_id_adult: editForm.manufacturer_id_adult.trim() || null,
                manufacturer_product: editForm.manufacturer_product.trim() || null,
                is_available_for_sale: editForm.is_available_for_sale,
                cost: editForm.cost.trim() ? parseFloat(editForm.cost) : null,
                embroidery_print_cost: editForm.embroidery_print_cost.trim() ? parseFloat(editForm.embroidery_print_cost) : null,
            };
            await adapter.updateProduct(editing.id, payload);
            setEditing(null);
            await load();
        } catch (e) {
            setEditError(e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading && products.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
                <div className="p-8 text-center text-slate-500">Loading all products...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 min-w-0 overflow-x-hidden">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
                <div className={`w-full min-w-0 flex flex-col ${isMobile ? 'px-3 py-2 gap-1.5' : 'px-0 py-5 gap-4'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 min-w-0">
                        <div className="shrink-0 text-left">
                            <h1 className={`font-bold text-slate-900 tracking-tight inline-flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                                <Package className={`text-slate-500 shrink-0 ${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
                                <span>All Products</span>
                            </h1>
                            {!isMobile && (
                                <p className="text-slate-500 font-medium mt-0.5 text-sm">
                                    {isSchool ? 'Product codes, school, and price charged.' : 'Codes, price (charged), manufacturer, stock. Use manufacturer ID when placing garment orders.'}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="relative w-full sm:w-64 shrink-0">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder={isSchool ? 'Search SKU, name, school...' : 'Search SKU, name, school, manufacturer...'}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                />
                            </div>
                            <button
                                onClick={load}
                                disabled={loading}
                                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={() => exportToCSV(
                                    filtered.map(p => isSchool ? { sku: p.sku, name: p.name, school_code: p.school_code, school_name: p.school_name, price: p.price } : { ...p, _mfrId: manufacturerIdDisplay(p), _totalCost: totalCost(p) }),
                                    {
                                        filename: 'products',
                                        columns: isSchool
                                            ? [
                                                { key: 'sku', label: 'Code SKU' },
                                                { key: 'name', label: 'Name' },
                                                { key: 'school_code', label: 'School code' },
                                                { key: 'school_name', label: 'School name' },
                                                { key: 'price', label: 'Price charged' },
                                            ]
                                            : [
                                                { key: 'sku', label: 'Code SKU' },
                                                { key: 'name', label: 'Name' },
                                                { key: 'school_name', label: 'School' },
                                                { key: 'manufacturer_name', label: 'Manufacturer' },
                                                { key: 'manufacturer_product', label: 'Manufacturer product' },
                                                { key: '_mfrId', label: 'Manufacturer Product ID (Kids/Adult)' },
                                                { key: 'price', label: 'Price charged' },
                                                { key: 'cost', label: 'Cost for us' },
                                                { key: 'embroidery_print_cost', label: 'Total Embroidery/Print cost' },
                                                { key: '_totalCost', label: 'Total Cost' },
                                                { key: 'woocommerce_id', label: 'WOO ID' },
                                                { key: 'updated_at', label: 'Last Updated' },
                                            ],
                                    }
                                )}
                                disabled={filtered.length === 0}
                                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                title="Export CSV"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="text-sm text-slate-500">
                        {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                        {search && ` (filtered from ${products.length})`}
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-6 min-w-0">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className={`w-full text-sm ${isSchool ? 'min-w-[400px]' : 'min-w-[900px]'}`}>
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-2 py-3 w-10" aria-label="Expand" />
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Code SKU</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Name</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">School</th>
                                    {!isSchool && (
                                        <>
                                            <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Manufacturer</th>
                                            <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Manufacturer product</th>
                                            <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Manufacturer Product ID (Kids/Adult)</th>
                                        </>
                                    )}
                                    <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Price charged</th>
                                    {!isSchool && (
                                        <>
                                            <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Cost for us</th>
                                            <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Total Embroidery/Print cost</th>
                                            <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Total Cost</th>
                                            <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">WOO ID</th>
                                            <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Last Updated</th>
                                            <th className="px-3 py-3 w-10" aria-label="Edit" />
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((p) => (
                                    <React.Fragment key={p.id}>
                                        <tr
                                            className="hover:bg-slate-50/80 cursor-pointer"
                                            onClick={() => setExpandedId(prev => prev === p.id ? null : p.id)}
                                        >
                                            <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedId(prev => prev === p.id ? null : p.id)}
                                                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                                                    aria-label={expandedId === p.id ? 'Collapse' : 'Expand'}
                                                >
                                                    {expandedId === p.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-slate-700">{p.sku ?? '—'}</td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900">{p.name}</td>
                                        <td className="px-3 py-2.5 text-slate-600">
                                            {p.school_name ? (
                                                <span title={p.school_code ?? undefined}>{p.school_name}{p.school_code ? ` (${p.school_code})` : ''}</span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        {!isSchool && (
                                            <>
                                                <td className="px-3 py-2.5 text-slate-700">{p.manufacturer_name ?? '—'}</td>
                                                <td className="px-3 py-2.5 text-slate-600">{p.manufacturer_product ?? '—'}</td>
                                                <td className="px-3 py-2.5 font-mono text-slate-600 text-xs">{manufacturerIdDisplay(p)}</td>
                                            </>
                                        )}
                                        <td className="px-3 py-2.5 text-right font-medium text-slate-900">{formatMoney(p.price)}</td>
                                        {!isSchool && (
                                            <>
                                                <td className="px-3 py-2.5 text-right text-slate-600">{formatMoney(p.cost)}</td>
                                                <td className="px-3 py-2.5 text-right text-slate-600">{formatMoney(p.embroidery_print_cost)}</td>
                                                <td className="px-3 py-2.5 text-right font-medium text-slate-700">{formatMoney(totalCost(p))}</td>
                                                <td className="px-3 py-2.5 text-right font-mono text-slate-500 text-xs">{p.woocommerce_id ?? '—'}</td>
                                                <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(p.updated_at)}</td>
                                                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(p)}
                                                        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                                        title="Edit product"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                        </tr>
                                        {expandedId === p.id && (
                                            <tr>
                                                <td colSpan={isSchool ? 5 : 14} className="p-0 align-top">
                                                    <ProductDetailPanel productId={p.id} isSchool={isSchool} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-slate-500">
                            {search ? 'No products match your search.' : 'No products yet.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Product (Manufacturer & Availability) Modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900">Edit product — manufacturer</h3>
                            <button
                                type="button"
                                onClick={() => { setEditing(null); setEditError(null); }}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            {editing.woocommerce_id != null && (
                                <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                    Synced from WooCommerce – name/SKU changes are local only and won’t update WooCommerce.
                                </p>
                            )}
                            {editing.woocommerce_id == null && (
                                <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                    Manual product (no WooCommerce link). Edit name, SKU, and all fields freely.
                                </p>
                            )}
                            {editError && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm border border-red-100">
                                    {editError}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Product name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. ½ Zip Jumper - Black"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Code / SKU (optional for manual products)</label>
                                <input
                                    type="text"
                                    value={editForm.sku}
                                    onChange={(e) => setEditForm((f) => ({ ...f, sku: e.target.value }))}
                                    placeholder="Leave blank if no SKU"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Category</label>
                                    <input
                                        type="text"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                                        placeholder="e.g. Elizabeth Downs Primary School"
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">School</label>
                                    <select
                                        value={editForm.school_id}
                                        onChange={(e) => setEditForm((f) => ({ ...f, school_id: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                    >
                                        <option value="">No school</option>
                                        {schools.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Price charged</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div className="border-t border-slate-200 pt-4 mt-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Manufacturer & cost</span>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Manufacturer name</label>
                                <input
                                    type="text"
                                    value={editForm.manufacturer_name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, manufacturer_name: e.target.value }))}
                                    placeholder="e.g. AUSSIE PACIFIC, WinningSpirit"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mfr ID (single)</label>
                                    <input
                                        type="text"
                                        value={editForm.manufacturer_id}
                                        onChange={(e) => setEditForm((f) => ({ ...f, manufacturer_id: e.target.value }))}
                                        placeholder="e.g. FL02"
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Kids ID</label>
                                    <input
                                        type="text"
                                        value={editForm.manufacturer_id_kids}
                                        onChange={(e) => setEditForm((f) => ({ ...f, manufacturer_id_kids: e.target.value }))}
                                        placeholder="e.g. 3307"
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Adult ID</label>
                                    <input
                                        type="text"
                                        value={editForm.manufacturer_id_adult}
                                        onChange={(e) => setEditForm((f) => ({ ...f, manufacturer_id_adult: e.target.value }))}
                                        placeholder="e.g. 1319"
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Manufacturer product</label>
                                <input
                                    type="text"
                                    value={editForm.manufacturer_product}
                                    onChange={(e) => setEditForm((f) => ({ ...f, manufacturer_product: e.target.value }))}
                                    placeholder="Product name/code as manufacturer refers to it"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cost for us</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={editForm.cost}
                                        onChange={(e) => setEditForm((f) => ({ ...f, cost: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Embroidery/Print cost</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={editForm.embroidery_print_cost}
                                        onChange={(e) => setEditForm((f) => ({ ...f, embroidery_print_cost: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="edit-available"
                                    checked={editForm.is_available_for_sale}
                                    onChange={(e) => setEditForm((f) => ({ ...f, is_available_for_sale: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <label htmlFor="edit-available" className="text-sm text-slate-700 font-medium">
                                    Available for sale (requires manufacturer assigned)
                                </label>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => { setEditing(null); setEditError(null); }}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={validateAndSave}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
