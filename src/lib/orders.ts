import { supabase } from './supabase';
import type {
  BespokeJobOrder,
  ClientBodyMeasurements,
  OrderTaskItem,
  WorkshopStage,
} from '../types/workshop.types';

function emptyMeasurements(
  clientId: string,
  clientName: string,
  clientPhone: string
): ClientBodyMeasurements {
  return {
    clientId,
    clientName,
    clientPhone,
    unit: 'in',
    values: {},
    updatedAt: new Date().toISOString(),
  };
}

function mapTaskRow(row: any): OrderTaskItem {
  return {
    id: row.id,
    orderId: row.order_id,
    tailorName: row.tailor_name || 'Unassigned',
    title: row.title,
    taskDescription: row.task_description ?? undefined,
    status: row.status,
    dueDate: row.due_date ?? undefined,
    assignedAt: row.assigned_at,
    completedAt: row.completed_at ?? undefined,
  };
}

function mapOrderRow(
  row: any,
  tasks: OrderTaskItem[],
  measurements: ClientBodyMeasurements | undefined
): BespokeJobOrder {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    stage: row.status as WorkshopStage,
    garmentTitle: row.garment_title,
    garmentSubtitle: row.garment_subtitle,
    fabricType: row.fabric_type,
    fabricColor: row.fabric_color,
    fabricNotes: row.fabric_notes,
    referenceImages: row.reference_images || [],
    swatchImage: row.swatch_image ?? undefined,
    measurements: measurements || emptyMeasurements(row.client_id || '', row.client_name, row.client_phone),
    depositPaid: Number(row.deposit_paid),
    totalAmount: Number(row.total_amount),
    assignedTailor: row.assigned_tailor,
    dueDate: row.due_date,
    createdAt: row.created_at,
    tasks,
    stageHistory: Array.isArray(row.stage_history) ? row.stage_history : [],
  };
}

/**
 * Fetches every order this account can see (RLS-scoped: all orders for
 * tailors/admins, own orders only for clients), joined with its tasks and the
 * client's measurements, and maps them into the app's BespokeJobOrder shape.
 * This is the single source of truth for both the Workshop board and the
 * client-facing order tracker — both should see the same live data.
 */
export async function fetchAllOrders(): Promise<BespokeJobOrder[]> {
  const { data: orderRows, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (ordersError) throw ordersError;

  const orders = (orderRows || []) as any[];
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const clientIds = [...new Set(orders.map((o) => o.client_id).filter(Boolean))];

  const [{ data: taskRows, error: tasksError }, headerResult, valuesResult] = await Promise.all([
    supabase.from('order_tasks').select('*').in('order_id', orderIds),
    clientIds.length > 0
      ? supabase.from('client_measurements').select('*').in('client_id', clientIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length > 0
      ? supabase
          .from('client_measurement_values')
          .select('client_id, value, measurement_parameters(key)')
          .in('client_id', clientIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (tasksError) throw tasksError;
  if (headerResult.error) throw headerResult.error;
  if (valuesResult.error) throw valuesResult.error;

  const tasksByOrder = new Map<string, OrderTaskItem[]>();
  for (const row of (taskRows || []) as any[]) {
    const mapped = mapTaskRow(row);
    const list = tasksByOrder.get(mapped.orderId) || [];
    list.push(mapped);
    tasksByOrder.set(mapped.orderId, list);
  }

  const measurementsByClient = new Map<string, ClientBodyMeasurements>();
  for (const row of (headerResult.data || []) as any[]) {
    measurementsByClient.set(row.client_id, {
      id: row.id,
      clientId: row.client_id,
      clientName: '',
      clientPhone: '',
      unit: row.unit,
      values: {},
      notes: row.notes ?? undefined,
      updatedAt: row.updated_at,
    });
  }
  for (const row of (valuesResult.data || []) as any[]) {
    const key = row.measurement_parameters?.key;
    if (!key) continue;
    let entry = measurementsByClient.get(row.client_id);
    if (!entry) {
      entry = emptyMeasurements(row.client_id, '', '');
      measurementsByClient.set(row.client_id, entry);
    }
    entry.values[key] = Number(row.value);
  }

  return orders.map((row) => {
    const measurements = row.client_id ? measurementsByClient.get(row.client_id) : undefined;
    if (measurements) {
      measurements.clientName = row.client_name;
      measurements.clientPhone = row.client_phone;
    }
    return mapOrderRow(row, tasksByOrder.get(row.id) || [], measurements);
  });
}

/**
 * Looks up a single order without a Supabase session, via the track-order Edge
 * Function — used for the public `?track=` links sent by SMS/WhatsApp. Requires
 * both the order ID and the phone number on file to match (RLS can't scope
 * anonymous access to "one order you already know the ID of" the way this
 * function does; opening `orders` to anonymous SELECT would expose every
 * client's order history through the public anon key). Throws with a
 * user-facing message on no match or invalid input.
 */
export async function trackOrderAnonymously(orderId: string, phone: string): Promise<BespokeJobOrder> {
  const { data, error } = await supabase.functions.invoke('track-order', {
    body: { orderId, phone },
  });
  if (error) throw new Error('Could not reach the tracking service. Please try again.');
  if (data?.error) throw new Error(data.error);

  const tasks = (data.tasks || []).map(mapTaskRow);
  return mapOrderRow(data.order, tasks, undefined);
}

/**
 * Subscribes to live changes on orders/order_tasks so every connected tailor's
 * Workshop board updates when any device writes — this is what makes the board
 * shared rather than per-device. Fires `onChange` (a refetch trigger) on any
 * insert/update/delete rather than trying to patch state incrementally, since
 * reconstructing one order's full shape (joined tasks + measurements) from a
 * single realtime payload isn't worth the complexity at this scale.
 */
export function subscribeToOrderChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('workshop-orders-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_tasks' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
