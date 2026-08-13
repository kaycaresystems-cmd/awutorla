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
import { FloatingDock } from './components/ui/FloatingDock';
import type { DockItem } from './components/ui/FloatingDock';
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
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-32 relative">

      {/* Brand Header */}
      <header className="glass sticky top-0 z-40 px-4 sm:px-6 py-4 border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">

          {/* Brand Insignia */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-accent-800 text-white flex items-center justify-center text-sm font-semibold font-display">
              LA
            </div>
            <div>
              <h1 className="text-lg leading-none">{businessName}</h1>
              <p className="text-xs text-gray-500 mt-1 font-sans">Bespoke Ghanaian tailoring & workshop system</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 justify-center">

            {/* Quick Intake Button (Tailor/Admin) — gated on the real account role */}
            {isStaff && (
              <button
                onClick={() => setIsIntakeOpen(true)}
                className="px-3.5 py-2 text-sm text-white bg-gradient-to-br from-accent-500 to-accent-800 hover:from-accent-600 hover:to-accent-800 font-medium transition-colors flex items-center gap-1.5"
              >
                <UserPlus size={14} />
                <span>New Intake</span>
              </button>
            )}

            {/* Track Garment Passport Action */}
            <button
              onClick={() => setIsOrderTrackerOpen(true)}
              className="glass-inset px-3.5 py-2 text-sm text-gray-700 hover:bg-white/70 flex items-center gap-1.5 transition-colors"
            >
              <Search size={14} />
              <span>Track Order</span>
            </button>

            {/* Signed-in Identity & Sign Out */}
            <div className="flex items-center gap-2 pl-1 text-sm">
              <span className="hidden sm:inline text-gray-500 max-w-[140px] truncate">
                {profile?.full_name || session.user.email}
              </span>
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
        onOrderCreated={() => {
          setIsIntakeOpen(false);
          setActiveTab('clients');
        }}
      />

    </div>
  );
}

export default App;
