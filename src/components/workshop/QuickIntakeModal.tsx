import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  Phone,
  Loader2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import type { BespokeJobOrder, ClientBodyMeasurements, MeasurementParameter } from '../../types/workshop.types';
import { sanitizeGhanaianPhoneNumber, detectGhanaNetwork } from '../../services/hubtel';
import { formatWhatsAppWelcomeMessage, openWhatsAppChat } from '../../services/whatsapp';
import { supabase } from '../../lib/supabase';
import { saveOfflineJobCard, cacheClientMeasurements } from '../../lib/offlineStore';
import { fetchMeasurementParameters } from '../../lib/measurementParameters';
import { createWalkInClient, useAuth } from '../../lib/auth';
import { Modal } from '../ui/Modal';

interface QuickIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (newOrder: BespokeJobOrder) => void;
}

const inputClass =
  'w-full bg-white/90 border border-gray-200/90 rounded-xl p-2.5 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/50 shadow-sm transition-all';
const labelClass = 'block text-xs font-semibold text-gray-700 mb-1 tracking-wide';

export const QuickIntakeModal: React.FC<QuickIntakeModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  const { user } = useAuth();

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('024');
  const [garmentTitle, setGarmentTitle] = useState('Royal Kente Evening Ballgown');
  const [garmentSubtitle, setGarmentSubtitle] = useState('Custom Bespoke Couture');
  const [fabricType, setFabricType] = useState('Handwoven Silk Kente');
  const [fabricColor, setFabricColor] = useState('Royal Gold & Indigo');
  const [fabricNotes, setFabricNotes] = useState('Double-reinforced boning with gold thread embroidery.');
  const [totalAmount, setTotalAmount] = useState<number>(3500);
  const [depositPaid, setDepositPaid] = useState<number>(1750);
  const [assignedTailor, setAssignedTailor] = useState('Master Kwame Mensah');
  const [dueDate, setDueDate] = useState('AUG 24, 2026');

  // Measurements State
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [measurementParameters, setMeasurementParameters] = useState<MeasurementParameter[]>([]);
  const [measurementValues, setMeasurementValues] = useState<Record<string, number>>({});

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    orderId: string;
    accessCode: string | null;
    isNewAccount: boolean;
    smsSent: boolean;
    accountError: string | null;
  } | null>(null);

  // Reset the entire intake form each time the modal opens, since the parent keeps this
  // component mounted and only toggles `isOpen` — otherwise a second intake would start
  // from the previous client's data or show the previous success screen.
  useEffect(() => {
    if (isOpen) {
      setClientName('');
      setClientPhone('024');
      setGarmentTitle('Royal Kente Evening Ballgown');
      setGarmentSubtitle('Custom Bespoke Couture');
      setFabricType('Handwoven Silk Kente');
      setFabricColor('Royal Gold & Indigo');
      setFabricNotes('Double-reinforced boning with gold thread embroidery.');
      setTotalAmount(3500);
      setDepositPaid(1750);
      setAssignedTailor('Master Kwame Mensah');
      setDueDate('AUG 24, 2026');
      setUnit('in');
      setMeasurementValues({});
      setIsSubmitting(false);
      setErrorMessage(null);
      setSuccessInfo(null);

      fetchMeasurementParameters()
        .then(setMeasurementParameters)
        .catch((err) => console.error('[QuickIntakeModal] Failed to load measurement parameters:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time direct subtraction
  const remainingBalance = Math.max(0, (totalAmount || 0) - (depositPaid || 0));

  // Network Detection
  let detectedNet = 'unknown';
  try {
    if (clientPhone.length >= 3) {
      detectedNet = detectGhanaNetwork(clientPhone);
    }
  } catch {
    // Ignore invalid partial numbers
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (!user) {
        throw new Error('You must be signed in as workshop staff to register a client.');
      }
      const sanitizedPhone = sanitizeGhanaianPhoneNumber(clientPhone);
      const generatedOrderId = `ORD-BESPOKE-${Math.floor(100 + Math.random() * 900)}`;

      // 0. Create (or recognize a returning) client account — this is what lets the
      // client sign in later and see this order. Runs server-side via Edge Function
      // since it needs the admin key. Non-fatal: if it fails (e.g. offline, function
      // not deployed), the order still gets created without an attached account.
      let realClientId: string | null = null;
      let accessCode: string | null = null;
      let isNewAccount = false;
      let smsSent = false;
      let accountError: string | null = null;
      try {
        const account = await createWalkInClient(clientName.trim(), sanitizedPhone);
        realClientId = account.clientId;
        accessCode = account.accessCode;
        isNewAccount = account.isNewAccount;
        smsSent = account.smsSent;
      } catch (err) {
        console.error('[QuickIntakeModal] Walk-in client account creation failed:', err);
        accountError =
          'Could not create a client account (order was still saved). You can register them again later to enable sign-in.';
      }

      const clientId = realClientId || `client-${Date.now().toString().slice(-6)}`;

      // 1. Build Tailoring Measurement Passport
      const measurementsPayload: ClientBodyMeasurements = {
        clientId,
        clientName: clientName.trim(),
        clientPhone: sanitizedPhone,
        unit,
        values: measurementValues,
        updatedAt: new Date().toISOString(),
      };

      const initialTaskId = `tsk-${Date.now().toString().slice(-4)}`;
      const initialStageHistory = [
        {
          stage: 'pending' as const,
          completedAt: new Date().toISOString(),
          completedBy: 'Reception',
          notes: `Intake logged. Initial payment of GHS ${depositPaid} received.`,
        },
      ];

      // 2. Build Bespoke Order Entity
      const newOrder: BespokeJobOrder = {
        id: generatedOrderId,
        clientId: realClientId,
        clientName: clientName.trim(),
        clientPhone: sanitizedPhone,
        stage: 'pending',
        garmentTitle: garmentTitle.trim(),
        garmentSubtitle: garmentSubtitle.trim(),
        fabricType: fabricType.trim(),
        fabricColor: fabricColor.trim(),
        fabricNotes: fabricNotes.trim(),
        referenceImages: ['/shop/kente_corset.png', '/editorial.png'],
        swatchImage: '/shop/kente_corset.png',
        measurements: measurementsPayload,
        depositPaid,
        totalAmount,
        assignedTailor,
        dueDate,
        createdAt: new Date().toISOString(),
        tasks: [
          {
            id: initialTaskId,
            orderId: generatedOrderId,
            tailorName: assignedTailor,
            title: `Draft master bespoke pattern for ${garmentTitle}`,
            status: 'pending',
            assignedAt: new Date().toISOString(),
          },
        ],
        stageHistory: initialStageHistory,
      };

      // 3. Save to Offline Store
      saveOfflineJobCard(newOrder);
      cacheClientMeasurements(clientId, measurementsPayload);

      // 4. Commit to Supabase Database (Orders + initial task)
      try {
        const { error: insertError } = await (supabase.from('orders') as any).insert({
          id: generatedOrderId,
          // Attached to the client's real account when one was just created/found above;
          // stays null only if that step failed (contact details are still captured in
          // client_name/client_phone below either way).
          client_id: realClientId,
          client_name: clientName.trim(),
          client_phone: sanitizedPhone,
          status: 'pending',
          garment_title: garmentTitle.trim(),
          garment_subtitle: garmentSubtitle.trim(),
          fabric_type: fabricType.trim(),
          fabric_color: fabricColor.trim(),
          fabric_notes: fabricNotes.trim(),
          reference_images: newOrder.referenceImages,
          swatch_image: newOrder.swatchImage,
          assigned_tailor: assignedTailor,
          due_date: dueDate,
          deposit_paid: depositPaid,
          total_amount: totalAmount,
          currency: 'GHS',
          stage_history: initialStageHistory,
        });
        if (insertError) console.error('[QuickIntakeModal] Order insert failed:', insertError);

        if (!insertError) {
          const { error: taskError } = await (supabase.from('order_tasks') as any).insert({
            id: initialTaskId,
            order_id: generatedOrderId,
            tailor_id: user.id,
            tailor_name: assignedTailor,
            title: `Draft master bespoke pattern for ${garmentTitle}`,
            status: 'pending',
          });
          if (taskError) console.error('[QuickIntakeModal] Initial task insert failed:', taskError);
        }
      } catch (err) {
        console.error('[QuickIntakeModal] Order insert threw:', err);
      }

      // 5. Commit measurements to Supabase, now that we have a real client id to attach them to
      if (realClientId) {
        try {
          const { error: headerError } = await (supabase.from('client_measurements') as any).upsert(
            { client_id: realClientId, unit, updated_at: measurementsPayload.updatedAt },
            { onConflict: 'client_id' }
          );
          if (headerError) console.error('[QuickIntakeModal] Measurements header upsert failed:', headerError);

          const valueRows = measurementParameters
            .filter((p) => measurementValues[p.key] !== undefined && !Number.isNaN(measurementValues[p.key]))
            .map((p) => ({
              client_id: realClientId,
              parameter_id: p.id,
              value: measurementValues[p.key],
              updated_at: measurementsPayload.updatedAt,
            }));
          if (valueRows.length > 0) {
            const { error: valuesError } = await (supabase.from('client_measurement_values') as any).upsert(
              valueRows,
              { onConflict: 'client_id,parameter_id' }
            );
            if (valuesError) console.error('[QuickIntakeModal] Measurement values upsert failed:', valuesError);
          }
        } catch (err) {
          console.error('[QuickIntakeModal] Measurements upsert threw:', err);
        }
      }

      onOrderCreated(newOrder);
      setSuccessInfo({ orderId: generatedOrderId, accessCode, isNewAccount, smsSent, accountError });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Bespoke Client Passport"
      subtitle="Rapid intake — workshop"
      icon={<UserPlus size={17} />}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
        {successInfo ? (
          <div className="p-8 text-center glass rounded-3xl border border-gold-500/30 space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={34} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gold-700 uppercase tracking-widest">Bespoke Registration Complete</span>
              <h3 className="text-2xl sm:text-3xl font-display font-semibold text-accent-950 mt-1">
                Order #{successInfo.orderId} Created
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed font-sans">
              Client profile, 6-point tailoring passport, and initial workshop task have been saved to the atelier and synchronized with the master database.
            </p>

            {successInfo.accessCode ? (
              <div className="mx-auto max-w-sm p-5 bg-white/95 rounded-2xl border border-gold-500/40 shadow-sm space-y-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  {successInfo.isNewAccount ? 'New Client Access Code' : 'Recognized Client Access Code'}
                </span>
                <span className="text-3xl tracking-[0.25em] text-accent-950 font-mono font-bold block">
                  {successInfo.accessCode}
                </span>
                <p className="text-xs text-gray-500 leading-relaxed font-sans pt-1">
                  {successInfo.smsSent
                    ? 'Delivered to the client via SMS — this code signs them in to track their bespoke order.'
                    : 'SMS delivery pending — please hand off this code directly or send it via WhatsApp.'}
                </p>
              </div>
            ) : (
              successInfo.accountError && (
                <div className="mx-auto max-w-sm p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start gap-2 text-left">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{successInfo.accountError}</span>
                </div>
              )
            )}

            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const waMsg = formatWhatsAppWelcomeMessage(clientName, successInfo.orderId, garmentTitle, depositPaid, totalAmount);
                  const withCode = successInfo.accessCode
                    ? `${waMsg}\n\nYour client access code: ${successInfo.accessCode}`
                    : waMsg;
                  openWhatsAppChat(clientPhone, withCode);
                }}
                className="px-5 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
              >
                <MessageCircle size={16} />
                <span>Send WhatsApp Welcome</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 1: CLIENT CONTACT */}
            <div className="p-6 glass rounded-2xl border border-gold-500/20 space-y-4 shadow-sm">
              <span className="text-xs font-semibold text-accent-950 uppercase tracking-widest block">1. Client Dossier</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Client Full Name *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Abena Poku"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className={labelClass}>Ghana Phone (WhatsApp) *</label>
                    {detectedNet !== 'unknown' && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono">
                        {detectedNet.replace('-gh', '').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="024XXXXXXX"
                      className={`${inputClass} pl-9 font-mono`}
                    />
                    <Phone size={14} className="absolute left-3 top-3 text-gold-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: TAILORING PASSPORT */}
            <div className="p-6 glass rounded-2xl border border-gold-500/20 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-accent-950 uppercase tracking-widest">2. Measurement Passport</span>
                <div className="flex bg-gray-100/90 rounded-xl p-1 text-xs border border-gray-200/60">
                  <button
                    type="button"
                    onClick={() => setUnit('in')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      unit === 'in' ? 'bg-gradient-to-r from-accent-800 to-accent-950 text-gold-300 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Inches
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('cm')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      unit === 'cm' ? 'bg-gradient-to-r from-accent-800 to-accent-950 text-gold-300 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Centimeters
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {measurementParameters.map((p) => (
                  <div key={p.id}>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1 truncate">
                      {p.label} ({unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={measurementValues[p.key] ?? ''}
                      onChange={(e) =>
                        setMeasurementValues((prev) => ({ ...prev, [p.key]: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full bg-white/90 border border-gray-200/90 rounded-xl p-2 text-xs sm:text-sm font-semibold text-accent-950 text-center font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 shadow-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: GARMENT & FINANCIAL DETAILS */}
            <div className="p-6 glass rounded-2xl border border-gold-500/20 space-y-4 shadow-sm">
              <span className="text-xs font-semibold text-accent-950 uppercase tracking-widest block">3. Garment Specification & Pricing</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Garment Title *</label>
                  <input
                    type="text"
                    required
                    value={garmentTitle}
                    onChange={(e) => setGarmentTitle(e.target.value)}
                    placeholder="e.g. Royal Kente Evening Ballgown"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Occasion / Subtitle</label>
                  <input
                    type="text"
                    value={garmentSubtitle}
                    onChange={(e) => setGarmentSubtitle(e.target.value)}
                    placeholder="e.g. State Banquet Evening Wear"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fabric Weave</label>
                  <input
                    type="text"
                    value={fabricType}
                    onChange={(e) => setFabricType(e.target.value)}
                    placeholder="e.g. Handwoven Silk Kente"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Color Palette</label>
                  <input
                    type="text"
                    value={fabricColor}
                    onChange={(e) => setFabricColor(e.target.value)}
                    placeholder="e.g. Royal Gold & Midnight Indigo"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Artisan Textile & Pattern Notes</label>
                <input
                  type="text"
                  value={fabricNotes}
                  onChange={(e) => setFabricNotes(e.target.value)}
                  placeholder="e.g. Double-reinforced boning with gold thread embroidery along neckline"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className={labelClass}>Total Price (GHS) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                    className={`${inputClass} font-semibold font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Deposit Paid (GHS) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={depositPaid}
                    onChange={(e) => setDepositPaid(parseFloat(e.target.value) || 0)}
                    className={`${inputClass} font-semibold text-emerald-800 font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Assigned Tailor</label>
                  <select
                    value={assignedTailor}
                    onChange={(e) => setAssignedTailor(e.target.value)}
                    className={inputClass}
                  >
                    <option value="Master Kwame Mensah">Master Kwame Mensah</option>
                    <option value="Artisan Kofi Badu">Artisan Kofi Badu</option>
                    <option value="Artisan Ama Frimpong">Artisan Ama Frimpong</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Target Due Date</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="AUG 24, 2026"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="p-3.5 bg-gold-50/70 border border-gold-500/25 rounded-xl text-xs flex justify-between items-center font-mono">
                <span className="text-gray-600 font-sans">Remaining balance:</span>
                <span className={`font-semibold text-sm ${remainingBalance === 0 ? 'text-emerald-800 font-sans' : 'text-accent-900'}`}>
                  GHS {remainingBalance.toFixed(2)}
                  {remainingBalance === 0 && ' (Settled in Full)'}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3 border-t border-gray-200/80">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-2.5 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-accent-900/15 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-gold-300" />
                    <span>Creating Order...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={15} className="text-gold-300" />
                    <span>Create Bespoke Order</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default QuickIntakeModal;
