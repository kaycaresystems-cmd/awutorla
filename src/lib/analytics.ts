import { supabase } from './supabase';
import type { BespokeJobOrder, WorkshopStage } from '../types/workshop.types';

export interface OrderStatusCount {
  stage: WorkshopStage;
  label: string;
  count: number;
}

export interface TailorLoad {
  tailorName: string;
  activeOrders: number;
  completedOrders: number;
}

const STAGE_LABELS: Record<WorkshopStage, string> = {
  pending: 'Received',
  cutting: 'Cutting',
  fitting: 'Fitting',
  finishing: 'Finishing',
  ready: 'Ready',
  delivered: 'Delivered',
};

const STAGES: WorkshopStage[] = ['pending', 'cutting', 'fitting', 'finishing', 'ready', 'delivered'];

export function computeOrdersByStatus(orders: BespokeJobOrder[]): OrderStatusCount[] {
  return STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: orders.filter((o) => o.stage === stage).length,
  }));
}

export function computeTailorLoads(orders: BespokeJobOrder[]): TailorLoad[] {
  const map = new Map<string, TailorLoad>();
  for (const order of orders) {
    const name = order.assignedTailor || 'Unassigned';
    const entry = map.get(name) || { tailorName: name, activeOrders: 0, completedOrders: 0 };
    if (order.stage === 'delivered') entry.completedOrders += 1;
    else entry.activeOrders += 1;
    map.set(name, entry);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.activeOrders + b.completedOrders - (a.activeOrders + a.completedOrders)
  );
}

export function computeRevenueThisMonth(orders: BespokeJobOrder[]): number {
  const now = new Date();
  return orders
    .filter((o) => {
      const created = new Date(o.createdAt);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    })
    .reduce((sum, o) => sum + o.depositPaid, 0);
}

export function computeOutstandingBalance(orders: BespokeJobOrder[]): number {
  return orders
    .filter((o) => o.stage !== 'delivered')
    .reduce((sum, o) => sum + Math.max(0, o.totalAmount - o.depositPaid), 0);
}

/**
 * Counts new client sign-ups this calendar month. Separate from the orders
 * data (which already carries everything else the dashboard needs) since it
 * comes from `profiles` rather than `orders`.
 */
export async function fetchNewClientsThisMonth(): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'client')
    .gte('created_at', startOfMonth);
  if (error) throw error;
  return count || 0;
}
