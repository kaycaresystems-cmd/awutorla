export type GhanaNetwork =
  | 'mtn-gh'
  | 'vodafone-gh'
  | 'tigo-gh'
  | 'airtel-gh'
  | 'unknown';

export interface HubtelConfig {
  clientId: string;
  clientSecret: string;
  senderId: string;
}

export interface HubtelSMSRequest {
  From: string;
  To: string;
  Content: string;
  RegisteredDelivery?: boolean;
  ClientReference?: string;
}

export interface HubtelSMSResponse {
  status: number | string;
  messageId?: string;
  rate?: number;
  networkId?: string;
  clientReference?: string;
  raw?: unknown;
}
