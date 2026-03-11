import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import type { ConnectionStatus } from './types';

interface QrEvent {
  sessionId: string;
  qrCode: string;
}

interface StatusEvent {
  sessionId: string;
  status: ConnectionStatus;
}

@Injectable()
export class ConnectionGateway {
  private readonly emitter = new EventEmitter();

  onQr(listener: (event: QrEvent) => void) {
    this.emitter.on('qr', listener);
  }

  onStatus(listener: (event: StatusEvent) => void) {
    this.emitter.on('status', listener);
  }

  emitQr(event: QrEvent) {
    this.emitter.emit('qr', event);
  }

  emitStatus(event: StatusEvent) {
    this.emitter.emit('status', event);
  }
}
