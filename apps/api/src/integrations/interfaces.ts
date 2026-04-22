export interface WabaAdapter {
  sendMessage(payload: Record<string, unknown>): Promise<void>;
}

export interface OpenAIAdapter {
  createCompletion(payload: Record<string, unknown>): Promise<void>;
}

export interface TypebotAdapter {
  startFlow(payload: Record<string, unknown>): Promise<void>;
}

export interface WebhookAdapter {
  emitEvent(payload: Record<string, unknown>): Promise<void>;
}
