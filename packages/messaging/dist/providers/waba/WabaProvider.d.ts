import type { MessagingProvider } from '../../core/MessagingProvider';
import type { MessageResult, MessageStatus, SendMessageInput } from '../../core/types';
export declare class WabaProvider implements MessagingProvider {
    sendMessage(input: SendMessageInput): Promise<MessageResult>;
    handleWebhook(payload: unknown): Promise<void>;
    getMessageStatus(messageId: string): Promise<MessageStatus>;
}
//# sourceMappingURL=WabaProvider.d.ts.map