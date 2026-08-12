import React from 'react';
import { ClientOrdersDashboard } from '../components/orders/ClientOrdersDashboard';

interface ClientDashboardProps {
  onViewOrder: (orderId: string) => void;
  onGoToProfile: () => void;
}

/**
 * "My Dashboard" — the client's simplified landing tab (orders + status),
 * replacing the old Showroom lookbook for the client-facing experience.
 */
export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onViewOrder, onGoToProfile }) => (
  <ClientOrdersDashboard onViewOrder={onViewOrder} onGoToMeasurements={onGoToProfile} />
);

export default ClientDashboard;
