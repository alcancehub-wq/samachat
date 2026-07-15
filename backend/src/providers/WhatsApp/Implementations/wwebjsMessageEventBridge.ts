type ProcessingFunction = () => Promise<void>;

export interface WwebjsOutgoingEventState {
  fingerprint: string;
  eventProcessed: boolean;
  syntheticPersisted: boolean;
  processingPromise?: Promise<void>;
  expiresAt: number;
}

interface ProcessEventRequest {
  sessionId: number;
  eventId?: string;
  fromMe: boolean;
  from?: string;
  to?: string;
  body?: string;
  timestamp?: number;
  process: ProcessingFunction;
}

const delay = (milliseconds: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

export const buildWwebjsOutgoingFingerprint = (
  sessionId: number,
  to: string,
  body: string
): string => `${sessionId}|${to}|${body}`;

export const buildWwebjsMessageEventKey = ({
  sessionId,
  eventId,
  fromMe,
  from,
  to,
  body,
  timestamp
}: Omit<ProcessEventRequest, "process">): string => {
  if (eventId) {
    return `${sessionId}|${eventId}`;
  }

  return [
    sessionId,
    fromMe ? "1" : "0",
    from || "",
    to || "",
    timestamp || 0,
    body || ""
  ].join("|");
};

class WwebjsMessageEventBridge {
  private readonly processedEvents = new Map<string, number>();

  private readonly outgoingStates = new Map<
    string,
    WwebjsOutgoingEventState
  >();

  private readonly ttlMs: number;

  constructor(ttlMs = 30000) {
    this.ttlMs = ttlMs;
  }

  private cleanup(): void {
    const now = Date.now();

    this.processedEvents.forEach((expiresAt, key) => {
      if (expiresAt <= now) {
        this.processedEvents.delete(key);
      }
    });

    this.outgoingStates.forEach((state, key) => {
      if (state.expiresAt <= now) {
        this.outgoingStates.delete(key);
      }
    });
  }

  beginOutgoing(
    sessionId: number,
    to: string,
    body: string
  ): WwebjsOutgoingEventState {
    this.cleanup();

    const fingerprint = buildWwebjsOutgoingFingerprint(
      sessionId,
      to,
      body
    );

    const state: WwebjsOutgoingEventState = {
      fingerprint,
      eventProcessed: false,
      syntheticPersisted: false,
      expiresAt: Date.now() + this.ttlMs
    };

    this.outgoingStates.set(fingerprint, state);

    return state;
  }

  finishOutgoing(state: WwebjsOutgoingEventState): void {
    state.expiresAt = Date.now() + this.ttlMs;
    this.outgoingStates.set(state.fingerprint, state);
  }

  failOutgoing(state: WwebjsOutgoingEventState): void {
    this.outgoingStates.delete(state.fingerprint);
  }

  async processEvent(
    request: ProcessEventRequest
  ): Promise<"processed" | "duplicate" | "suppressed"> {
    this.cleanup();

    const eventKey = buildWwebjsMessageEventKey(request);

    if (this.processedEvents.has(eventKey)) {
      return "duplicate";
    }

    const outgoingState = request.fromMe
      ? this.outgoingStates.get(
          buildWwebjsOutgoingFingerprint(
            request.sessionId,
            request.to || "",
            request.body || ""
          )
        )
      : undefined;

    if (outgoingState?.syntheticPersisted) {
      this.processedEvents.set(
        eventKey,
        Date.now() + this.ttlMs
      );

      return "suppressed";
    }

    this.processedEvents.set(
      eventKey,
      Date.now() + this.ttlMs
    );

    const processingPromise = request.process();

    if (outgoingState) {
      outgoingState.processingPromise = processingPromise;
    }

    try {
      await processingPromise;

      if (outgoingState) {
        outgoingState.eventProcessed = true;
        outgoingState.processingPromise = undefined;
      }

      return "processed";
    } catch (error) {
      this.processedEvents.delete(eventKey);

      if (outgoingState) {
        outgoingState.processingPromise = undefined;
      }

      throw error;
    }
  }

  async shouldPersistSynthetic(
    state: WwebjsOutgoingEventState,
    graceMs = 750
  ): Promise<boolean> {
    if (!state.processingPromise) {
      await delay(graceMs);
    }

    if (state.processingPromise) {
      try {
        await state.processingPromise;
      } catch {
        // O fallback sintetico sera usado abaixo.
      }
    }

    if (state.eventProcessed) {
      return false;
    }

    state.syntheticPersisted = true;
    state.expiresAt = Date.now() + this.ttlMs;

    return true;
  }
}

export default WwebjsMessageEventBridge;
