import React, { useEffect, useState } from 'react';
import { Loader2, Package, Users, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import { fetchAllOrders } from '../lib/orders';
import {
  computeOrdersByStatus,
  computeTailorLoads,
  computeRevenueThisMonth,
  computeOutstandingBalance,
  fetchNewClientsThisMonth,
} from '../lib/analytics';
import type { OrderStatusCount, TailorLoad } from '../lib/analytics';
import { useAuth } from '../lib/auth';

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
}

const StatTile: React.FC<StatTileProps> = ({ icon, label, value, badge }) => (
  <div className="glass p-5 sm:p-6 rounded-2xl flex items-center gap-4 hover:border-gold-500/40 hover:shadow-luxury transition-all duration-200 group">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-50 to-accent-50 text-accent-800 border border-gold-500/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-gray-500 font-medium tracking-wide uppercase">{label}</span>
        {badge && (
          <span className="text-[10px] font-semibold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full border border-gold-500/20">
            {badge}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-accent-950 font-display tracking-tight mt-0.5">{value}</div>
    </div>
  </div>
);

interface RankedBarListProps {
  title: string;
  rows: { label: string; count: number }[];
}

// A refined luxury single-hue horizontal bar list with gold-burgundy gradient bars
const RankedBarList: React.FC<RankedBarListProps> = ({ title, rows }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="glass p-6 sm:p-7 rounded-3xl space-y-5 border border-gold-500/20 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-accent-950 font-display tracking-wide">{title}</h3>
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{rows.length} Categories</span>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No active records recorded yet.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const percentage = Math.round((row.count / max) * 100);
            return (
              <div key={row.label} className="group">
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-medium text-gray-700 capitalize group-hover:text-accent-900 transition-colors">
                    {row.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-accent-950 font-mono text-xs">{row.count}</span>
                    <span className="text-[10px] text-gray-400">({percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-gray-100/80 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                  <div
                    className="h-full bg-gradient-to-r from-gold-500 via-accent-500 to-accent-800 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const StaffDashboard: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [isLoading, setIsLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<OrderStatusCount[]>([]);
  const [tailorLoads, setTailorLoads] = useState<TailorLoad[]>([]);
  const [activeOrders, setActiveOrders] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [newClients, setNewClients] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const [orders, clientsThisMonth] = await Promise.all([fetchAllOrders(), fetchNewClientsThisMonth()]);
        if (!isMounted) return;

        // Tailors see their own pipeline/task load; admins see the whole atelier.
        const scopedOrders = isAdmin
          ? orders
          : orders.filter((o) => o.assignedTailor === profile?.full_name);

        setStatusCounts(computeOrdersByStatus(scopedOrders));
        setTailorLoads(isAdmin ? computeTailorLoads(orders) : []);
        setActiveOrders(scopedOrders.filter((o) => o.stage !== 'delivered').length);
        setRevenueThisMonth(computeRevenueThisMonth(orders));
        setOutstandingBalance(computeOutstandingBalance(orders));
        setNewClients(clientsThisMonth);
      } catch (err) {
        console.error('[StaffDashboard] Failed to load analytics:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, profile?.full_name]);

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col justify-center items-center gap-3 text-gray-500 text-sm">
        <Loader2 size={22} className="animate-spin text-accent-700" />
        <span className="font-medium">Loading atelier dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Overview Title Banner */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-accent-800 bg-accent-50/80 border border-accent-200/60 shadow-sm">
          <Sparkles size={13} className="text-gold-600" />
          <span>Atelier Overview</span>
        </div>
        <h2 className="text-3xl sm:text-4xl text-accent-950 font-display font-semibold tracking-tight">Dashboard</h2>
        <p className="text-xs sm:text-sm text-gray-500 font-sans">
          {isAdmin ? 'Atelier-wide real-time performance & production analytics.' : 'Your assigned bespoke orders and active workload.'}
        </p>
      </div>

      {/* KPI Tiles */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        <StatTile icon={<Package size={20} />} label="Active Orders" value={String(activeOrders)} />
        {isAdmin && <StatTile icon={<Users size={20} />} label="New Clients" value={String(newClients)} badge="This Month" />}
        {isAdmin && (
          <StatTile
            icon={<TrendingUp size={20} />}
            label="Revenue"
            value={`GHS ${revenueThisMonth.toLocaleString()}`}
            badge="This Month"
          />
        )}
        {isAdmin && (
          <StatTile
            icon={<Wallet size={20} />}
            label="Outstanding"
            value={`GHS ${outstandingBalance.toLocaleString()}`}
          />
        )}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankedBarList
          title={isAdmin ? 'Orders by Stage' : 'Your Orders by Stage'}
          rows={statusCounts.map((s) => ({ label: s.label, count: s.count }))}
        />
        {isAdmin && (
          <RankedBarList
            title="Tailor Workload (Active Orders)"
            rows={tailorLoads.map((t) => ({ label: t.tailorName, count: t.activeOrders }))}
          />
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
