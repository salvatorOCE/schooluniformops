'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useData } from '@/lib/data-provider';
import { DashboardStats } from '@/lib/types';
import { useUI } from '@/lib/ui-context';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Scissors,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw
} from 'lucide-react';

const REFRESH_INTERVAL = 30_000; // 30 seconds

export default function DashboardPage() {
  const adapter = useData();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<import('@/lib/types').HistoryEvent[]>([]);
  const [pendingCollections, setPendingCollections] = useState<Array<{ schoolName: string; count: number }>>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { density } = useUI();

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    const [data, activity, collections] = await Promise.all([
      adapter.getDashboardStats(),
      adapter.getRecentActivity(),
      adapter.getPendingCollections()
    ]);
    setStats(data);
    setRecentActivity(activity);
    setPendingCollections(collections);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [adapter]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => loadStats(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadStats]);

  const isComfort = density === 'comfort';

  // Loading skeleton
  if (!stats) {
    return (
      <div className={cn("max-w-[1600px] mx-auto", isComfort ? 'space-y-8' : 'space-y-4')}>
        <div className="flex items-end justify-between border-b border-slate-200 pb-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-8 w-12 ml-auto" />
            <Skeleton className="h-3 w-32 ml-auto" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="kpi" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="card" className="h-48" />
          <Skeleton variant="card" className="h-48" />
        </div>
      </div>
    );
  }

  const workflow = {
    ready: { label: 'Ready for Production', count: stats.ready_to_pack, status: 'On Track' },
    production: { label: 'In Production', count: stats.awaiting_embroidery, status: 'Active' },
    dispatch: { label: 'Awaiting Dispatch', count: stats.ready_to_pack, status: 'Processing' }, // Assuming ready_to_pack is dispatch queue? No, ready_to_pack is packing.
    // Clarification: ready_to_pack -> Pack -> Dispatched.
    // DashboardStats has: awaiting_embroidery, ready_to_pack, dispatched_today, exceptions.
    // Logic: 
    // Ready for Prod = Awaiting Embroidery (Wait, Awaiting Embroidery IS ready for prod).
    // In Production = ??? (We don't track 'Started Embroidery' vs 'Awaiting' well in stats yet, assuming all Awaiting are in queue).
    // Let's stick to stats provided.
    // 'Ready for Production' -> Maybe 'Imported'? No stats for imported.
    // Let's use 'awaiting_embroidery' for 'Ready for Prod'.
    // 'In Production' -> 'Partial'? No stats.
    // Let's adjust labels to match data we have.
    exceptions: { label: 'Recovery Needed', count: stats.exceptions, status: 'Action Req' }
  };

  return (
    <div className={cn("max-w-[1600px] mx-auto", isComfort ? 'space-y-8' : 'space-y-4')}>
      {/* Supervisor Control Header */}
      <div className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facility Overview</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
              Main Hub • Online
            </span>
            {lastUpdated && (
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-emerald-500")} />
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-slate-900 leading-none">
            {stats.dispatched_today}
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
            Units Dispatched (24h)
          </div>
        </div>
      </div>

      {/* Workflow Visualization (The Flow) */}
      <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-4", isComfort ? 'gap-6' : 'gap-3')}>

        {/* 1. READY */}
        <div className="group relative bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-all shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-lg" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ready for Prod</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{stats.awaiting_embroidery}</div>
          <div className="text-xs font-medium text-blue-600 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
            Queue Active
          </div>
        </div>

        {/* 2. IN PRODUCTION (Using same stat for now as placeholder or need new stat) */}
        <Link href="/embroidery" className="group relative bg-white border border-slate-200 rounded-lg p-4 hover:border-amber-300 transition-all shadow-sm hover:shadow-md cursor-pointer">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-lg" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Embroidery</span>
            <Scissors className="w-4 h-4 text-amber-500" />
          </div>
          {/* We don't have 'In Progress' distinct from 'Awaiting' in stats yet. Usage of awaiting_embroidery here implies backlog. */}
          <div className="text-3xl font-bold text-slate-900 mb-1">{stats.awaiting_embroidery}</div>
          <div className="text-xs font-medium text-amber-700 bg-amber-50 inline-block px-1.5 py-0.5 rounded">
            {stats.awaiting_embroidery > 10 ? 'High Volume' : 'Steady Flow'}
          </div>
        </Link>

        {/* 3. DISPATCH */}
        <Link href="/distribution" className="group relative bg-white border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-all shadow-sm hover:shadow-md cursor-pointer">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-lg" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Dispatch</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{stats.ready_to_pack}</div>
          <div className="text-xs font-medium text-emerald-700 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">
            Clearance
          </div>
        </Link>

        {/* 4. RECOVERY */}
        <Link href="/exceptions" className="group relative bg-white border border-slate-200 rounded-lg p-4 hover:border-red-300 transition-all shadow-sm hover:shadow-md cursor-pointer">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600 rounded-l-lg" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exceptions</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{stats.exceptions}</div>
          {stats.exceptions === 0 ? (
            <div className="text-xs font-medium text-emerald-600 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">
              All Clear
            </div>
          ) : (
            <div className="text-xs font-medium text-red-700 bg-red-50 inline-block px-1.5 py-0.5 rounded animate-pulse">
              Action Required
            </div>
          )}
        </Link>
      </div>

      {/* Premium Empty State / Momentum Builder */}
      {stats.exceptions === 0 && (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Operations Optimal</h3>
            <p className="text-xs text-emerald-700/80 mt-0.5">No active exceptions. You are running smooth.</p>
          </div>
        </div>
      )}

      {/* Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Recent Activity
            </h3>
            <Link href="/history" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View Audit Log</Link>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">No recent activity recorded.</p>
            ) : (
              recentActivity.map((event) => (
                <div key={event.id} className="flex gap-3 text-sm pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <span className="text-slate-400 font-mono text-xs pt-0.5">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div>
                    <p className="text-slate-700 font-medium">{event.details}</p>
                    <p className="text-xs text-slate-500">System • Automatic</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-400" />
              Pending Collections
            </h3>
            <span className="text-xs font-medium text-slate-500">Pickups Ready</span>
          </div>
          <div className={cn("space-y-2", !isComfort && 'space-y-1')}>
            {pendingCollections.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">No pending collections.</p>
            ) : (
              pendingCollections.map((pc, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="font-bold text-slate-700 text-sm truncate max-w-[200px]">{pc.schoolName}</span>
                  <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{pc.count} Orders</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
