import ResolveWhatsAppReconciliationBoundaryService from "../ResolveWhatsAppReconciliationBoundaryService";

describe(
  "ResolveWhatsAppReconciliationBoundaryService",
  () => {
    it(
      "establishes an explicit cutover when no durable checkpoint exists",
      () => {
        const capturedBoundaryAt =
          new Date("2026-08-13T21:00:00.000Z");

        const result =
          ResolveWhatsAppReconciliationBoundaryService({
            existingCheckpointAt: null,
            capturedBoundaryAt
          });

        expect(result).toEqual({
          mode: "bootstrap",
          lowerBoundAt:
            new Date(
              "2026-08-06T21:00:00.000Z"
            ),
          checkpointCandidateAt:
            capturedBoundaryAt
        });

        expect(result.lowerBoundAt)
          .not.toBe(capturedBoundaryAt);

        expect(result.checkpointCandidateAt)
          .not.toBe(capturedBoundaryAt);
      }
    );

    it(
      "uses the durable checkpoint as lower bound during recovery",
      () => {
        const existingCheckpointAt =
          new Date("2026-08-13T20:00:00.000Z");

        const capturedBoundaryAt =
          new Date("2026-08-13T21:00:00.000Z");

        const result =
          ResolveWhatsAppReconciliationBoundaryService({
            existingCheckpointAt,
            capturedBoundaryAt
          });

        expect(result.mode)
          .toBe("recovery");

        expect(result.lowerBoundAt)
          .toEqual(existingCheckpointAt);

        expect(result.checkpointCandidateAt)
          .toEqual(capturedBoundaryAt);

        expect(result.lowerBoundAt)
          .not.toBe(existingCheckpointAt);

        expect(result.checkpointCandidateAt)
          .not.toBe(capturedBoundaryAt);
      }
    );

    it(
      "does not advance the lower bound to the current run during recovery",
      () => {
        const checkpoint =
          new Date("2026-08-13T18:00:00.000Z");

        const captured =
          new Date("2026-08-13T21:00:00.000Z");

        const result =
          ResolveWhatsAppReconciliationBoundaryService({
            existingCheckpointAt: checkpoint,
            capturedBoundaryAt: captured
          });

        expect(result.lowerBoundAt.getTime())
          .toBe(checkpoint.getTime());

        expect(
          result.checkpointCandidateAt.getTime()
        ).toBe(captured.getTime());
      }
    );


    it(
      "clamps an old durable checkpoint to the seven-day floor",
      () => {
        const result =
          ResolveWhatsAppReconciliationBoundaryService({
            existingCheckpointAt:
              new Date(
                "2026-07-01T00:00:00.000Z"
              ),
            capturedBoundaryAt:
              new Date(
                "2026-08-13T21:00:00.000Z"
              )
          });

        expect(result.lowerBoundAt)
          .toEqual(
            new Date(
              "2026-08-06T21:00:00.000Z"
            )
          );
      }
    );
    it(
      "allows an equal captured boundary without moving time backwards",
      () => {
        const instant =
          new Date("2026-08-13T21:00:00.000Z");

        const result =
          ResolveWhatsAppReconciliationBoundaryService({
            existingCheckpointAt: instant,
            capturedBoundaryAt: instant
          });

        expect(result.mode)
          .toBe("recovery");

        expect(result.lowerBoundAt)
          .toEqual(instant);

        expect(result.checkpointCandidateAt)
          .toEqual(instant);
      }
    );

    it(
      "fails closed when the captured boundary precedes the durable checkpoint",
      () => {
        expect(() =>
          ResolveWhatsAppReconciliationBoundaryService({
            existingCheckpointAt:
              new Date("2026-08-13T21:00:00.000Z"),

            capturedBoundaryAt:
              new Date("2026-08-13T20:59:59.000Z")
          })
        ).toThrow(
          "ERR_RECONCILIATION_BOUNDARY_BEFORE_CHECKPOINT"
        );
      }
    );

    it(
      "rejects an invalid captured boundary",
      () => {
        expect(() =>
          ResolveWhatsAppReconciliationBoundaryService({
            existingCheckpointAt: null,
            capturedBoundaryAt:
              new Date("invalid")
          })
        ).toThrow(
          "ERR_INVALID_RECONCILIATION_CAPTURED_BOUNDARY"
        );
      }
    );

    it(
      "rejects an invalid existing durable checkpoint",
      () => {
        expect(() =>
          ResolveWhatsAppReconciliationBoundaryService({
            existingCheckpointAt:
              new Date("invalid"),

            capturedBoundaryAt:
              new Date("2026-08-13T21:00:00.000Z")
          })
        ).toThrow(
          "ERR_INVALID_RECONCILIATION_EXISTING_CHECKPOINT"
        );
      }
    );
  }
);