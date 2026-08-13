import { supabase } from './supabase';

const ORDER_SKETCHES_BUCKET = 'order-sketches';
const INVOICES_BUCKET = 'invoices';

function sanitizeFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  const ext = lastDot >= 0 ? fileName.slice(lastDot) : '';
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
}

/**
 * Uploads one intake reference sketch/photo for an order and returns its
 * public URL for storage in `orders.reference_images`. Bucket is public, so
 * the URL works directly in <img> tags and WhatsApp links with no signed-URL
 * refresh logic.
 */
export async function uploadOrderSketch(orderId: string, file: File): Promise<string> {
  const path = `${orderId}/${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(ORDER_SKETCHES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(ORDER_SKETCHES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads a generated invoice PDF (as a Blob from jsPDF) and returns its
 * public URL — used for the "share via WhatsApp" link, since wa.me deep
 * links can only carry text, not an attached file.
 */
export async function uploadInvoicePdf(orderId: string, pdfBlob: Blob): Promise<string> {
  const path = `${orderId}/invoice-${Date.now()}.pdf`;
  const { error } = await supabase.storage.from(INVOICES_BUCKET).upload(path, pdfBlob, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/pdf',
  });
  if (error) throw error;

  const { data } = supabase.storage.from(INVOICES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
