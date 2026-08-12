import type { BespokeJobOrder, ClientBodyMeasurements } from '../types/workshop.types';

const OFFLINE_ORDERS_KEY = 'maison_offline_job_cards_v1';
const OFFLINE_MEASUREMENTS_KEY = 'maison_offline_measurements_v1';

// In-memory fallback if localStorage is disabled or in non-browser environment
const inMemoryOrders = new Map<string, BespokeJobOrder>();
const inMemoryMeasurements = new Map<string, ClientBodyMeasurements>();

function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Saves a job card to offline local storage for shop-floor tablet access.
 */
export function saveOfflineJobCard(order: BespokeJobOrder): void {
  inMemoryOrders.set(order.id, order);

  if (isStorageAvailable()) {
    try {
      const existing = getAllOfflineJobCards();
      const index = existing.findIndex((o) => o.id === order.id);
      if (index >= 0) {
        existing[index] = order;
      } else {
        existing.push(order);
      }
      localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(existing));
    } catch (err) {
      console.warn('[OfflineStore] Failed to write order to localStorage:', err);
    }
  }
}

/**
 * Retrieves a single job card by order ID from offline storage.
 */
export function getOfflineJobCard(orderId: string): BespokeJobOrder | null {
  if (inMemoryOrders.has(orderId)) {
    return inMemoryOrders.get(orderId)!;
  }

  if (isStorageAvailable()) {
    try {
      const list = getAllOfflineJobCards();
      const found = list.find((o) => o.id === orderId);
      if (found) {
        inMemoryOrders.set(orderId, found);
        return found;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Retrieves all offline cached job cards.
 */
export function getAllOfflineJobCards(): BespokeJobOrder[] {
  if (isStorageAvailable()) {
    try {
      const raw = localStorage.getItem(OFFLINE_ORDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BespokeJobOrder[];
        parsed.forEach((item) => inMemoryOrders.set(item.id, item));
        return parsed;
      }
    } catch (err) {
      console.warn('[OfflineStore] Failed to read orders from localStorage:', err);
    }
  }

  return Array.from(inMemoryOrders.values());
}

/**
 * Caches client measurements for offline access.
 */
export function cacheClientMeasurements(
  clientId: string,
  measurements: ClientBodyMeasurements
): void {
  inMemoryMeasurements.set(clientId, measurements);

  if (isStorageAvailable()) {
    try {
      const raw = localStorage.getItem(OFFLINE_MEASUREMENTS_KEY) || '{}';
      const store = JSON.parse(raw);
      store[clientId] = measurements;
      localStorage.setItem(OFFLINE_MEASUREMENTS_KEY, JSON.stringify(store));
    } catch (err) {
      console.warn('[OfflineStore] Failed to cache measurements:', err);
    }
  }
}

/**
 * Retrieves client measurements from offline storage.
 */
export function getOfflineMeasurements(
  clientId: string
): ClientBodyMeasurements | null {
  if (inMemoryMeasurements.has(clientId)) {
    return inMemoryMeasurements.get(clientId)!;
  }

  if (isStorageAvailable()) {
    try {
      const raw = localStorage.getItem(OFFLINE_MEASUREMENTS_KEY);
      if (raw) {
        const store = JSON.parse(raw);
        if (store[clientId]) {
          inMemoryMeasurements.set(clientId, store[clientId]);
          return store[clientId];
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Checks if device currently has active network connection.
 */
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Listens for online/offline events and returns an unsubscribe function.
 */
export function listenNetworkStatus(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
