import React, { useEffect, useState } from 'react';
import { Loader2, Package, Users, TrendingUp, Wallet } from 'lucide-react';
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
}

const StatTile: React.FC<StatTileProps> = ({ icon, label, value }) => (
  <div className="glass p-5 flex items-center gap-4">
    <div className="w-10 h-10 bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  </div>
);

interface RankedBarListProps {
  title: string;
  rows: { label: string; count: number }[];
}

// A single-hue horizontal bar list — one measure across categories, direct-labeled,
// no legend needed since it's one series (consistent with the app's own accent/gray tokens).
const RankedBarList: React.FC<RankedBarListProps> = ({ title, rows }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="glass p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 font-sans">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-gray-600 capitalize">{row.label}</span>
                <span className="font-medium text-gray-900">{row.count}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-500 to-accent-800 transition-all"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
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
      <div className="p-16 flex justify-center items-center gap-2 text-gray-500 text-sm">
        <Loader2 size={18} className="animate-spin" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <span className="text-xs font-medium text-accent-600">Overview</span>
        <h2 className="text-2xl sm:text-3xl">Dashboard</h2>
        <p className="text-sm text-gray-500">
          {isAdmin ? 'Atelier-wide performance at a glance.' : 'Your active orders and workload at a glance.'}
        </p>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        <StatTile icon={<Package size={18} />} label="Active Orders" value={String(activeOrders)} />
        {isAdmin && <StatTile icon={<Users size={18} />} label="New Clients This Month" value={String(newClients)} />}
        {isAdmin && (
          <StatTile
            icon={<TrendingUp size={18} />}
            label="Revenue This Month"
            value={`GHS ${revenueThisMonth.toLocaleString()}`}
          />
        )}
        {isAdmin && (
          <StatTile
            icon={<Wallet size={18} />}
            label="Outstanding Balance"
            value={`GHS ${outstandingBalance.toLocaleString()}`}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankedBarList
          title={isAdmin ? 'Orders by Status' : 'Your Orders by Status'}
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
