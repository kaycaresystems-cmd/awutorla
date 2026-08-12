import React, { useEffect, useState } from 'react';
import {
  Shield,
  Scissors,
  User,
  Loader2,
  AlertCircle,
  UserPlus,
  Mail,
  Phone,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth, createStaffAccount } from '../../lib/auth';
import type { UserRole } from '../../types/database.types';
import { Modal } from '../ui/Modal';

interface TeamRolesManagerProps {
  onClose: () => void;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role: UserRole;
}

const ROLE_OPTIONS: { value: UserRole; label: string; icon: React.ReactNode }[] = [
  { value: 'client', label: 'Client', icon: <User size={12} /> },
  { value: 'tailor', label: 'Tailor', icon: <Scissors size={12} /> },
  { value: 'admin', label: 'Admin', icon: <Shield size={12} /> },
];

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg p-2.5 pl-9 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors';
const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

export const TeamRolesManager: React.FC<TeamRolesManagerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // New staff account form
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Extract<UserRole, 'tailor' | 'admin'>>('tailor');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, role')
        .order('role', { ascending: false });
      if (!isMounted) return;
      if (error) {
        setErrorMessage(error.message);
      } else {
        setProfiles((data as ProfileRow[]) || []);
      }
      setIsLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    setSavingId(profileId);
    setErrorMessage(null);
    const previous = profiles;
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p)));

    const { error } = await (supabase.from('profiles') as any).update({ role: newRole }).eq('id', profileId);
    if (error) {
      setErrorMessage(`Could not update role: ${error.message}`);
      setProfiles(previous);
    }
    setSavingId(null);
  };

  const resetAddForm = () => {
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewRole('tailor');
    setCreateError(null);
    setCreatedAccount(null);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const result = await createStaffAccount(
        newFullName.trim(),
        newEmail.trim(),
        newRole,
        newPhone.trim() || undefined
      );
      setCreatedAccount({ email: newEmail.trim(), tempPassword: result.tempPassword });
      setProfiles((prev) => [
        { id: result.userId, full_name: newFullName.trim(), phone_number: newPhone.trim() || null, role: newRole },
        ...prev,
      ]);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Team Roles" subtitle="Admin access control" icon={<Shield size={17} />} maxWidth="max-w-2xl">
      <div className="p-6 space-y-3">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Create Staff Account */}
        {!isAddFormOpen ? (
          <button
            type="button"
            onClick={() => setIsAddFormOpen(true)}
            className="w-full p-3.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus size={15} />
            <span>Add Staff Member</span>
          </button>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            {createdAccount ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-semibold">Account created</span>
                </div>
                <p className="text-xs text-gray-600">
                  Share this temporary password with {createdAccount.email} directly — it won't be shown again.
                  They can sign in via the Sign In tab and change it any time.
                </p>
                <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm font-mono tracking-wider text-gray-900">{createdAccount.tempPassword}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(createdAccount.tempPassword)}
                    title="Copy password"
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetAddForm();
                      setIsAddFormOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors font-medium"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={resetAddForm}
                    className="px-4 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-accent-600 transition-colors font-medium"
                  >
                    Add Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateStaff} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent-600">New Staff Account</span>
                  <button
                    type="button"
                    onClick={() => {
                      resetAddForm();
                      setIsAddFormOpen(false);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="e.g. Kwame Mensah"
                        className={inputClass}
                      />
                      <User size={14} className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Email *</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="staff@example.com"
                        className={inputClass}
                      />
                      <Mail size={14} className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Phone (optional)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="024XXXXXXX"
                        className={inputClass}
                      />
                      <Phone size={14} className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Role</label>
                    <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                      <button
                        type="button"
                        onClick={() => setNewRole('tailor')}
                        className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                          newRole === 'tailor' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Scissors size={12} />
                        <span>Tailor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole('admin')}
                        className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                          newRole === 'admin' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Shield size={12} />
                        <span>Admin</span>
                      </button>
                    </div>
                  </div>
                </div>

                {createError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-accent-600 transition-colors flex items-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading team...</span>
          </div>
        ) : (
          profiles.map((p) => {
            const isSelf = p.id === user?.id;
            return (
              <div
                key={p.id}
                className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {p.full_name || 'Unnamed'} {isSelf && <span className="text-accent-600">(you)</span>}
                  </div>
                  <div className="text-gray-500 text-xs">{p.phone_number || 'No phone on file'}</div>
                </div>

                <div className="flex bg-gray-100 rounded-lg p-1">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isSelf || savingId === p.id}
                      onClick={() => handleRoleChange(p.id, opt.value)}
                      title={isSelf ? "You can't change your own role here." : undefined}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        p.role === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};

export default TeamRolesManager;
