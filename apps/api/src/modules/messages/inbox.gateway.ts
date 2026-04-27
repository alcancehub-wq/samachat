import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

const allowedOrigins = [
  'https://samachat.com.br',
  'https://app.samachat.com.br',
];

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
})
export class InboxGateway {
  @WebSocketServer()
  server?: Server;

  emitConversationUpdated(payload: { conversation_id: string }) {
    this.server?.emit('conversation_updated', payload);
  }

  emitMessageReceived(payload: Record<string, unknown>) {
    this.server?.emit('message_received', payload);
  }

  emitMessageSent(payload: Record<string, unknown>) {
    this.server?.emit('message_sent', payload);
  }
}
