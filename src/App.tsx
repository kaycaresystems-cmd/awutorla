import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  Ruler,
  ClipboardList,
  Search,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { TopNavBar } from './components/ui/TopNavBar';
import type { DockItem } from './components/ui/TopNavBar';
import { StaffDashboard } from './pages/StaffDashboard';
import { Clients } from './pages/Clients';
import { AdminSettings } from './pages/AdminSettings';
import { ClientDashboard } from './pages/ClientDashboard';
import { ClientProfilePage } from './pages/ClientProfilePage';
import { ClientOrderTracker } from './components/orders/ClientOrderTracker';
import { QuickIntakeModal } from './components/workshop/QuickIntakeModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { SetNewPasswordScreen } from './components/auth/SetNewPasswordScreen';
import { useAuth } from './lib/auth';
import { fetchAppSettings, DEFAULT_APP_SETTINGS } from './lib/settings';

function App() {
  const { session, profile, loading: authLoading, isPasswordRecovery, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('');
  const [isOrderTrackerOpen, setIsOrderTrackerOpen] = useState<boolean>(false);
  const [deepLinkOrderId, setDeepLinkOrderId] = useState<string | undefined>(undefined);
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
  const [businessName, setBusinessName] = useState<string>(DEFAULT_APP_SETTINGS.business_name);

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

  // Default the active tab once the signed-in user's role is known.
  useEffect(() => {
    if (!profile || activeTab) return;
    setActiveTab(profile.role === 'client' ? 'my-dashboard' : 'dashboard');
  }, [profile, activeTab]);

  useEffect(() => {
    if (!session) return;
    fetchAppSettings()
      .then((settings) => setBusinessName(settings.business_name))
      .catch((err) => console.error('[App] Failed to load business settings:', err));
  }, [session]);

  const isStaff = profile?.role === 'tailor' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  const dockItems: DockItem[] = isStaff
    ? [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={19} />,
          onClick: () => setActiveTab('dashboard'),
        },
        {
          id: 'clients',
          label: 'Clients',
          icon: <Users size={19} />,
          onClick: () => setActiveTab('clients'),
        },
        // Gated on the real account role (not a preview toggle) — this controls
        // navigation to a page that performs privileged writes.
        ...(isAdmin
          ? [
              {
                id: 'settings',
                label: 'Settings',
                icon: <SettingsIcon size={19} />,
                onClick: () => setActiveTab('settings'),
              },
            ]
          : []),
      ]
    : [
        {
          id: 'my-dashboard',
          label: 'My Dashboard',
          icon: <ClipboardList size={19} />,
          onClick: () => setActiveTab('my-dashboard'),
        },
        {
          id: 'my-profile',
          label: 'My Profile',
          icon: <Ruler size={19} />,
          onClick: () => setActiveTab('my-profile'),
        },
      ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-3">
        <img src="/logo.png" alt="Awutorla" className="h-14 w-auto animate-pulse" />
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
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans p-3 sm:p-6 lg:p-8 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto rounded-3xl shadow-mega-card bg-cream-100 overflow-hidden">

        {/* Brand Header */}
        <header className="px-4 sm:px-8 py-4 border-b border-gray-200/80">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">

            {/* Brand Insignia */}
            <div className="flex items-center gap-3.5 text-center lg:text-left shrink-0">
              <img src="/logo.png" alt={businessName} className="h-10 sm:h-12 w-auto" />
              <p className="text-[11px] text-gray-500 font-sans tracking-wide uppercase hidden sm:block border-l border-gray-200 pl-3.5">
                Haute Couture & Bespoke Tailoring
              </p>
            </div>

            {/* Primary Navigation */}
            <TopNavBar items={dockItems} activeId={activeTab} className="order-3 lg:order-2" />

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 justify-center order-2 lg:order-3">

              {/* Quick Intake Button (Tailor/Admin) — gated on the real account role */}
              {isStaff && (
                <button
                  onClick={() => setIsIntakeOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-charcoal-950 bg-mustard-400 hover:bg-mustard-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                  <UserPlus size={15} />
                  <span>New Intake</span>
                </button>
              )}

              {/* Track Garment Passport Action */}
              <button
                onClick={() => setIsOrderTrackerOpen(true)}
                className="glass-inset px-3.5 py-2 text-xs font-medium text-gray-700 hover:text-charcoal-900 hover:bg-white rounded-xl border border-gray-200/80 flex items-center gap-1.5 transition-all duration-200 shadow-sm"
              >
                <Search size={14} className="text-charcoal-700" />
                <span>Track Order</span>
              </button>

              {/* Signed-in Identity & Sign Out */}
              <div className="flex items-center gap-2 pl-1 text-xs">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200/60 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-700 font-medium max-w-[140px] truncate">
                    {profile?.full_name || session.user.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-rose-50 hover:text-rose-700 border border-gray-200/70 flex items-center justify-center transition-colors text-gray-500 shadow-sm"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="px-4 sm:px-6 py-8 sm:py-10">

          {isStaff && activeTab === 'dashboard' && <StaffDashboard />}
          {isStaff && activeTab === 'clients' && <Clients />}
          {isStaff && isAdmin && activeTab === 'settings' && <AdminSettings />}

          {!isStaff && activeTab === 'my-dashboard' && (
            <ClientDashboard
              onViewOrder={(orderId) => {
                setDeepLinkOrderId(orderId);
                setIsOrderTrackerOpen(true);
              }}
              onGoToProfile={() => setActiveTab('my-profile')}
            />
          )}
          {!isStaff && activeTab === 'my-profile' && <ClientProfilePage />}

        </main>
      </div>

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
        onOrderCreated={() => {
          setIsIntakeOpen(false);
          setActiveTab('clients');
        }}
      />

    </div>
  );
}

export default App;
