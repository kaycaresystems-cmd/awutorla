import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Receipt,
  MessageCircle,
} from 'lucide-react';
import type { BespokeJobOrder } from '../../types/workshop.types';
import { supabase } from '../../lib/supabase';
import { saveOfflineJobCard } from '../../lib/offlineStore';
import { formatWhatsAppPaymentReceipt, openWhatsAppChat } from '../../services/whatsapp';
import { Modal } from '../ui/Modal';

interface RecordPaymentModalProps {
  order: BespokeJobOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: (updatedOrder: BespokeJobOrder) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentRecorded,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash in Atelier');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>('Paid at Osu studio reception.');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordedSuccess, setRecordedSuccess] = useState<boolean>(false);

  // Reset the form each time the modal opens for a (possibly different) order
  useEffect(() => {
    if (isOpen && order) {
      setPaymentMethod('Cash in Atelier');
      setAmountPaid(Math.max(0, order.totalAmount - order.depositPaid));
      setPaymentNotes('Paid at Osu studio reception.');
      setIsRecording(false);
      setErrorMessage(null);
      setRecordedSuccess(false);
    }
  }, [order?.id, isOpen]);

  if (!isOpen || !order) return null;

  const currentBalance = Math.max(0, order.totalAmount - order.depositPaid);

  const paymentMethods = [
    'Cash in Atelier',
    'In-Store POS / Card',
    'Direct Bank Transfer',
    'Direct MoMo',
  ];

  const calculatedNewDeposit = order.depositPaid + (Number(amountPaid) || 0);
  const calculatedRemainingBalance = Math.max(0, order.totalAmount - calculatedNewDeposit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (amountPaid <= 0) {
      setErrorMessage('Payment amount must be greater than zero GHS.');
      return;
    }

    setIsRecording(true);

    try {
      const newDeposit = order.depositPaid + amountPaid;
      const historyEntry = {
        stage: order.stage,
        completedAt: new Date().toISOString(),
        completedBy: 'Reception',
        notes: `Payment of GHS ${amountPaid.toFixed(2)} recorded via ${paymentMethod}. ${paymentNotes ? `Notes: ${paymentNotes}` : ''}`,
      };

      const updatedOrder: BespokeJobOrder = {
        ...order,
        depositPaid: newDeposit,
        stageHistory: [...order.stageHistory, historyEntry],
      };

      // 1. Save to Offline Cache
      saveOfflineJobCard(updatedOrder);

      // 2. Commit to Supabase Database
      try {
        const { error } = await (supabase.from('orders') as any)
          .update({
            deposit_paid: newDeposit,
            stage_history: updatedOrder.stageHistory,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
        if (error) console.error('[RecordPaymentModal] Payment update failed:', error);
      } catch (err) {
        console.error('[RecordPaymentModal] Payment update threw:', err);
      }

      onPaymentRecorded(updatedOrder);
      setRecordedSuccess(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Payment // #${order.id}`}
      subtitle="Financial settlement & receipt console"
      icon={<Receipt size={17} className="text-accent-800" />}
      maxWidth="max-w-md"
    >
      <div className="p-6 space-y-5">
        {recordedSuccess ? (
          <div className="p-6 text-center glass rounded-3xl border border-emerald-300 space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={30} />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-accent-950 font-display">Payment Recorded</h4>
              <p className="text-xs text-gray-500 font-sans mt-1">
                GHS {amountPaid.toFixed(2)} received via {paymentMethod}.
              </p>
            </div>

            <div className="p-3.5 bg-gold-50/80 border border-gold-500/25 rounded-2xl text-xs font-mono">
              <span className="text-gray-500 font-sans">Remaining Balance:</span>
              <span className="font-bold text-accent-950 ml-1.5 text-sm">GHS {calculatedRemainingBalance.toFixed(2)}</span>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const waMsg = formatWhatsAppPaymentReceipt(order, amountPaid, paymentMethod);
                  openWhatsAppChat(order.clientPhone, waMsg);
                }}
                className="px-4 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-2"
              >
                <MessageCircle size={15} />
                <span>Send WhatsApp Receipt</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 glass rounded-2xl border border-gold-500/20 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Total</span>
                <span className="font-semibold text-gray-900 text-sm font-mono">GHS {order.totalAmount.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Paid</span>
                <span className="font-semibold text-emerald-800 text-sm font-mono">GHS {order.depositPaid.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Due</span>
                <span className="font-semibold text-accent-900 text-sm font-mono">GHS {currentBalance.toFixed(0)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {paymentMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                      paymentMethod === m
                        ? 'bg-gradient-to-r from-accent-800 to-accent-950 text-gold-300 border-gold-500/40 shadow-sm'
                        : 'glass text-gray-700 hover:bg-gold-50/60 border-gray-200/80'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 tracking-wide">Amount Received (GHS) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/90 border border-gray-200/90 rounded-xl p-2.5 pl-9 text-xs sm:text-sm font-bold font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 shadow-sm transition-all"
                />
                <DollarSign size={14} className="absolute left-3 top-3 text-gold-700" />
              </div>
            </div>

            <div className="p-3.5 bg-gold-50/70 border border-gold-500/20 rounded-xl text-xs flex justify-between items-center font-mono">
              <span className="text-gray-600 font-sans">Remaining balance after payment:</span>
              <span className={`font-bold ${calculatedRemainingBalance === 0 ? 'text-emerald-800 font-sans' : 'text-accent-900'}`}>
                GHS {calculatedRemainingBalance.toFixed(2)}
                {calculatedRemainingBalance === 0 && ' (Settled)'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 tracking-wide">Reference / Receipt Notes</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. In-store POS terminal auth #89421"
                className="w-full bg-white/90 border border-gray-200/90 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 shadow-sm transition-all"
              />
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2.5 border-t border-gray-200/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecording}
                className="px-5 py-2.5 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-accent-900/15 transition-all flex items-center gap-2"
              >
                {isRecording ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-gold-300" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={14} className="text-gold-300" />
                    <span>Record Payment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default RecordPaymentModal;
