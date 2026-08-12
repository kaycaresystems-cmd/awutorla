import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Ruler,
  Tag,
  Layers,
  Sparkles,
  Scissors,
  TrendingUp,
  Cpu,
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
} from 'lucide-react';
import { AtelierCard } from './components/ui/AtelierCard';
import { RulerSlider } from './components/ui/RulerSlider';
import { FabricStatusBadge } from './components/ui/FabricStatusBadge';
import type { FabricStatus } from './components/ui/FabricStatusBadge';
import { FloatingDock } from './components/ui/FloatingDock';
import type { DockItem } from './components/ui/FloatingDock';
import { Workshop } from './pages/Workshop';
import { MeasurementVaultSync } from './components/measurements/MeasurementVaultSync';
import { ClientOrderTracker } from './components/orders/ClientOrderTracker';
import { ClientOrdersDashboard } from './components/orders/ClientOrdersDashboard';
import { QuickIntakeModal } from './components/workshop/QuickIntakeModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { SetNewPasswordScreen } from './components/auth/SetNewPasswordScreen';
import { TeamRolesManager } from './components/admin/TeamRolesManager';
import { useAuth } from './lib/auth';
import type { ClientBodyMeasurements } from './types/workshop.types';

interface EditorialLook {
  id: string;
  lookNumber: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  fabric: string;
  origin: string;
  specs: { bust: number; waist: number; hips: number };
}

const EDITORIAL_LOOKS: EditorialLook[] = [
  {
    id: 'look-14',
    lookNumber: 'Look 14 — Couture',
    title: 'Structured Silk Organza Gown',
    subtitle: 'Autumn/Winter Drape Study',
    description: 'This creation balances the structural integrity of double-faced silk organza with hand-pinned folds along the bodice. Designed as a study in volume and fluid sculpture, Look 14 defines our seasonal direction.',
    image: '/editorial.png',
    fabric: 'Double-Faced Mulberry Silk Organza',
    origin: 'Osu Atelier — Studio Master Pattern',
    specs: { bust: 34.5, waist: 26.8, hips: 38.2 },
  },
  {
    id: 'look-01',
    lookNumber: 'Look 01 — Bespoke',
    title: 'Royal Kente Corset Ballgown',
    subtitle: 'Bonwire Gold Silk Weave',
    description: 'A masterpiece blending ancient Bonwire Kente weaving with modern structural corset architecture. Featuring hand-loomed gold and indigo threads with reinforced boning.',
    image: '/shop/kente_corset.png',
    fabric: 'Bonwire Hand-Loomed Silk & Gold Thread',
    origin: 'Bonwire Weaving Guild — Ashanti Region',
    specs: { bust: 35.0, waist: 26.0, hips: 39.0 },
  },
  {
    id: 'look-02',
    lookNumber: 'Look 02 — Executive',
    title: 'Northern Fugu Blazer Dress',
    subtitle: 'Tamale Strip-Cloth Architecture',
    description: 'Engineered for the contemporary diplomat. Made from heavy Northern Ghanaian hand-spun Fugu strip-cloth in terracotta and charcoal with sharp lapel architecture.',
    image: '/shop/fugu_blazer.png',
    fabric: '100% Organic Hand-Dyed Northern Fugu Cotton',
    origin: 'Tamale Craft Cooperative — Northern Region',
    specs: { bust: 36.0, waist: 28.0, hips: 40.0 },
  },
  {
    id: 'look-03',
    lookNumber: 'Look 03 — Noir',
    title: 'Adinkra Midnight Chiffon Gown',
    subtitle: 'Ntonso Calabash Block Stamp',
    description: 'An ethereal column gown featuring subtle metallic Adinkra symbols (Gye Nyame & Dwennimmen) hand-stitched along the cowl spine and sculpted draped neckline.',
    image: '/shop/adinkra_gown.png',
    fabric: 'Mulberry Silk Chiffon & Gold Thread',
    origin: 'Ntonso Craft Village — Adinkra Stamped',
    specs: { bust: 34.0, waist: 25.5, hips: 37.5 },
  },
];

