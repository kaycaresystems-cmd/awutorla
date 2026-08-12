import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
} from 'lucide-react';
import type { BespokeJobOrder } from '../../types/workshop.types';
import { FabricStatusBadge } from '../ui/FabricStatusBadge';
import type { FabricStatus } from '../ui/FabricStatusBadge';
import { SEED_WORKSHOP_ORDERS } from '../../lib/seedOrders';
import { getAllOfflineJobCards, saveOfflineJobCard, isOnline } from '../../lib/offlineStore';
import { fetchAllOrders, trackOrderAnonymously } from '../../lib/orders';
import { useAuth } from '../../lib/auth';
import { Modal } from '../ui/Modal';

interface ClientOrderTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
}

export const ClientOrderTracker: React.FC<ClientOrderTrackerProps> = ({
  isOpen,
  onClose,
  initialOrderId,
}) => {
  const { session } = useAuth();
  const isAnonymous = !session;

  const [searchId, setSearchId] = useState<string>(initialOrderId || 'ORD-BESPOKE-884');
  const [trackPhone, setTrackPhone] = useState<string>('');
  const [allOrders, setAllOrders] = useState<BespokeJobOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<BespokeJobOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authenticated mode: load the live order list this account can see (RLS-scoped —
  // own orders for a client, all orders for staff), falling back to the offline cache
  // when the network is unavailable. Runs each time the tracker opens or a new
  // deep-linked order ID arrives, since the parent keeps this component mounted.
  //
  // Anonymous mode (no session, reached via a public `?track=` link): there is no
  // list to preload — looking up an order requires the order ID *and* phone number
  // together (see handleSearch), so we just prefill the ID and wait for input.
  React.useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);

    if (isAnonymous) {
      if (initialOrderId) setSearchId(initialOrderId);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    async function load() {
      let list: BespokeJobOrder[];
      if (isOnline()) {
        try {
          list = await fetchAllOrders();
          list.forEach((o) => saveOfflineJobCard(o));
        } catch (err) {
          console.error('[ClientOrderTracker] Failed to load orders from Supabase:', err);
          const offline = getAllOfflineJobCards();
          list = offline.length > 0 ? offline : SEED_WORKSHOP_ORDERS;
        }
      } else {
        const offline = getAllOfflineJobCards();
        list = offline.length > 0 ? offline : SEED_WORKSHOP_ORDERS;
      }

      if (!isMounted) return;
      setAllOrders(list);

      const target = initialOrderId || searchId;
      const found = list.find((o) => o.id.toLowerCase() === target.toLowerCase());
      setActiveOrder(found || list[0] || null);
      if (initialOrderId) setSearchId(initialOrderId);
      setIsLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderId, isOpen, isAnonymous]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isAnonymous) {
      if (!searchId.trim() || !trackPhone.trim()) {
        setErrorMessage('Enter both your order ID and phone number.');
        return;
      }
      setIsLoading(true);
      try {
        const found = await trackOrderAnonymously(searchId.trim(), trackPhone.trim());
        setActiveOrder(found);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        setActiveOrder(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const query = searchId.trim().toLowerCase();
    const found = allOrders.find(
      (o) =>
        o.id.toLowerCase() === query ||
        o.clientPhone.toLowerCase() === query ||
        o.clientName.toLowerCase().includes(query)
    );

    if (found) {
      setActiveOrder(found);
    } else {
      setErrorMessage(`No order found matching "${searchId}". Try "ORD-BESPOKE-884".`);
    }
  };

  const getBadgeStatus = (stage: string): FabricStatus => {
    if (stage === 'fitting') return 'FITTING';
    if (stage === 'ready' || stage === 'delivered') return 'READY';
    return 'CUTTING';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Order Tracker" subtitle="Client order tracking" icon={<Sparkles size={17} />} maxWidth="max-w-4xl">
      {/* Search Bar — pinned while the order details below scroll */}
      <div className="sticky top-0 z-10 p-5 bg-white border-b border-gray-200">
        {isAnonymous && (
          <p className="mb-3 text-xs text-gray-500 leading-relaxed">
            Enter your order ID and the phone number on file to view your order —
            both are required to keep your order private.
          </p>
        )}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder={isAnonymous ? 'Order ID (e.g. ORD-BESPOKE-884)' : 'Order ID, phone number, or name...'}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors"
            />
            <Search size={15} className="absolute left-3 top-3 text-gray-400" />
          </div>
          {isAnonymous && (
            <div className="relative flex-1">
              <input
                type="tel"
                value={trackPhone}
                onChange={(e) => setTrackPhone(e.target.value)}
                placeholder="Phone number (e.g. 024XXXXXXX)"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors"
              />
              <Phone size={14} className="absolute left-3 top-3 text-gray-400" />
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-gray-900 text-white hover:bg-accent-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
          >
            Track Order
          </button>
        </form>

        {errorMessage && (
          <div className="mt-2 text-rose-600 text-xs flex items-center gap-1.5">
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading order...</span>
        </div>
      )}

      {/* Order Details Body */}
      {!isLoading && activeOrder && (
        <div className="p-6 space-y-6">

          {/* Top Overview */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-accent-600">
                  #{activeOrder.id}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-700">
                  Bespoke
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 leading-tight">
                {activeOrder.garmentTitle}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{activeOrder.garmentSubtitle}</p>
            </div>

            <FabricStatusBadge status={getBadgeStatus(activeOrder.stage)} orderId={activeOrder.id} />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-2">
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-gray-500 text-xs">Client</span>
              <span className="font-medium text-gray-900">{activeOrder.clientName}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-gray-500 text-xs">Assigned Tailor</span>
              <span className="font-medium text-gray-900">{activeOrder.assignedTailor}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-gray-500 text-xs">Fabric</span>
              <span className="text-gray-900">{activeOrder.fabricType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs">Estimated Completion</span>
              <span className="font-medium text-gray-900">{activeOrder.dueDate}</span>
            </div>
          </div>

          {/* Financial Status & Balance Settlement */}
          <div className="p-5 bg-white rounded-xl border border-gray-200 text-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-gray-500 text-xs block">Total Bespoke Investment</span>
                <span className="text-xl font-semibold text-gray-900">
                  GHS {activeOrder.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-xs block">Deposit Received</span>
                <span className="text-emerald-600 font-semibold text-lg">
                  GHS {activeOrder.depositPaid.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-gray-500 text-xs block">Balance Remaining</span>
                <span className="text-rose-600 font-semibold text-lg">
                  GHS {(activeOrder.totalAmount - activeOrder.depositPaid).toFixed(2)}
                </span>
              </div>

              {activeOrder.totalAmount - activeOrder.depositPaid > 0 ? (
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs text-center sm:text-right leading-relaxed">
                  Please visit or call the atelier to settle your remaining balance.
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                  Paid in Full
                </span>
              )}
            </div>
          </div>

          {/* Production Milestone Journey */}
          <div className="space-y-3">
            <span className="text-xs font-medium text-gray-500 block">Production Journey</span>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              {activeOrder.stageHistory.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                  <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 capitalize text-sm">
                        {item.stage}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{item.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </Modal>
  );
};

export default ClientOrderTracker;
