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
} from 'lucide-react';
import type { BespokeJobOrder, WorkshopStage } from '../../types/workshop.types';
import { FabricStatusBadge } from '../ui/FabricStatusBadge';
import type { FabricStatus } from '../ui/FabricStatusBadge';
import { fetchAllOrders, subscribeToOrderChanges } from '../../lib/orders';
import { getAllOfflineJobCards, saveOfflineJobCard, isOnline } from '../../lib/offlineStore';
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

  // Loads this client's own orders (RLS already scopes fetchAllOrders() to "own orders"
  // for a client account, same query the Workshop board uses for staff). The offline
  // cache is shared across whoever has used this browser, so it's filtered to this
  // client's own orders here rather than trusted as-is — unlike the Workshop board,
  // there is no seed-data fallback: showing a stranger's demo order on a client's own
  // dashboard because of a network hiccup would be worse than showing nothing.
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

  // Every order for this client carries the same client_measurements row (fetchAllOrders
  // joins on client_id), so the most recent order's snapshot is this client's current
  // measurements — no separate fetch needed.
  const measurements = orders.find((o) => o.measurements?.updatedAt)?.measurements;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <span className="text-xs font-medium text-accent-600">Client Dashboard</span>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">My Orders</h2>
        <p className="text-sm text-gray-500">
          Track every bespoke commission from deposit to delivery, and review past orders from the Maison.
        </p>
      </div>

      {isLoading && (
        <div className="p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading your orders...</span>
        </div>
      )}

      {syncError && (
        <div className="px-4 py-3 rounded-lg bg-accent-50 border border-accent-100 text-gray-900 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Measurements Summary */}
          <div
            onClick={onGoToMeasurements}
            className="p-6 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Ruler size={16} className="text-accent-600" />
                <span className="text-xs font-medium text-gray-500">Sizing Passport</span>
              </div>
              <span className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                <span>{measurements ? 'Update' : 'Add Measurements'}</span>
                <ArrowUpRight size={14} />
              </span>
            </div>

            {measurements ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Bust</div>
                  <div className="text-gray-900 font-semibold">{measurements.bust} {measurements.unit}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Waist</div>
                  <div className="text-gray-900 font-semibold">{measurements.waist} {measurements.unit}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Hips</div>
                  <div className="text-gray-900 font-semibold">{measurements.hips} {measurements.unit}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Shoulder</div>
                  <div className="text-gray-900 font-semibold">{measurements.shoulder} {measurements.unit}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Sleeve</div>
                  <div className="text-gray-900 font-semibold">{measurements.sleeveLength} {measurements.unit}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Neck-Waist</div>
                  <div className="text-gray-900 font-semibold">{measurements.neckToWaist} {measurements.unit}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No measurements on file yet. Visit the Sizing Vault to add your body profile.
              </p>
            )}
          </div>

          {/* Current Orders */}
          <div className="space-y-4">
            <span className="text-xs font-medium text-gray-500 block">
              Current Orders ({currentOrders.length})
            </span>

            {currentOrders.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-xl border border-gray-200 space-y-2">
                <PackageOpen size={28} className="mx-auto text-gray-300" />
                <h4 className="text-lg font-semibold text-gray-900">No active orders</h4>
                <p className="text-sm text-gray-500">
                  Visit the atelier to begin a new bespoke commission.
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
                      className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <span className="text-xs text-accent-600 font-medium block">
                            #{order.id}
                          </span>
                          <h3 className="text-base font-semibold text-gray-900 leading-tight mt-0.5">
                            {order.garmentTitle}
                          </h3>
                        </div>
                        <FabricStatusBadge status={stageBadgeStatus(order.stage)} />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>{STAGE_LABELS[order.stage]} &bull; Est. {order.dueDate}</span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs">
                        <span className="text-gray-500">
                          Paid GHS {order.depositPaid.toFixed(0)} / {order.totalAmount.toFixed(0)}
                        </span>
                        {balance > 0 ? (
                          <span className="text-rose-600 font-medium">Due GHS {balance.toFixed(0)}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} /> Paid in Full
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
              <span className="text-xs font-medium text-gray-500 block">
                Order History ({pastOrders.length})
              </span>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {pastOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onViewOrder(order.id)}
                    className="p-4 sm:p-5 flex justify-between items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles size={14} className="text-accent-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs text-gray-500 block">#{order.id}</span>
                        <h4 className="text-sm font-medium text-gray-900 truncate">{order.garmentTitle}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                      <span>{order.dueDate}</span>
                      <ArrowUpRight size={13} />
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
