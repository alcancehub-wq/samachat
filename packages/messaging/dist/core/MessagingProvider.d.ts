import type { MessageResult, MessageStatus, SendMessageInput } from './types';
export interface MessagingProvider {
    sendMessage(input: SendMessageInput): Promise<MessageResult>;
    handleWebhook(payload: unknown): Promise<void>;
    getMessageStatus(messageId: string): Promise<MessageStatus>;
}
//# sourceMappingURL=MessagingProvider.d.ts.map