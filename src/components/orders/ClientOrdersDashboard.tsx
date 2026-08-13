import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  Ruler,
  PackageOpen,
  ShoppingBag,
} from 'lucide-react';
import type { BespokeJobOrder, WorkshopStage, MeasurementParameter } from '../../types/workshop.types';
import { FabricStatusBadge } from '../ui/FabricStatusBadge';
import type { FabricStatus } from '../ui/FabricStatusBadge';
import { fetchAllOrders, subscribeToOrderChanges } from '../../lib/orders';
import { getAllOfflineJobCards, saveOfflineJobCard, isOnline } from '../../lib/offlineStore';
import { fetchMeasurementParameters } from '../../lib/measurementParameters';
import { useAuth } from '../../lib/auth';

interface ClientOrdersDashboardProps {
  onViewOrder: (orderId: string) => void;
  onGoToMeasurements: () => void;
}

function stageBadgeStatus(stage: WorkshopStage): FabricStatus {
  if (stage === 'fitting') return 'FITTING';
  if (stage === 'ready' || stage === 'delivered') return 'READY';
  return 'CUTTING';
}

const STAGE_LABELS: Record<WorkshopStage, string> = {
  pending: 'Received',
  cutting: 'In Cutting',
  fitting: 'In Fitting',
  finishing: 'Finishing',
  ready: 'Ready for Pickup',
  delivered: 'Delivered',
};

