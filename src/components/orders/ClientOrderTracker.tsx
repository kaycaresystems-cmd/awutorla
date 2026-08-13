import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  ShieldCheck,
  Calendar,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Garment Passport"
      subtitle="Bespoke order tracker & authenticity record"
      icon={<Sparkles size={18} className="text-gold-600" />}
      maxWidth="max-w-4xl"
    >
      {/* Search Bar — pinned while the order details below scroll */}
      <div className="sticky top-0 z-10 p-5 bg-white/90 backdrop-blur-xl border-b border-gray-200/80">
        {isAnonymous && (
          <p className="mb-3 text-xs text-gray-500 leading-relaxed font-sans">
            Enter your bespoke order ID and registered phone number to verify your garment passport.
          </p>
        )}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder={isAnonymous ? 'Order ID (e.g. ORD-BESPOKE-884)' : 'Order ID, phone number, or client name...'}
              className="w-full bg-white/95 border border-gray-200/90 pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 shadow-sm transition-all"
            />
            <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
          </div>
          {isAnonymous && (
            <div className="relative flex-1">
              <input
                type="tel"
                value={trackPhone}
                onChange={(e) => setTrackPhone(e.target.value)}
                placeholder="Phone number (e.g. 024XXXXXXX)"
                className="w-full bg-white/95 border border-gray-200/90 pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 shadow-sm transition-all"
              />
              <Phone size={14} className="absolute left-3.5 top-3 text-gold-700" />
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-accent-900/15 disabled:opacity-60 shrink-0"
          >
            Track Order
          </button>
        </form>

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-12 flex flex-col justify-center items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={20} className="animate-spin text-accent-700" />
          <span>Locating garment passport...</span>
        </div>
      )}

      {/* Order Details Body */}
      {!isLoading && activeOrder && (
        <div className="p-6 sm:p-7 space-y-6 animate-in fade-in">

          {/* Top Overview Passport Card */}
          <div className="p-6 glass rounded-3xl border border-gold-500/30 shadow-luxury relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold text-accent-800 bg-accent-50/90 px-2.5 py-0.5 rounded-md border border-accent-200/60">
                  #{activeOrder.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-gold-50 text-[10px] font-semibold text-gold-800 border border-gold-500/30 uppercase tracking-wider">
                  Haute Couture
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-semibold text-accent-950 leading-tight">
                {activeOrder.garmentTitle}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-sans">{activeOrder.garmentSubtitle}</p>
            </div>

            <FabricStatusBadge status={getBadgeStatus(activeOrder.stage)} orderId={activeOrder.id} className="relative z-10" />
          </div>

          {/* Specifications Grid */}
          <div className="p-5 glass rounded-2xl border border-gold-500/20 text-xs sm:text-sm space-y-2.5 shadow-sm">
            <div className="flex justify-between border-b border-gray-100/80 pb-2">
              <span className="text-gray-400 uppercase tracking-wider text-[11px]">Client Dossier</span>
              <span className="font-semibold text-accent-950 font-display text-base">{activeOrder.clientName}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100/80 pb-2">
              <span className="text-gray-400 uppercase tracking-wider text-[11px]">Assigned Master Artisan</span>
              <span className="font-semibold text-gray-900">{activeOrder.assignedTailor}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100/80 pb-2">
              <span className="text-gray-400 uppercase tracking-wider text-[11px]">Textile Weave</span>
              <span className="text-gray-900 font-medium">{activeOrder.fabricType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 uppercase tracking-wider text-[11px]">Estimated Ready Date</span>
              <span className="font-semibold text-gold-800 font-mono flex items-center gap-1.5">
                <Calendar size={13} />
                <span>{activeOrder.dueDate}</span>
              </span>
            </div>
          </div>

          {/* Financial Status & Balance Settlement */}
          <div className="p-6 glass rounded-2xl border border-gold-500/20 text-xs sm:text-sm space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-gray-100/80 pb-3">
              <div>
                <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Bespoke Investment</span>
                <span className="text-xl sm:text-2xl font-bold text-accent-950 font-display">
                  GHS {activeOrder.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Deposit Paid</span>
                <span className="text-emerald-800 font-bold text-lg sm:text-xl font-mono">
                  GHS {activeOrder.depositPaid.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Balance Remaining</span>
                <span className="text-accent-900 font-bold text-lg sm:text-xl font-mono">
                  GHS {(activeOrder.totalAmount - activeOrder.depositPaid).toFixed(2)}
                </span>
              </div>

              {activeOrder.totalAmount - activeOrder.depositPaid > 0 ? (
                <span className="px-3.5 py-1.5 bg-gold-50/80 text-gold-900 border border-gold-500/30 rounded-xl text-xs font-medium text-center sm:text-right leading-relaxed shadow-sm">
                  Please visit the atelier reception or contact concierge to settle remaining balance.
                </span>
              ) : (
                <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Settled in Full</span>
                </span>
              )}
            </div>
          </div>

          {/* Production Milestone Journey */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-accent-950 uppercase tracking-widest block">Artisan Production Journey</span>
            <div className="p-5 glass rounded-2xl border border-gold-500/20 space-y-3.5 shadow-sm">
              {activeOrder.stageHistory.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 border-b border-gray-100/80 pb-3 last:border-0 last:pb-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <CheckCircle2 size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-accent-950 capitalize text-xs sm:text-sm">
                        {item.stage}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{item.notes}</p>
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
