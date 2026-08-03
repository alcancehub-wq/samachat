type ReservationState = "pending" | "completed" | "cancelled";

interface OutboundEchoReservation {
  token: string;
  sessionId: number;
  state: ReservationState;
  messageId: string;
  createdAt: number;
  completedAt?: number;
  settle: Promise<void>;
  resolveSettle: () => void;
}

export interface OutboundEchoReservationHandle {
  token: string;
  complete: (messageId: string) => void;
  cancel: () => void;
}

const DEFAULT_WAIT_MS = 5000;
const DEFAULT_TTL_MS = 30000;

const reservationsBySession = new Map<
  number,
  Map<string, OutboundEchoReservation>
>();

let reservationSequence = 0;

const normalizeProviderMessageId = (value?: string): string => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const serializedMatch = trimmed.match(/^(?:true|false)_[^_]+_(.+)$/);
  return serializedMatch?.[1] || trimmed;
};

const getSessionReservations = (
  sessionId: number
): Map<string, OutboundEchoReservation> => {
  let reservations = reservationsBySession.get(sessionId);

  if (!reservations) {
    reservations = new Map<string, OutboundEchoReservation>();
    reservationsBySession.set(sessionId, reservations);
  }

  return reservations;
};

const cleanupSessionReservations = (
  sessionId: number,
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS
): void => {
  const reservations = reservationsBySession.get(sessionId);
  if (!reservations) {
    return;
  }

  for (const [token, reservation] of reservations.entries()) {
    const referenceTime = reservation.completedAt || reservation.createdAt;

    if (
      reservation.state === "cancelled" ||
      now - referenceTime > ttlMs
    ) {
      reservations.delete(token);
    }
  }

  if (reservations.size === 0) {
    reservationsBySession.delete(sessionId);
  }
};

export const reserveOutboundEcho = (
  sessionId: number
): OutboundEchoReservationHandle => {
  cleanupSessionReservations(sessionId);

  reservationSequence += 1;
  const token = `${sessionId}:${Date.now()}:${reservationSequence}`;

  let resolveSettle = (): void => undefined;
  const settle = new Promise<void>(resolve => {
    resolveSettle = resolve;
  });

  const reservation: OutboundEchoReservation = {
    token,
    sessionId,
    state: "pending",
    messageId: "",
    createdAt: Date.now(),
    settle,
    resolveSettle
  };

  getSessionReservations(sessionId).set(token, reservation);

  return {
    token,

    complete: (messageId: string): void => {
      const current = reservationsBySession.get(sessionId)?.get(token);

      if (!current || current.state !== "pending") {
        return;
      }

      current.messageId = normalizeProviderMessageId(messageId);
      current.state = "completed";
      current.completedAt = Date.now();
      current.resolveSettle();
    },

    cancel: (): void => {
      const current = reservationsBySession.get(sessionId)?.get(token);

      if (!current || current.state !== "pending") {
        return;
      }

      current.state = "cancelled";
      current.completedAt = Date.now();
      current.resolveSettle();
      cleanupSessionReservations(sessionId);
    }
  };
};

const waitForPendingReservations = async (
  reservations: OutboundEchoReservation[],
  waitMs: number
): Promise<void> => {
  const pendingSettles = reservations
    .filter(reservation => reservation.state === "pending")
    .map(reservation =>
      reservation.settle.then(
        () => undefined,
        () => undefined
      )
    );

  if (pendingSettles.length === 0) {
    return;
  }

  let timeout: any;

  try {
    await Promise.race([
      Promise.all(pendingSettles).then(() => undefined),
      new Promise<void>(resolve => {
        timeout = setTimeout(resolve, waitMs);
      })
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
};

export const shouldSuppressOutboundEcho = async (
  sessionId: number,
  eventMessageId: string,
  waitMs = DEFAULT_WAIT_MS
): Promise<boolean> => {
  const normalizedEventId = normalizeProviderMessageId(eventMessageId);

  if (!normalizedEventId) {
    return false;
  }

  cleanupSessionReservations(sessionId);

  const sessionReservations = reservationsBySession.get(sessionId);
  if (!sessionReservations || sessionReservations.size === 0) {
    return false;
  }

  const snapshot = Array.from(sessionReservations.values());

  await waitForPendingReservations(snapshot, waitMs);

  for (const reservation of snapshot) {
    if (
      reservation.state === "completed" &&
      reservation.messageId &&
      reservation.messageId === normalizedEventId
    ) {
      // Media sends can emit multiple lifecycle events with the same
      // provider message id, such as message_create and media_uploaded.
      // Preserve the completed reservation until TTL cleanup so every
      // echo for that same physical message is suppressed.
      return true;
    }
  }

  cleanupSessionReservations(sessionId);
  return false;
};

export const clearOutboundEchoReservationsForSession = (
  sessionId: number
): void => {
  const reservations = reservationsBySession.get(sessionId);

  if (reservations) {
    for (const reservation of reservations.values()) {
      if (reservation.state === "pending") {
        reservation.state = "cancelled";
        reservation.resolveSettle();
      }
    }
  }

  reservationsBySession.delete(sessionId);
};

export const __resetOutboundEchoGuardForTests = (): void => {
  for (const sessionId of reservationsBySession.keys()) {
    clearOutboundEchoReservationsForSession(sessionId);
  }

  reservationSequence = 0;
};
