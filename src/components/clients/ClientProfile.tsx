import React, { useEffect, useState } from 'react';
import { ArrowLeft, Phone, Loader2, PackageOpen, MessageCircle, Receipt, Clock } from 'lucide-react';
import type { BespokeJobOrder } from '../../types/workshop.types';
import { fetchAllOrders, subscribeToOrderChanges } from '../../lib/orders';
import { DigitalJobCard } from '../workshop/DigitalJobCard';
import { DirectSMSModal } from '../workshop/DirectSMSModal';
import { RecordPaymentModal } from '../workshop/RecordPaymentModal';
import { MeasurementVaultSync } from '../measurements/MeasurementVaultSync';

interface ClientProfileProps {
  clientId: string;
  clientName: string;
  clientPhone: string;
  onBack: () => void;
}

/**
 * A single client's profile for staff — orders, tasks, and measurements in
 * one place. Replaces the old standalone Workshop task board (now scoped
 * per-client here instead of one shared global board).
 */
export const ClientProfile: React.FC<ClientProfileProps> = ({ clientId, clientName, clientPhone, onBack }) => {
  const [orders, setOrders] = useState<BespokeJobOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<BespokeJobOrder | null>(null);
  const [isJobCardOpen, setIsJobCardOpen] = useState(false);
  const [smsOrder, setSmsOrder] = useState<BespokeJobOrder | null>(null);
  const [isDirectSMSOpen, setIsDirectSMSOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<BespokeJobOrder | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const all = await fetchAllOrders();
        if (isMounted) setOrders(all.filter((o) => o.clientId === clientId));
      } catch (err) {
        console.error('[ClientProfile] Failed to load orders:', err);
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
  }, [clientId]);

  const handleOrderUpdated = (updated: BespokeJobOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
    if (paymentOrder?.id === updated.id) setPaymentOrder(updated);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={15} />
        <span>Back to Clients</span>
      </button>

      <div className="glass p-6 flex items-center gap-4">
        <div className="w-14 h-14 bg-accent-50 text-accent-600 flex items-center justify-center text-xl font-semibold shrink-0">
          {clientName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 font-sans">{clientName}</h2>
          <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
            <Phone size={13} />
            <span>{clientPhone || 'No phone on file'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Measurements</h3>
        <MeasurementVaultSync targetClientId={clientId} />
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Orders ({orders.length})</h3>

        {isLoading ? (
          <div className="p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center glass space-y-2">
            <PackageOpen size={28} className="mx-auto text-gray-300" />
            <h4 className="text-lg font-semibold text-gray-900">No orders yet</h4>
            <p className="text-sm text-gray-500">Orders placed for this client will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => {
              const balance = Math.max(0, order.totalAmount - order.depositPaid);
              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsJobCardOpen(true);
                  }}
                  className="glass p-5 hover:bg-white/70 transition-all cursor-pointer flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-xs text-accent-600 font-medium block">#{order.id}</span>
                      <h4 className="text-base font-semibold text-gray-900 leading-tight mt-0.5">
                        {order.garmentTitle}
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                      {order.stage}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>
                      Due {order.dueDate} &bull; Artisan: {order.assignedTailor}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs">
                    <span className="text-gray-500">
                      Paid GHS {order.depositPaid.toFixed(0)} / {order.totalAmount.toFixed(0)}
                      {balance > 0 && <span className="text-rose-600 font-medium ml-1">(Due {balance.toFixed(0)})</span>}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmsOrder(order);
                          setIsDirectSMSOpen(true);
                        }}
                        title="Send WhatsApp Message"
                        className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-[#25D366] hover:text-white transition-colors"
                      >
                        <MessageCircle size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentOrder(order);
                          setIsPaymentModalOpen(true);
                        }}
                        title="Record Payment"
                        className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
                      >
                        <Receipt size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DigitalJobCard
        order={selectedOrder}
        isOpen={isJobCardOpen}
        onClose={() => setIsJobCardOpen(false)}
        onOrderUpdated={handleOrderUpdated}
      />
      <DirectSMSModal order={smsOrder} isOpen={isDirectSMSOpen} onClose={() => setIsDirectSMSOpen(false)} />
      <RecordPaymentModal
        order={paymentOrder}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentRecorded={handleOrderUpdated}
      />
    </div>
  );
};

export default ClientProfile;
