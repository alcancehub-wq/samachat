export class MessagingError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code = 'MESSAGING_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
