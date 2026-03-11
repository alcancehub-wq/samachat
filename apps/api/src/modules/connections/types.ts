export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  WAITING_QR = 'WAITING_QR',
}

export interface ConnectionSession {
  id: string;
  sessionId: string;
  phoneNumber?: string | null;
  status: ConnectionStatus;
  qrCode?: string | null;
  lastConnectedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
