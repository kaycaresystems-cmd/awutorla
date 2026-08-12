import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Wifi,
  WifiOff,
  User,
  Clock,
  ArrowUpRight,
  Filter,
  UserPlus,
  MessageCircle,
  Receipt,
} from 'lucide-react';
import type { BespokeJobOrder, WorkshopStage } from '../types/workshop.types';
import { DigitalJobCard } from '../components/workshop/DigitalJobCard';
import { QuickIntakeModal } from '../components/workshop/QuickIntakeModal';
import { DirectSMSModal } from '../components/workshop/DirectSMSModal';
import { RecordPaymentModal } from '../components/workshop/RecordPaymentModal';
import { getAllOfflineJobCards, saveOfflineJobCard, listenNetworkStatus, isOnline } from '../lib/offlineStore';
import { fetchAllOrders, subscribeToOrderChanges } from '../lib/orders';

export const SEED_WORKSHOP_ORDERS: BespokeJobOrder[] = [
  {
    id: 'ORD-BESPOKE-884',
    clientName: 'Dr. Esi Sutherland',
    clientPhone: '0244123456',
    stage: 'pending',
    garmentTitle: 'Ashanti Royal Silk Corset Gown',
    garmentSubtitle: 'State Banquet Evening Wear',
    fabricType: 'Handwoven Indigo & Gold Silk Kente',
    fabricColor: 'Royal Gold & Midnight Indigo',
    fabricNotes: 'Reinforced waist boning with gold thread embroidery along neckline.',
    referenceImages: [
      '/shop/kente_corset.png',
      '/shop/adinkra_gown.png',
      '/editorial.png',
    ],
    swatchImage: '/shop/kente_corset.png',
    measurements: {
      clientId: 'cli-884',
      clientName: 'Dr. Esi Sutherland',
      clientPhone: '0244123456',
      unit: 'in',
      bust: 34.5,
      waist: 26.8,
      hips: 38.2,
      shoulder: 15.5,
      sleeveLength: 24.0,
      neckToWaist: 16.0,
      updatedAt: '2026-08-08T10:30:00Z',
    },
    depositPaid: 1725,
    totalAmount: 3450,
    assignedTailor: 'Master Kwame Mensah',
    dueDate: 'AUG 18, 2026',
    createdAt: '2026-08-08T09:15:00Z',
    tasks: [
      {
        id: 'tsk-01',
        orderId: 'ORD-BESPOKE-884',
        tailorName: 'Master Kwame Mensah',
        title: 'Draft master pattern & cut silk lining',
        status: 'completed',
        assignedAt: '2026-08-08T10:00:00Z',
        completedAt: '2026-08-08T14:30:00Z',
      },
      {
        id: 'tsk-02',
        orderId: 'ORD-BESPOKE-884',
        tailorName: 'Artisan Kofi Badu',
        title: 'Stitch structural corset boning channels',
        status: 'in_progress',
        assignedAt: '2026-08-08T15:00:00Z',
      },
    ],
    stageHistory: [
      {
        stage: 'pending',
        completedAt: '2026-08-08T09:15:00Z',
        completedBy: 'Receptionist Abena',
        notes: 'Deposit received. Job card created.',
      },
    ],
  },
  {
    id: 'ORD-BESPOKE-889',
    clientName: 'Hon. Kofi Annan-Prah',
    clientPhone: '0549876543',
    stage: 'cutting',
    garmentTitle: '3-Piece Northern Fugu Tuxedo',
    garmentSubtitle: 'Diplomatic Gala Commission',
    fabricType: 'Heavyweight Striped Cotton Fugu',
    fabricColor: 'Monochrome Charcoal & Ivory',
    fabricNotes: 'Full canvas construction with silk satin lapel contrast.',
    referenceImages: [
      '/shop/fugu_blazer.png',
      '/editorial.png',
    ],
    swatchImage: '/shop/fugu_blazer.png',
    measurements: {
      clientId: 'cli-889',
      clientName: 'Hon. Kofi Annan-Prah',
      clientPhone: '0549876543',
      unit: 'in',
      bust: 42.0,
      waist: 34.0,
      hips: 43.5,
      shoulder: 18.5,
      sleeveLength: 26.0,
      neckToWaist: 18.0,
      updatedAt: '2026-08-07T14:00:00Z',
    },
    depositPaid: 2100,
    totalAmount: 4200,
    assignedTailor: 'Artisan Kofi Badu',
    dueDate: 'AUG 20, 2026',
    createdAt: '2026-08-07T11:00:00Z',
    tasks: [],
    stageHistory: [
      {
        stage: 'pending',
        completedAt: '2026-08-07T11:00:00Z',
        completedBy: 'Receptionist Abena',
        notes: '50% MoMo deposit confirmed.',
      },
      {
        stage: 'cutting',
        completedAt: '2026-08-08T08:30:00Z',
        completedBy: 'Artisan Kofi Badu',
        notes: 'Fabric inspected and pattern laid out.',
      },
    ],
  },
  {
    id: 'ORD-BESPOKE-891',
    clientName: 'Nana Akosua Frimpong',
    clientPhone: '0201122334',
    stage: 'fitting',
    garmentTitle: 'Adinkra Embroidered Couture Peplum Gown',
    garmentSubtitle: 'Executive Induction Ceremony',
    fabricType: 'Crimson Silk Mikado with Velvet Adinkra Emblems',
    fabricColor: 'Rich Crimson & Obsidian Velvet',
    fabricNotes: 'Gya Nyame gold bullion hand-embroidery on cuffs and neckline.',
    referenceImages: [
      '/shop/adinkra_gown.png',
      '/editorial.png',
    ],
    swatchImage: '/shop/adinkra_gown.png',
    measurements: {
      clientId: 'cli-891',
      clientName: 'Nana Akosua Frimpong',
      clientPhone: '0201122334',
      unit: 'in',
      bust: 37.0,
      waist: 29.5,
      hips: 41.0,
      shoulder: 16.0,
      sleeveLength: 23.5,
      neckToWaist: 16.5,
      updatedAt: '2026-08-05T16:00:00Z',
    },
    depositPaid: 2600,
    totalAmount: 5200,
    assignedTailor: 'Master Kwame Mensah',
    dueDate: 'AUG 15, 2026',
    createdAt: '2026-08-05T12:00:00Z',
    tasks: [],
    stageHistory: [
      {
        stage: 'pending',
        completedAt: '2026-08-05T12:00:00Z',
        completedBy: 'System',
        notes: 'Order initiated.',
      },
      {
        stage: 'cutting',
        completedAt: '2026-08-06T10:00:00Z',
        completedBy: 'Master Kwame Mensah',
        notes: 'Silk cut.',
      },
      {
        stage: 'fitting',
        completedAt: '2026-08-08T15:00:00Z',
        completedBy: 'Master Kwame Mensah',
        notes: 'Preliminary toile assembled for first lounge fitting.',
      },
    ],
  },
  {
    id: 'ORD-BESPOKE-895',
    clientName: 'Kweku Boateng Esq.',
    clientPhone: '0275566778',
    stage: 'finishing',
    garmentTitle: 'Modern Double-Breasted Kente Blazer',
    garmentSubtitle: 'Architectural Heritage Suit',
    fabricType: 'Geometric Gold Silk/Cotton Blend',
    fabricColor: 'Sahara Ochre & Earth Brown',
    fabricNotes: 'Hand-sewn pick stitching and horn buttons.',
    referenceImages: [
      '/shop/fugu_blazer.png',
      '/editorial.png',
    ],
    swatchImage: '/shop/fugu_blazer.png',
    measurements: {
      clientId: 'cli-895',
      clientName: 'Kweku Boateng Esq.',
      clientPhone: '0275566778',
      unit: 'in',
      bust: 40.0,
      waist: 32.5,
      hips: 40.0,
      shoulder: 17.5,
      sleeveLength: 25.5,
      neckToWaist: 17.0,
      updatedAt: '2026-08-04T10:00:00Z',
    },
    depositPaid: 1900,
    totalAmount: 3800,
    assignedTailor: 'Artisan Ama Frimpong',
    dueDate: 'AUG 12, 2026',
    createdAt: '2026-08-04T09:00:00Z',
    tasks: [],
    stageHistory: [],
  },
  {
    id: 'ORD-BESPOKE-872',
    clientName: 'Lady Beatrice Osei',
    clientPhone: '0551239876',
    stage: 'ready',
    garmentTitle: 'Hand-Pleated Kente Mermaid Gown',
    garmentSubtitle: 'Diplomatic Gala',
    fabricType: 'Vintage 1970s Restored Silk Kente',
    fabricColor: 'Emerald Green & Gold Thread',
    fabricNotes: 'Dry clean only. Packed in velvet garment bag.',
    referenceImages: [
      '/shop/kente_corset.png',
      '/editorial.png',
    ],
    swatchImage: '/shop/kente_corset.png',
    measurements: {
      clientId: 'cli-872',
      clientName: 'Lady Beatrice Osei',
      clientPhone: '0551239876',
      unit: 'in',
      bust: 35.0,
      waist: 27.0,
      hips: 39.0,
      shoulder: 15.0,
      sleeveLength: 23.0,
      neckToWaist: 15.5,
      updatedAt: '2026-08-01T11:00:00Z',
    },
    depositPaid: 4500,
    totalAmount: 4500,
    assignedTailor: 'Master Kwame Mensah',
    dueDate: 'AUG 10, 2026',
    createdAt: '2026-08-01T10:00:00Z',
    tasks: [],
    stageHistory: [],
  },
];

