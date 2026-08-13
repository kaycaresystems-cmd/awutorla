import React, { useEffect, useMemo, useState } from 'react';
import { Search, User, Phone, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ClientProfile } from '../components/clients/ClientProfile';
import { QuickIntakeModal } from '../components/workshop/QuickIntakeModal';

interface ClientRow {
  id: string;
  full_name: string | null;
  phone_number: string | null;
}

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number')
      .eq('role', 'client')
      .order('full_name', { ascending: true });
    if (!error) setClients((data as ClientRow[]) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => (c.full_name || '').toLowerCase().includes(q) || (c.phone_number || '').includes(q)
    );
  }, [clients, searchQuery]);

  if (selectedClientId) {
    const client = clients.find((c) => c.id === selectedClientId);
    return (
      <ClientProfile
        clientId={selectedClientId}
        clientName={client?.full_name || 'Client'}
        clientPhone={client?.phone_number || ''}
        onBack={() => setSelectedClientId(null)}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <span className="text-xs font-medium text-accent-600">Client Directory</span>
        <h2 className="text-2xl sm:text-3xl">Clients</h2>
        <p className="text-sm text-gray-500">
          Search and open a client's profile to review their orders and measurements.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full glass-inset pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors"
          />
          <Search size={15} className="absolute left-3 top-3 text-gray-400" />
        </div>
        <button
          onClick={() => setIsIntakeOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-br from-accent-500 to-accent-800 text-white hover:from-accent-600 font-medium text-sm transition-colors flex items-center justify-center gap-1.5 shrink-0"
        >
          <UserPlus size={14} />
          <span>New Client</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading clients...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center glass space-y-2">
          <User size={28} className="mx-auto text-gray-300" />
          <h4 className="text-lg font-semibold text-gray-900">No clients found</h4>
          <p className="text-sm text-gray-500">Try a different search, or register a new client.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClientId(c.id)}
              className="text-left glass p-5 hover:bg-white/70 transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 font-semibold">
                {(c.full_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{c.full_name || 'Unnamed Client'}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone size={11} />
                  <span>{c.phone_number || 'No phone on file'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <QuickIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onOrderCreated={() => {
          setIsIntakeOpen(false);
          load();
        }}
      />
    </div>
  );
};

export default Clients;
