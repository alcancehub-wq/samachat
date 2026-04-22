import { randomUUID } from 'crypto';
import { getLogger } from '@samachat/logger';
import type { MessagingProvider } from '../../core/MessagingProvider';
import type { MessageResult, MessageStatus, SendMessageInput } from '../../core/types';

const logger = getLogger({ service: 'messaging', provider: 'waba' });

export class WabaProvider implements MessagingProvider {
  async sendMessage(input: SendMessageInput): Promise<MessageResult> {
    const messageId = randomUUID();
    logger.info({ messageId, to: input.to }, 'WABA provider stub send');

    return {
      messageId,
      status: 'queued',
      provider: 'waba',
      raw: { stub: true },
    };
  }

  async handleWebhook(payload: unknown): Promise<void> {
    logger.info({ payload }, 'WABA provider webhook received');
  }

  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    logger.info({ messageId }, 'WABA provider status requested');
    return 'sent';
  }
}
