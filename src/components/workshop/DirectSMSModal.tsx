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

  // Populate the recipient/message fields each time the modal opens for a (possibly
  // different) order, since the parent keeps this component mounted and only toggles `isOpen`.
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
      title={`Message ${order.clientName}`}
      subtitle="Direct WhatsApp messenger"
      icon={<MessageCircle size={17} />}
    >
      <form onSubmit={handleOpenWhatsApp} className="p-6 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1 text-xs">
            <label className="font-medium text-gray-600">Client Phone Number</label>
            {detectedNetwork && (
              <span className="text-accent-600 font-medium uppercase">
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
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 pr-9 transition-colors"
            />
            <Smartphone size={14} className="absolute right-3 top-3 text-gray-400" />
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-600 mb-1.5">1-Click Templates</span>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMessageText(tpl.text)}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-white rounded-md text-xs text-gray-600 hover:text-gray-900 transition-colors"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1 text-xs">
            <label className="font-medium text-gray-600">Message Copy</label>
            <span className="text-gray-400">{messageText.length} chars</span>
          </div>
          <textarea
            rows={4}
            required
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 leading-relaxed transition-colors"
          />
        </div>

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
            className="px-6 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
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
