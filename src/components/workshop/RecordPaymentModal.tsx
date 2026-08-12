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

  // Reset the form each time the modal opens for a (possibly different) order, since the
  // parent keeps this component mounted and only toggles `isOpen`.
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
        if (error) console.error('[RecordPayment] Supabase update failed:', error);
      } catch (err) {
        console.error('[RecordPayment] Supabase update threw:', err);
      }

      onPaymentRecorded(updatedOrder);
      setRecordedSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment for #${order.id}`}
      subtitle="Manual payment console"
      icon={<Receipt size={17} />}
    >
      <div className="p-6 space-y-5">
        {recordedSuccess ? (
          <div className="p-6 text-center bg-gray-50 rounded-xl border border-emerald-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={26} />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Payment Recorded</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              GHS {amountPaid.toFixed(2)} recorded via {paymentMethod}.
              <br />
              Remaining Balance: GHS {calculatedRemainingBalance.toFixed(2)}
            </p>

            <div className="pt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const waMsg = formatWhatsAppPaymentReceipt(order, amountPaid, paymentMethod);
                  openWhatsAppChat(order.clientPhone, waMsg);
                }}
                className="px-4 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <MessageCircle size={14} />
                <span>Send WhatsApp Receipt</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-900 text-white hover:bg-accent-600 rounded-lg text-sm font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-gray-500 block">Total Value</span>
                <span className="font-semibold text-gray-900 text-sm">GHS {order.totalAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Paid to Date</span>
                <span className="font-semibold text-emerald-700 text-sm">GHS {order.depositPaid.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Due Now</span>
                <span className="font-semibold text-rose-600 text-sm">GHS {currentBalance.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {paymentMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${
                      paymentMethod === m
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received (GHS) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 pl-8 transition-colors"
                />
                <DollarSign size={14} className="absolute left-2.5 top-3 text-gray-400" />
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs flex justify-between items-center">
              <span className="text-gray-500">Remaining balance after payment:</span>
              <span className={`font-semibold ${calculatedRemainingBalance === 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                GHS {calculatedRemainingBalance.toFixed(2)}
                {calculatedRemainingBalance === 0 && ' (Paid in Full)'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Receipt Notes</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. In-store POS terminal auth #89421"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecording}
                className="px-5 py-2.5 bg-gray-900 text-white hover:bg-accent-600 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                {isRecording ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    <span>Record Payment & Save</span>
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
