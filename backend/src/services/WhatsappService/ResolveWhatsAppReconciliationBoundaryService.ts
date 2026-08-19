export type WhatsAppReconciliationBoundaryMode =
  | "bootstrap"
  | "recovery";

export interface WhatsAppReconciliationBoundary {
  mode: WhatsAppReconciliationBoundaryMode;

  /*
   * Temporal lower bound for messages that do not obtain
   * continuity from a durable known Message.id.
   */
  lowerBoundAt: Date;

  /*
   * Captured BEFORE provider history collection starts.
   *
   * This exact instant may become the next durable checkpoint
   * only after the whole reconciliation succeeds.
   */
  checkpointCandidateAt: Date;
}

interface Request {
  existingCheckpointAt: Date | null;
  capturedBoundaryAt: Date;
}

const assertValidDate = (
  value: Date,
  errorCode: string
): void => {
  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new Error(errorCode);
  }
};

const cloneDate = (value: Date): Date =>
  new Date(value.getTime());

const ResolveWhatsAppReconciliationBoundaryService = ({
  existingCheckpointAt,
  capturedBoundaryAt
}: Request): WhatsAppReconciliationBoundary => {
  assertValidDate(
    capturedBoundaryAt,
    "ERR_INVALID_RECONCILIATION_CAPTURED_BOUNDARY"
  );

  if (existingCheckpointAt === null) {
    /*
     * First controlled cutover.
     *
     * There is no historical durable timestamp that safely says
     * when reconciliation stopped working. Therefore the system
     * MUST NOT silently turn first bootstrap into lifetime
     * backfill for chats without a known Message.id.
     *
     * Chats that obtain continuity from a known Message.id may
     * still recover older messages by identity. That decision is
     * made by the history collector/scanner, not here.
     */
    return {
      mode: "bootstrap",
      lowerBoundAt: cloneDate(capturedBoundaryAt),
      checkpointCandidateAt:
        cloneDate(capturedBoundaryAt)
    };
  }

  assertValidDate(
    existingCheckpointAt,
    "ERR_INVALID_RECONCILIATION_EXISTING_CHECKPOINT"
  );

  if (
    capturedBoundaryAt.getTime() <
    existingCheckpointAt.getTime()
  ) {
    /*
     * Fail closed on clock/boundary regression instead of
     * constructing an invalid temporal window.
     */
    throw new Error(
      "ERR_RECONCILIATION_BOUNDARY_BEFORE_CHECKPOINT"
    );
  }

  return {
    mode: "recovery",
    lowerBoundAt:
      cloneDate(existingCheckpointAt),
    checkpointCandidateAt:
      cloneDate(capturedBoundaryAt)
  };
};

export default ResolveWhatsAppReconciliationBoundaryService;