function App() {
  const { session, profile, loading: authLoading, isPasswordRecovery, signOut } = useAuth();

  // Navigation active tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isOrderTrackerOpen, setIsOrderTrackerOpen] = useState<boolean>(false);
  const [deepLinkOrderId, setDeepLinkOrderId] = useState<string | undefined>(undefined);
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
  const [isTeamRolesOpen, setIsTeamRolesOpen] = useState<boolean>(false);

  // Lookbook carousel state
  const [activeLookIndex, setActiveLookIndex] = useState<number>(0);
  const activeLook = EDITORIAL_LOOKS[activeLookIndex];

  // Deep-link detection for SMS tracking links (?track=ORD-XXX or ?order=ORD-XXX)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get('track') || params.get('order') || params.get('id');
      if (trackId) {
        setDeepLinkOrderId(trackId);
        setIsOrderTrackerOpen(true);
      }
    } catch {
      // Ignore in non-browser environments
    }
  }, []);

  // Interactive measurements state
  const [bustSize, setBustSize] = useState<number>(34.5);
  const [waistSize, setWaistSize] = useState<number>(26.8);
  const [hipsSize, setHipsSize] = useState<number>(38.2);
  const [selectedSpec, setSelectedSpec] = useState<'bust' | 'waist' | 'hips'>('bust');

  // Full 6-point client measurement passport state
  const [clientProfile, setClientProfile] = useState<ClientBodyMeasurements>({
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
    notes: 'Bespoke fit preferred with 1.5 in seam allowance.',
    updatedAt: new Date().toISOString(),
  });

  // Interactive order status state
  const [orderStatus, setOrderStatus] = useState<FabricStatus>('FITTING');
  const [fabricType, setFabricType] = useState<string>('Pure Silk Brocade');

  // Dynamic Floating Dock Items filtered by active perspective
  const dockItems: DockItem[] = [
    {
      id: 'dashboard',
      label: 'Showroom',
      icon: <LayoutDashboard size={19} />,
      onClick: () => setActiveTab('dashboard'),
    },
    // Gated on the real account role (not the perspective-preview toggle) — this
    // controls navigation to a page that performs privileged writes, so it must
    // reflect who the signed-in user actually is.
    ...(profile?.role === 'tailor' || profile?.role === 'admin'
      ? [
          {
            id: 'workshop',
            label: 'Workshop',
            icon: <Layers size={19} />,
            onClick: () => setActiveTab('workshop'),
          },
        ]
      : []),
    {
      id: 'measurements',
      label: 'Sizing Vault',
      icon: <Ruler size={19} />,
      onClick: () => setActiveTab('measurements'),
    },
    {
      id: 'orders',
      label: profile?.role === 'client' ? 'My Orders' : 'Hangtags',
      icon: <Tag size={19} />,
      onClick: () => setActiveTab('orders'),
    },
  ];

  // Helper to render current ruler based on sub-selection
  const renderActiveRuler = () => {
    switch (selectedSpec) {
      case 'bust':
        return (
          <RulerSlider
            label="Bust Circumference"
            value={bustSize}
            onChange={setBustSize}
            min={24}
            max={48}
            step={0.1}
          />
        );
      case 'waist':
        return (
          <RulerSlider
            label="Waist Circumference"
            value={waistSize}
            onChange={setWaistSize}
            min={20}
            max={44}
            step={0.1}
          />
        );
      case 'hips':
        return (
          <RulerSlider
            label="Hips Circumference"
            value={hipsSize}
            onChange={setHipsSize}
            min={28}
            max={52}
            step={0.1}
          />
        );
    }
  };

  const nextLook = () => {
    setActiveLookIndex((prev) => (prev + 1) % EDITORIAL_LOOKS.length);
  };

  const prevLook = () => {
    setActiveLookIndex((prev) => (prev - 1 + EDITORIAL_LOOKS.length) % EDITORIAL_LOOKS.length);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center text-sm font-semibold animate-pulse">
          LA
        </div>
      </div>
    );
  }

  // Opening a password-reset email link creates a real (narrowly-scoped) session, so
  // this must be checked before the normal session gate below, or the user would land
  // straight in the app instead of being asked to set a new password.
  if (isPasswordRecovery) {
    return <SetNewPasswordScreen />;
  }

  // A client following a `?track=` SMS/WhatsApp link should be able to check their
  // order without signing in — that's the whole point of sending them a link. This
  // renders the tracker standalone (it looks up just that one order via a secure
  // Edge Function, not the full authenticated order list) instead of the login wall.
  if (!session && deepLinkOrderId) {
    return (
      <ClientOrderTracker
        isOpen={true}
        onClose={() => setDeepLinkOrderId(undefined)}
        initialOrderId={deepLinkOrderId}
      />
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-32 relative">

      {/* Brand Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">

          {/* Brand Insignia */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
              LA
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-none">Maison L'Atelier</h1>
              <p className="text-xs text-gray-500 mt-1">Bespoke Ghanaian tailoring & workshop system</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 justify-center">

            {/* Quick Intake Button (Tailor/Admin) — gated on the real account role */}
            {(profile?.role === 'tailor' || profile?.role === 'admin') && (
              <button
                onClick={() => setIsIntakeOpen(true)}
                className="px-3.5 py-2 rounded-lg text-sm text-white bg-gray-900 hover:bg-accent-600 font-medium transition-colors flex items-center gap-1.5"
              >
                <UserPlus size={14} />
                <span>New Intake</span>
              </button>
            )}

            {/* Track Garment Passport Action */}
            <button
              onClick={() => setIsOrderTrackerOpen(true)}
              className="px-3.5 py-2 rounded-lg text-sm text-gray-700 bg-white border border-gray-200 hover:border-gray-300 flex items-center gap-1.5 transition-colors"
            >
              <Search size={14} />
              <span>Track Order</span>
            </button>

            {/* Signed-in Identity & Sign Out */}
            <div className="flex items-center gap-2 pl-1 text-sm">
              <span className="hidden sm:inline text-gray-500 max-w-[140px] truncate">
                {profile?.full_name || session.user.email}
              </span>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setIsTeamRolesOpen(true)}
                  className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600"
                  aria-label="Manage team roles"
                  title="Manage team roles"
                >
                  <Users size={16} />
                </button>
              )}
              <button
                onClick={() => signOut()}
                className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* TAB 1: SHOWROOM DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-12">

            {/* Editorial Hero & Workshop Pulse Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

              {/* Primary Lookbook Carousel (8 cols) */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col justify-between">

                {/* Hero Editorial Image Showcase */}
                <div className="relative w-full h-80 sm:h-96 overflow-hidden bg-gray-100">
                  <img
                    src={activeLook.image}
                    alt={activeLook.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Floating Tag & Carousel Controls */}
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/95 text-gray-900 text-xs font-medium shadow-sm">
                      {activeLook.lookNumber}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs font-medium">
                      {activeLook.origin}
                    </span>
                  </div>

                  {/* Carousel arrows */}
                  <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                    <button
                      onClick={prevLook}
                      className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-gray-900 flex items-center justify-center shadow-sm transition-colors"
                      aria-label="Previous look"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-3 py-1 rounded-full bg-gray-900/80 text-white text-xs">
                      {activeLookIndex + 1} / {EDITORIAL_LOOKS.length}
                    </span>
                    <button
                      onClick={nextLook}
                      className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-gray-900 flex items-center justify-center shadow-sm transition-colors"
                      aria-label="Next look"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Hero Description & Measurement Blueprint */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">
                      {activeLook.title}
                    </h2>
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">
                      {activeLook.subtitle} &bull; {activeLook.fabric}
                    </p>
                  </div>

                  <p className="text-sm leading-relaxed text-gray-600">
                    {activeLook.description}
                  </p>

                  {/* Dynamic Measurement Readout Chips */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100 bg-gray-50 p-4 rounded-lg">
                    <div className="text-center sm:text-left">
                      <div className="text-gray-500 text-xs font-medium">Bust</div>
                      <div className="text-lg text-gray-900">{activeLook.specs.bust} <span className="text-xs text-gray-400">in</span></div>
                    </div>
                    <div className="text-center sm:text-left">
                      <div className="text-gray-500 text-xs font-medium">Waist</div>
                      <div className="text-lg text-gray-900">{activeLook.specs.waist} <span className="text-xs text-gray-400">in</span></div>
                    </div>
                    <div className="text-center sm:text-left">
                      <div className="text-gray-500 text-xs font-medium">Hips</div>
                      <div className="text-lg text-gray-900">{activeLook.specs.hips} <span className="text-xs text-gray-400">in</span></div>
                    </div>
                  </div>

                  {/* Thumbnail look selector */}
                  <div className="flex gap-2 pt-2 overflow-x-auto pb-1">
                    {EDITORIAL_LOOKS.map((lk, idx) => (
                      <button
                        key={lk.id}
                        onClick={() => setActiveLookIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-colors ${
                          activeLookIndex === idx
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {lk.lookNumber.split(' — ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Workshop Pulse (4 cols) */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-6">

                {/* Atelier Real-Time Capacity Card */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">Atelier Pulse</span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900">Osu Master Workshop</h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Cutting Capacity</span>
                        <span className="font-medium text-gray-900">84%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent-500 rounded-full" style={{ width: '84%' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-lg bg-gray-50">
                        <div className="text-gray-500">Active Orders</div>
                        <div className="text-lg font-semibold text-gray-900">14</div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50">
                        <div className="text-gray-500">Next Fitting</div>
                        <div className="text-lg font-semibold text-gray-900">Tomorrow</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Textile Archive */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">Palette — Editorial</span>
                    <Sparkles size={14} className="text-accent-500" />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">Color Tokens</h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900 text-white">
                      <span>Ink</span>
                      <span className="text-gray-400">#111827</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-100 text-gray-900">
                      <span>Paper</span>
                      <span className="text-gray-500">#F9FAFB</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent-500 text-white">
                      <span>Accent</span>
                      <span>#C2653A</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Interactive Atelier Lab Showcase */}
            <div className="border-t border-gray-200 pt-10">
              <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
                <span className="text-xs font-medium text-accent-600">Interactive Lab</span>
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                  Precision Tailoring & Label Systems
                </h3>
                <p className="text-sm text-gray-500">
                  Try the sizing tools and status labels that power the workshop board.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

                {/* 1. Interactive Status Badge Card */}
                <AtelierCard
                  metadata="Order Ref — ATEL-9021"
                  title="Order Status"
                  subtitle="Live garment processing"
                  className="flex flex-col justify-between"
                >
                  <div className="space-y-5 flex flex-col items-center">
                    <p className="text-sm text-gray-600 text-center">
                      Select a status to preview the order status badge.
                    </p>

                    <div className="flex gap-2 flex-wrap justify-center">
                      {(['CUTTING', 'FITTING', 'READY'] as FabricStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => setOrderStatus(st)}
                          className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                            orderStatus === st
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <FabricStatusBadge status={orderStatus} orderId="LOOK-14-ATEL" fabricType={fabricType} />
                    </div>
                  </div>
                </AtelierCard>

                {/* 2. Interactive Sizing Card */}
                <AtelierCard
                  metadata="Measurement"
                  title="Sizing Workspace"
                  subtitle="Drafting custom silhouettes"
                  className="flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Adjust specs for the client fitting form.
                    </p>

                    <div className="flex rounded-lg bg-gray-100 p-1 mb-2 text-xs">
                      {(['bust', 'waist', 'hips'] as const).map((spec) => (
                        <button
                          key={spec}
                          onClick={() => setSelectedSpec(spec)}
                          className={`flex-1 py-1.5 rounded-md capitalize transition-colors font-medium ${
                            selectedSpec === spec
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {spec}
                        </button>
                      ))}
                    </div>

                    <div className="pt-1">
                      {renderActiveRuler()}
                    </div>
                  </div>
                </AtelierCard>

                {/* 3. Textile Archive */}
                <AtelierCard
                  metadata="Textile Archive"
                  title="Fabric Selection"
                  subtitle="Selected material specs"
                  className="flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Choose an ethically sourced textile for this garment.
                    </p>

                    <div className="space-y-1.5">
                      {[
                        'Pure Silk Brocade',
                        'Bonwire Gold Kente',
                        'Northern Striped Fugu',
                        'Ntonso Stamped Chiffon',
                        'Double-faced Silk Organza',
                      ].map((t) => (
                        <button
                          key={t}
                          onClick={() => setFabricType(t)}
                          className={`w-full text-left p-2.5 rounded-lg text-sm flex justify-between items-center transition-colors ${
                            fabricType === t
                              ? 'bg-gray-900 text-white font-medium'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span>{t}</span>
                          {fabricType === t && <Sparkles size={13} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </AtelierCard>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEASUREMENTS WORKSPACE */}
        {activeTab === 'measurements' && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <span className="text-xs font-medium text-accent-600">Sizing Passport</span>
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                Interactive Sizing Board
              </h2>
              <p className="text-sm text-gray-500">
                Fine-tune each dimension using the sliders below — changes sync with the cutting blueprint.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stat card 1: Bust */}
              <div
                onClick={() => setSelectedSpec('bust')}
                className={`p-5 rounded-xl border transition-colors cursor-pointer ${
                  selectedSpec === 'bust'
                    ? 'bg-white border-accent-400 ring-1 ring-accent-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-gray-500">Spec 01</span>
                  <Ruler size={16} className={selectedSpec === 'bust' ? 'text-accent-600' : 'text-gray-300'} />
                </div>
                <h4 className="text-base font-semibold text-gray-900 mb-1">Bust Circumference</h4>
                <div className="text-2xl font-semibold text-gray-900">
                  {bustSize.toFixed(1)} <span className="text-sm text-gray-400 font-normal">in</span>
                </div>
              </div>

              {/* Stat card 2: Waist */}
              <div
                onClick={() => setSelectedSpec('waist')}
                className={`p-5 rounded-xl border transition-colors cursor-pointer ${
                  selectedSpec === 'waist'
                    ? 'bg-white border-accent-400 ring-1 ring-accent-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-gray-500">Spec 02</span>
                  <Scissors size={16} className={selectedSpec === 'waist' ? 'text-accent-600' : 'text-gray-300'} />
                </div>
                <h4 className="text-base font-semibold text-gray-900 mb-1">Waist Circumference</h4>
                <div className="text-2xl font-semibold text-gray-900">
                  {waistSize.toFixed(1)} <span className="text-sm text-gray-400 font-normal">in</span>
                </div>
              </div>

              {/* Stat card 3: Hips */}
              <div
                onClick={() => setSelectedSpec('hips')}
                className={`p-5 rounded-xl border transition-colors cursor-pointer ${
                  selectedSpec === 'hips'
                    ? 'bg-white border-accent-400 ring-1 ring-accent-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-gray-500">Spec 03</span>
                  <TrendingUp size={16} className={selectedSpec === 'hips' ? 'text-accent-600' : 'text-gray-300'} />
                </div>
                <h4 className="text-base font-semibold text-gray-900 mb-1">Hips Circumference</h4>
                <div className="text-2xl font-semibold text-gray-900">
                  {hipsSize.toFixed(1)} <span className="text-sm text-gray-400 font-normal">in</span>
                </div>
              </div>
            </div>

            {/* Ruler Widget */}
            {renderActiveRuler()}

            {/* 6-Point Client Measurement Vault Sync */}
            <MeasurementVaultSync
              measurements={clientProfile}
              onMeasurementsChange={(upd) => {
                setClientProfile(upd);
                setBustSize(upd.bust);
                setWaistSize(upd.waist);
                setHipsSize(upd.hips);
              }}
            />

            {/* Spec Blueprint Details */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={16} className="text-accent-600" />
                <h3 className="text-xs font-medium text-gray-500">Active Cutting Blueprint</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-sm">
                <div className="space-y-3 text-gray-600">
                  <p>
                    These metrics configure the digital cutting layout and loom warp tension. Changes sync directly with the pattern files.
                  </p>
                  <p className="text-xs text-gray-400">
                    Values translate to 3D drafting models in CLO3D/Optitex.
                  </p>
                </div>

                <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-8 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pattern Index</span>
                    <span className="font-medium text-gray-900">ATEL-L14-2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">System Draft</span>
                    <span className="text-emerald-600 font-medium">Active / Auto-calibrated</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Scale</span>
                    <span className="font-medium text-gray-900">Imperial & Metric</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MY ORDERS (clients) / STATUS LABELS (staff) */}
        {activeTab === 'orders' && profile?.role === 'client' && (
          <ClientOrdersDashboard
            onViewOrder={(orderId) => {
              setDeepLinkOrderId(orderId);
              setIsOrderTrackerOpen(true);
            }}
            onGoToMeasurements={() => setActiveTab('measurements')}
          />
        )}

        {activeTab === 'orders' && profile?.role !== 'client' && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <span className="text-xs font-medium text-accent-600">Label System</span>
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                Order Status Labels
              </h2>
              <p className="text-sm text-gray-500">
                The status labels used across the workshop board and client order tracker.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center justify-items-center bg-white p-8 sm:p-10 rounded-xl border border-gray-200">
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-medium text-gray-500">Preparation</span>
                <FabricStatusBadge status="CUTTING" orderId="HAUTE-8890" fabricType="Raw French Linen" dateAdded="AUG 08, 2026" />
              </div>

              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-medium text-gray-500">Intermediate</span>
                <FabricStatusBadge status="FITTING" orderId="HAUTE-8891" fabricType="Bonwire Silk Brocade" dateAdded="AUG 09, 2026" />
              </div>

              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-medium text-gray-500">Finalized</span>
                <FabricStatusBadge status="READY" orderId="HAUTE-8892" fabricType="Brushed Cashmere" dateAdded="AUG 10, 2026" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-xl space-y-2">
              <h4 className="text-lg font-semibold text-gray-900">Status Label Reference</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Cutting, Fitting, and Ready map to an order's production stage and are used consistently across the workshop board, client order tracker, and personal order dashboard.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: ARTISAN WORKSHOP CONSOLE */}
        {activeTab === 'workshop' && (
          <Workshop />
        )}

      </main>

      {/* Floating Bottom Navigation Dock */}
      <FloatingDock
        items={dockItems}
        activeId={activeTab}
      />

      {/* Client Order Tracking */}
      <ClientOrderTracker
        isOpen={isOrderTrackerOpen}
        onClose={() => setIsOrderTrackerOpen(false)}
        initialOrderId={deepLinkOrderId}
      />

      {/* Rapid Bespoke Intake Modal */}
      <QuickIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onOrderCreated={() => setActiveTab('workshop')}
      />

      {/* Admin Team Roles Manager */}
      {isTeamRolesOpen && <TeamRolesManager onClose={() => setIsTeamRolesOpen(false)} />}

    </div>
  );
}

export default App;