export const ClientOrdersDashboard: React.FC<ClientOrdersDashboardProps> = ({
  onViewOrder,
  onGoToMeasurements,
}) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<BespokeJobOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [measurementParameters, setMeasurementParameters] = useState<MeasurementParameter[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchMeasurementParameters()
      .then((params) => {
        if (isMounted) setMeasurementParameters(params);
      })
      .catch((err) => console.error('[ClientOrdersDashboard] Failed to load measurement parameters:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const mine = (list: BespokeJobOrder[]) => list.filter((o) => o.clientId === user?.id);

      if (!isOnline()) {
        if (isMounted) {
          setOrders(mine(getAllOfflineJobCards()));
          setIsLoading(false);
        }
        return;
      }

      try {
        const live = await fetchAllOrders();
        if (!isMounted) return;
        live.forEach((o) => saveOfflineJobCard(o));
        setOrders(mine(live));
        setSyncError(null);
      } catch (err) {
        console.error('[ClientOrdersDashboard] Failed to load orders from Supabase:', err);
        if (!isMounted) return;
        setSyncError('Showing locally cached data — could not reach the atelier server.');
        setOrders(mine(getAllOfflineJobCards()));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    const unsubscribe = subscribeToOrderChanges(load);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id]);

  const currentOrders = orders
    .filter((o) => o.stage !== 'delivered')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pastOrders = orders
    .filter((o) => o.stage === 'delivered')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const measurements = orders.find((o) => o.measurements?.updatedAt)?.measurements;

  return (
    <div className="max-w-5xl mx-auto space-y-9 animate-in fade-in duration-300">
      {/* Title Section */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-accent-800 bg-accent-50/80 border border-accent-200/60 shadow-sm">
          <ShoppingBag size={13} className="text-gold-600" />
          <span>Client Wardrobe</span>
        </div>
        <h2 className="text-3xl sm:text-4xl text-accent-950 font-display font-semibold tracking-tight">My Commissions</h2>
        <p className="text-xs sm:text-sm text-gray-500 font-sans">
          Track every bespoke commission from fabric drafting to final fitting and collection.
        </p>
      </div>

      {isLoading && (
        <div className="p-12 flex flex-col justify-center items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={20} className="animate-spin text-accent-700" />
          <span>Loading bespoke commissions...</span>
        </div>
      )}

      {syncError && (
        <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0 text-amber-700" />
          <span>{syncError}</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Measurements Summary Card */}
          <div
            onClick={onGoToMeasurements}
            className="p-6 sm:p-7 glass rounded-3xl cursor-pointer hover:border-gold-500/40 hover:shadow-luxury transition-all duration-200 border border-gold-500/25 shadow-sm group"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold-50 text-gold-700 border border-gold-500/20 flex items-center justify-center">
                  <Ruler size={15} />
                </div>
                <span className="text-xs font-semibold text-accent-950 uppercase tracking-widest">
                  Master Sizing Passport
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-900 group-hover:text-accent-700 transition-colors bg-white/80 px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-sm">
                <span>{measurements ? 'Update Profile' : 'Add Measurements'}</span>
                <ArrowUpRight size={13} />
              </span>
            </div>

            {measurements && Object.keys(measurements.values).length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm pt-1">
                {(measurementParameters.length > 0
                  ? measurementParameters
                  : Object.keys(measurements.values).map((key) => ({ key, label: key.replace(/_/g, ' ') }))
                ).map((p) => (
                  <div key={p.key} className="text-center p-3 rounded-xl bg-white/60 border border-gray-200/60">
                    <div className="text-[11px] font-medium text-gray-500 capitalize truncate">{p.label}</div>
                    <div className="text-accent-950 font-bold font-mono text-sm mt-0.5">
                      {measurements.values[p.key] ?? '—'}{' '}
                      <span className="text-[10px] font-normal text-gold-700">{measurements.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 leading-relaxed">
                No measurements recorded yet. Click to sync your bespoke measurements with the atelier master profile.
              </p>
            )}
          </div>

          {/* Current Orders */}
          <div className="space-y-4">
            <span className="text-xs font-semibold text-accent-950 uppercase tracking-widest block">
              Active Commissions ({currentOrders.length})
            </span>

            {currentOrders.length === 0 ? (
              <div className="p-12 text-center glass rounded-3xl space-y-2 border border-gold-500/20">
                <PackageOpen size={30} className="mx-auto text-gray-300" />
                <h4 className="text-lg font-semibold text-accent-950 font-display">No active bespoke orders</h4>
                <p className="text-xs text-gray-500">
                  Visit the atelier reception to begin your next custom garment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentOrders.map((order) => {
                  const balance = Math.max(0, order.totalAmount - order.depositPaid);
                  return (
                    <div
                      key={order.id}
                      onClick={() => onViewOrder(order.id)}
                      className="glass p-6 rounded-2xl hover:border-gold-500/40 hover:shadow-luxury transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 border border-gold-500/20 group"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <span className="text-[11px] font-mono font-bold text-accent-800 bg-accent-50/90 px-2 py-0.5 rounded-md border border-accent-200/50 block w-fit">
                            #{order.id}
                          </span>
                          <h3 className="text-lg font-bold text-accent-950 leading-tight mt-2 font-display group-hover:text-accent-800 transition-colors">
                            {order.garmentTitle}
                          </h3>
                        </div>
                        <FabricStatusBadge status={stageBadgeStatus(order.stage)} />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 font-sans">
                        <Clock size={13} className="text-gold-700" />
                        <span>{STAGE_LABELS[order.stage]} &bull; Est. Ready: {order.dueDate}</span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-100/80 text-xs font-mono">
                        <span className="text-gray-500 font-sans">
                          Paid GHS {order.depositPaid.toFixed(0)} / {order.totalAmount.toFixed(0)}
                        </span>
                        {balance > 0 ? (
                          <span className="text-rose-600 font-bold">Due GHS {balance.toFixed(0)}</span>
                        ) : (
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Settled in Full
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order History */}
          {pastOrders.length > 0 && (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-accent-950 uppercase tracking-widest block">
                Archived Wardrobe History ({pastOrders.length})
              </span>
              <div className="glass rounded-3xl divide-y divide-gray-200/70 border border-gold-500/20 overflow-hidden shadow-sm">
                {pastOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onViewOrder(order.id)}
                    className="p-4 sm:p-5 flex justify-between items-center gap-3 cursor-pointer hover:bg-gold-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles size={16} className="text-gold-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[11px] font-mono text-gray-400 block">#{order.id}</span>
                        <h4 className="text-sm font-semibold text-accent-950 truncate font-display">{order.garmentTitle}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono shrink-0">
                      <span>{order.dueDate}</span>
                      <ArrowUpRight size={14} className="text-accent-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientOrdersDashboard;
