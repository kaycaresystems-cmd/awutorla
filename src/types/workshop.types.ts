export type WorkshopStage =
  | 'pending' // Received
  | 'cutting' // In Cutting
  | 'fitting' // In Fitting
  | 'finishing' // In Finishing
  | 'ready' // Ready for Pickup/Delivery
  | 'delivered'; // Completed

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface OrderTaskItem {
  id: string;
  orderId: string;
  tailorName: string;
  title: string;
  taskDescription?: string;
  status: TaskStatus;
  dueDate?: string;
  assignedAt: string;
  completedAt?: string;
}

export interface MeasurementParameter {
  id: string;
  key: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ClientBodyMeasurements {
  id?: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  unit: 'in' | 'cm';
  // Keyed by the measurement_parameters.key of each active admin-defined
  // parameter — replaces the old fixed bust/waist/hips/... fields so admins
  // can add parameters without a schema change.
  values: Record<string, number>;
  notes?: string;
  updatedAt: string;
}

export interface BespokeJobOrder {
  id: string; // Order reference e.g. ORD-BESPOKE-884
  clientId?: string | null; // profiles.id, when the client has an account
  clientName: string;
  clientPhone: string;
  stage: WorkshopStage;
  garmentTitle: string;
  garmentSubtitle: string;
  fabricType: string;
  fabricColor: string;
  fabricNotes: string;
  referenceImages: string[];
  swatchImage?: string;
  measurements: ClientBodyMeasurements;
  depositPaid: number;
  totalAmount: number;
  assignedTailor: string;
  dueDate: string;
  createdAt: string;
  tasks?: OrderTaskItem[];
  stageHistory: {
    stage: WorkshopStage;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
  }[];
}

export interface StageTransitionResult {
  previousStage: WorkshopStage;
  newStage: WorkshopStage;
  smsSent: boolean;
  smsMessage?: string;
  order: BespokeJobOrder;
}
