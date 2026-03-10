import { randomUUID } from 'crypto';
import { getLogger } from '@samachat/logger';
import type { MessagingProvider } from '../../core/MessagingProvider';
import type { MessageResult, MessageStatus, SendMessageInput } from '../../core/types';

const logger = getLogger({ service: 'messaging', provider: 'qr' });

export class QrProvider implements MessagingProvider {
  async sendMessage(input: SendMessageInput): Promise<MessageResult> {
    const messageId = randomUUID();
    logger.info({ messageId, to: input.to }, 'QR provider stub send');

    return {
      messageId,
      status: 'queued',
      provider: 'qr',
      raw: { stub: true },
    };
  }

  async handleWebhook(payload: unknown): Promise<void> {
    logger.info({ payload }, 'QR provider webhook received');
  }

  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    logger.info({ messageId }, 'QR provider status requested');
    return 'sent';
  }
}
