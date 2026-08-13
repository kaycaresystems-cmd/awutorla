import React, { useState, useEffect } from 'react';
import { MessageCircle, Smartphone } from 'lucide-react';
import type { BespokeJobOrder } from '../../types/workshop.types';
import { detectGhanaNetwork } from '../../services/hubtel';
import { openWhatsAppChat } from '../../services/whatsapp';
import { Modal } from '../ui/Modal';

interface DirectSMSModalProps {
  order: BespokeJobOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DirectSMSModal: React.FC<DirectSMSModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');

  // Populate the recipient/message fields each time the modal opens
  useEffect(() => {
    if (isOpen && order) {
      setRecipientPhone(order.clientPhone || '0244123456');
      setMessageText(
        `Hi ${order.clientName}, your fitting for Order #${order.id} is scheduled for tomorrow at 2 PM at Maison L'Atelier, Osu. Please reply to confirm. Track live: https://latelier.app/?track=${order.id}`
      );
    }
  }, [order?.id, isOpen]);

  if (!isOpen || !order) return null;

  const templates = [
    {
      label: 'Fitting Reminder',
      text: `Hi ${order.clientName}, this is a reminder of your bespoke fitting for Order #${order.id} scheduled for tomorrow at 2 PM at Maison L'Atelier, Osu. Please reply to confirm. Track live: https://latelier.app/?track=${order.id}`,
    },
    {
      label: 'Fabric Arrived',
      text: `Hi ${order.clientName}, your custom fabric for Order #${order.id} has arrived at our Osu atelier. Cutting has been scheduled with ${order.assignedTailor}. Track live: https://latelier.app/?track=${order.id}`,
    },
    {
      label: 'Toile Prepped',
      text: `Hi ${order.clientName}, the preliminary toile muslin for Order #${order.id} is prepared. Please visit our atelier lounge at your convenience for pinning. Track live: https://latelier.app/?track=${order.id}`,
    },
    {
      label: 'Collection Notice',
      text: `Hi ${order.clientName}, your bespoke creation for Order #${order.id} is finalized and ready for collection at Maison L'Atelier, Osu. Medaase. Track live: https://latelier.app/?track=${order.id}`,
    },
  ];

  const handleOpenWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    openWhatsAppChat(recipientPhone, messageText);
    onClose();
  };

  const detectedNetwork = (() => {
    try {
      return detectGhanaNetwork(recipientPhone);
    } catch {
      return null;
    }
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Concierge // ${order.clientName}`}
      subtitle="Direct WhatsApp concierge dispatch"
      icon={<MessageCircle size={17} className="text-emerald-700" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleOpenWhatsApp} className="p-6 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1 text-xs">
            <label className="font-semibold text-gray-700 tracking-wide">Client Phone Number</label>
            {detectedNetwork && (
              <span className="text-emerald-700 font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[10px]">
                {detectedNetwork.replace('-gh', '').toUpperCase()}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="tel"
              required
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="w-full bg-white/90 border border-gray-200/90 rounded-xl p-2.5 text-xs sm:text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 pr-9 shadow-sm transition-all"
            />
            <Smartphone size={14} className="absolute right-3 top-3 text-gold-700" />
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">Concierge Templates</span>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMessageText(tpl.text)}
                className="px-3 py-1 glass rounded-xl text-xs font-medium text-gray-700 hover:text-accent-950 hover:border-gold-500/40 transition-all shadow-sm"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1 text-xs">
            <label className="font-semibold text-gray-700 tracking-wide">Message Draft</label>
            <span className="text-gray-400 font-mono text-[11px]">{messageText.length} chars</span>
          </div>
          <textarea
            rows={4}
            required
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full bg-white/90 border border-gray-200/90 rounded-xl p-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 leading-relaxed shadow-sm transition-all"
          />
        </div>

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
            className="px-5 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <MessageCircle size={15} />
            <span>Send via WhatsApp</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DirectSMSModal;
