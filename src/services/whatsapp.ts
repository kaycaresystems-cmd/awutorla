import { sanitizeGhanaianPhoneNumber } from './hubtel';
import type { BespokeJobOrder, WorkshopStage } from '../types/workshop.types';

/**
 * Builds a universal WhatsApp deep-link URL (wa.me)
 * Formats Ghanaian numbers to international standard without '+' or special symbols.
 */
export function getWhatsAppLink(phoneNumber: string, message: string): string {
  const sanitized = sanitizeGhanaianPhoneNumber(phoneNumber);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${sanitized}?text=${encodedText}`;
}

/**
 * Opens WhatsApp chat in a new tab or launches the WhatsApp mobile/desktop app
 */
export function openWhatsAppChat(phoneNumber: string, message: string): void {
  const link = getWhatsAppLink(phoneNumber, message);
  if (typeof window !== 'undefined') {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Welcome & Order Confirmation WhatsApp Template (Strictly emoji-free)
 */
export function formatWhatsAppWelcomeMessage(
  clientName: string,
  orderId: string,
  garmentTitle: string,
  depositPaid: number,
  totalAmount?: number
): string {
  const lines = [
    `*Maison L'Atelier // Bespoke Garment Intake*`,
    `Client: ${clientName}`,
    `Order Reference: #${orderId}`,
    `Garment: ${garmentTitle}`,
    `Deposit Received: GHS ${depositPaid.toFixed(2)}` + (totalAmount ? ` of GHS ${totalAmount.toFixed(2)}` : ''),
    ``,
    `Your bespoke order has been registered on the atelier floor. We will notify you once fabric inspection and cutting begin.`,
    ``,
    `View your digital garment passport:`,
    `https://latelier.app/?track=${orderId}`,
  ];

  return lines.join('\n');
}

/**
 * Milestone Stage Advancement WhatsApp Template (Strictly emoji-free)
 */
export function formatWhatsAppStageMessage(
  order: BespokeJobOrder,
  stage: WorkshopStage
): string {
  const passportUrl = `https://latelier.app/?track=${order.id}`;

  switch (stage) {
    case 'cutting':
      return [
        `*Maison L'Atelier // Production Update*`,
        `Client: ${order.clientName}`,
        `Order Reference: #${order.id}`,
        `Status: In Cutting`,
        ``,
        `Your fabric has been inspected, pattern drafted, and cutting has officially commenced with ${order.assignedTailor}.`,
        ``,
        `Track live progress:`,
        `${passportUrl}`,
      ].join('\n');

    case 'fitting':
      return [
        `*Maison L'Atelier // Fitting Invitation*`,
        `Client: ${order.clientName}`,
        `Order Reference: #${order.id}`,
        `Status: Ready for Fitting`,
        ``,
        `Your bespoke toile for "${order.garmentTitle}" is ready for fitting at our Osu atelier lounge. Please reply to schedule your session.`,
        ``,
        `View garment details:`,
        `${passportUrl}`,
      ].join('\n');

    case 'finishing':
      return [
        `*Maison L'Atelier // Production Update*`,
        `Client: ${order.clientName}`,
        `Order Reference: #${order.id}`,
        `Status: Final Couture Finishing`,
        ``,
        `Fitting adjustments for "${order.garmentTitle}" are complete. Our artisans are now executing hand-finishing, hems, and interior linings.`,
        ``,
        `Track live progress:`,
        `${passportUrl}`,
      ].join('\n');

    case 'ready':
      return [
        `*Maison L'Atelier // Collection Notice*`,
        `Client: ${order.clientName}`,
        `Order Reference: #${order.id}`,
        `Status: Ready for Collection`,
        ``,
        `Your bespoke creation for "${order.garmentTitle}" is finished, steamed, and packed in luxury dust bags. It is ready for collection at our Osu atelier. Medaase.`,
        ``,
        `View garment passport:`,
        `${passportUrl}`,
      ].join('\n');

    case 'delivered':
      return [
        `*Maison L'Atelier // Order Delivered*`,
        `Client: ${order.clientName}`,
        `Order Reference: #${order.id}`,
        ``,
        `Order #${order.id} has been delivered. Thank you for commissioning Maison L'Atelier.`,
      ].join('\n');

    default:
      return [
        `*Maison L'Atelier // Production Update*`,
        `Client: ${order.clientName}`,
        `Order Reference: #${order.id}`,
        `Status: ${stage.toUpperCase()}`,
        ``,
        `Track live progress:`,
        `${passportUrl}`,
      ].join('\n');
  }
}

/**
 * Direct Fitting Reminder Template (Strictly emoji-free)
 */
export function formatWhatsAppFittingReminder(
  clientName: string,
  orderId: string,
  dateString: string
): string {
  return [
    `*Maison L'Atelier // Fitting Appointment Reminder*`,
    `Client: ${clientName}`,
    `Order Reference: #${orderId}`,
    ``,
    `This is a reminder of your bespoke fitting session scheduled for ${dateString} at our Osu atelier lounge.`,
    `Please reply to this message to confirm or request a time adjustment.`,
    ``,
    `View garment passport:`,
    `https://latelier.app/?track=${orderId}`,
  ].join('\n');
}

/**
 * Manual Payment Receipt Template (Strictly emoji-free)
 */
export function formatWhatsAppPaymentReceipt(
  order: BespokeJobOrder,
  amountPaid: number,
  paymentMethod: string
): string {
  const newDeposit = order.depositPaid + amountPaid;
  const remainingBalance = Math.max(0, order.totalAmount - newDeposit);

  return [
    `*Maison L'Atelier // Payment Receipt*`,
    `Client: ${order.clientName}`,
    `Order Reference: #${order.id}`,
    `Garment: ${order.garmentTitle}`,
    `Payment Method: ${paymentMethod}`,
    `Amount Received: GHS ${amountPaid.toFixed(2)}`,
    `Total Paid to Date: GHS ${newDeposit.toFixed(2)} of GHS ${order.totalAmount.toFixed(2)}`,
    `Remaining Balance: GHS ${remainingBalance.toFixed(2)}`,
    ``,
    `Your payment has been recorded at our atelier studio. Medaase.`,
    ``,
    `View your digital garment passport:`,
    `https://latelier.app/?track=${order.id}`,
  ].join('\n');
}