export const Workshop: React.FC = () => {
  const [orders, setOrders] = useState<BespokeJobOrder[]>([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<BespokeJobOrder | null>(null);
  const [isJobCardOpen, setIsJobCardOpen] = useState<boolean>(false);
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
  const [isDirectSMSOpen, setIsDirectSMSOpen] = useState<boolean>(false);
  const [smsOrder, setSmsOrder] = useState<BespokeJobOrder | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentOrder, setPaymentOrder] = useState<BespokeJobOrder | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(isOnline());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load the shared workshop board from Supabase (the live source of truth across every
  // device), falling back to the local offline cache — or first-run seed data — when the
  // network is unavailable. A realtime subscription keeps every connected tailor/admin's
  // board in sync as orders and tasks change on any device.
  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      if (!isOnline()) {
        const offlineList = getAllOfflineJobCards();
        if (isMounted) {
          setOrders(offlineList.length > 0 ? offlineList : SEED_WORKSHOP_ORDERS);
          setIsLoading(false);
        }
        return;
      }

      try {
        const liveOrders = await fetchAllOrders();
        if (!isMounted) return;
        liveOrders.forEach((o) => saveOfflineJobCard(o));
        setOrders(liveOrders);
        setSyncError(null);
      } catch (err) {
        console.error('[Workshop] Failed to load orders from Supabase:', err);
        if (!isMounted) return;
        setSyncError('Showing locally cached data — could not reach the atelier server.');
        const offlineList = getAllOfflineJobCards();
        setOrders(offlineList.length > 0 ? offlineList : SEED_WORKSHOP_ORDERS);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadOrders();

    const unsubscribeRealtime = subscribeToOrderChanges(() => {
      loadOrders();
    });

    const cleanupNetworkListener = listenNetworkStatus((online) => {
      setOnlineStatus(online);
      if (online) loadOrders();
    });

    return () => {
      isMounted = false;
      unsubscribeRealtime();
      cleanupNetworkListener();
    };
  }, []);

  const handleOpenJobCard = (order: BespokeJobOrder) => {
    setSelectedOrder(order);
    setIsJobCardOpen(true);
  };

  const handleOpenDirectMessage = (e: React.MouseEvent, order: BespokeJobOrder) => {
    e.stopPropagation();
    setSmsOrder(order);
    setIsDirectSMSOpen(true);
  };

  const handleOpenRecordPayment = (e: React.MouseEvent, order: BespokeJobOrder) => {
    e.stopPropagation();
    setPaymentOrder(order);
    setIsPaymentModalOpen(true);
  };

  const handleOrderUpdated = (updatedOrder: BespokeJobOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    if (paymentOrder && paymentOrder.id === updatedOrder.id) {
      setPaymentOrder(updatedOrder);
    }
  };

  const handleOrderCreated = (newOrder: BespokeJobOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStage =
        selectedStageFilter === 'all' || o.stage === selectedStageFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.garmentTitle.toLowerCase().includes(q) ||
        o.assignedTailor.toLowerCase().includes(q) ||
        o.fabricType.toLowerCase().includes(q);

      return matchesStage && matchesSearch;
    });
  }, [orders, selectedStageFilter, searchQuery]);

  const stages: { id: WorkshopStage; label: string; count: number }[] = [
    { id: 'pending', label: 'Received', count: orders.filter((o) => o.stage === 'pending').length },
    { id: 'cutting', label: 'Cutting', count: orders.filter((o) => o.stage === 'cutting').length },
    { id: 'fitting', label: 'Fitting', count: orders.filter((o) => o.stage === 'fitting').length },
    { id: 'finishing', label: 'Finishing', count: orders.filter((o) => o.stage === 'finishing').length },
    { id: 'ready', label: 'Ready', count: orders.filter((o) => o.stage === 'ready' || o.stage === 'delivered').length },
  ];

  return (
    <div className="space-y-8 pb-24">

      {/* Top Workshop Header Banner */}
      <div className="rounded-xl bg-white p-6 sm:p-8 border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-medium text-accent-600 block mb-1">
              Shop-Floor Production Console — Accra
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              Artisan Tailor Workshop
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Engineered for atelier workstations & tablet touch floor workflows. 1-click WhatsApp client updates and live sync.
            </p>
          </div>

          {/* Quick Intake CTA & Offline Status Badge */}
          <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
            <button
              onClick={() => setIsIntakeOpen(true)}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-accent-600 font-medium text-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              <span>New Client Intake</span>
            </button>

            <div
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border font-medium ${
                onlineStatus
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {onlineStatus ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{onlineStatus ? 'Floor Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="mt-3 text-xs text-gray-500">Loading workshop board…</div>
        )}
        {syncError && (
          <div className="mt-3 px-3.5 py-2 rounded-lg bg-accent-50 border border-accent-100 text-gray-900 text-xs">
            {syncError}
          </div>
        )}
      </div>

      {/* Quick Production Stats Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stages.map((st) => (
          <div
            key={st.id}
            onClick={() => setSelectedStageFilter(st.id)}
            className={`p-4 rounded-xl border transition-colors cursor-pointer select-none ${
              selectedStageFilter === st.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-900 border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-xs font-medium ${selectedStageFilter === st.id ? 'text-gray-300' : 'text-gray-500'}`}>
                {st.label}
              </span>
            </div>
            <div className="text-2xl font-semibold">
              {st.count} <span className={`text-xs font-normal ${selectedStageFilter === st.id ? 'text-gray-400' : 'text-gray-400'}`}>jobs</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Stage Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        {/* Stage Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedStageFilter('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedStageFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            All Stages ({orders.length})
          </button>
          {stages.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStageFilter(st.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedStageFilter === st.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              {st.label} ({st.count})
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, client, tailor, fabric..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Kanban / Cards Column View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.map((order) => {
          const balance = Math.max(0, order.totalAmount - order.depositPaid);
          return (
            <div
              key={order.id}
              onClick={() => handleOpenJobCard(order)}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header Meta */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-accent-600 font-medium block">
                      #{order.id}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 leading-tight mt-0.5">
                      {order.garmentTitle}
                    </h3>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                    {order.stage}
                  </span>
                </div>

                {/* Client & Assigned Tailor */}
                <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-gray-900">
                    <User size={13} className="text-gray-400 shrink-0" />
                    <span className="font-medium truncate">{order.clientName}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pt-1 border-t border-gray-100">
                    <span>Artisan: {order.assignedTailor}</span>
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{order.dueDate}</span>
                    </div>
                  </div>
                </div>

                {/* Measurements Snippet */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg text-center">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Bust</span>
                    <span className="font-medium text-gray-900">{order.measurements.bust} in</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Waist</span>
                    <span className="font-medium text-gray-900">{order.measurements.waist} in</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Hips</span>
                    <span className="font-medium text-gray-900">{order.measurements.hips} in</span>
                  </div>
                </div>

                {/* Fabric Note Snippet */}
                <p className="text-xs text-gray-500 line-clamp-2 italic">
                  "{order.fabricNotes}"
                </p>
              </div>

              {/* Action Button Bar */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-500 truncate">
                  Paid: GHS {order.depositPaid} / {order.totalAmount}
                  {balance > 0 && <span className="text-rose-600 font-medium ml-1">(Due: {balance})</span>}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleOpenDirectMessage(e, order)}
                    title="Send WhatsApp Message"
                    className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-[#25D366] hover:text-white transition-colors flex items-center gap-1 text-xs"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={(e) => handleOpenRecordPayment(e, order)}
                    title="Record Manual Payment"
                    className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 flex items-center gap-1 text-xs"
                  >
                    <Receipt size={13} />
                    <span>Pay</span>
                  </button>

                  <button className="flex items-center gap-1 text-xs text-gray-900 font-medium pl-1">
                    <span>Open</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200 space-y-3">
          <Filter size={28} className="mx-auto text-gray-300" />
          <h4 className="text-lg font-semibold text-gray-900">No active orders matching this filter</h4>
          <p className="text-sm text-gray-500">Try clearing your search query or selecting "All Stages".</p>
        </div>
      )}

      {/* Digital Job Card Full Modal */}
      <DigitalJobCard
        order={selectedOrder}
        isOpen={isJobCardOpen}
        onClose={() => setIsJobCardOpen(false)}
        onOrderUpdated={handleOrderUpdated}
      />

      {/* Rapid Client & Order Intake Modal */}
      <QuickIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onOrderCreated={handleOrderCreated}
      />

      {/* Direct 1-Click WhatsApp Messenger Modal */}
      <DirectSMSModal
        order={smsOrder}
        isOpen={isDirectSMSOpen}
        onClose={() => setIsDirectSMSOpen(false)}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        order={paymentOrder}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentRecorded={handleOrderUpdated}
      />

    </div>
  );
};

export default Workshop;
