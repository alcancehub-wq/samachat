import { Op } from "sequelize";

const findOneMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();

jest.mock(
  "../../../models/WhatsappReconciliationCheckpoint",
  () => ({
    __esModule: true,
    default: {
      findOne: (...args: any[]) =>
        findOneMock(...args),

      create: (...args: any[]) =>
        createMock(...args),

      update: (...args: any[]) =>
        updateMock(...args)
    }
  })
);

import {
  getWhatsappReconciliationCheckpoint,
  saveWhatsappReconciliationCheckpoint
} from "../WhatsappReconciliationCheckpointService";

describe("WhatsappReconciliationCheckpointService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no durable checkpoint exists", async () => {
    findOneMock.mockResolvedValue(null);

    await expect(
      getWhatsappReconciliationCheckpoint({
        whatsappId: 101
      })
    ).resolves.toBeNull();

    expect(findOneMock).toHaveBeenCalledWith({
      where: {
        whatsappId: 101
      }
    });
  });

  it("creates the first durable checkpoint", async () => {
    const checkpointAt =
      new Date("2026-08-12T12:00:00.000Z");

    findOneMock.mockResolvedValue(null);

    createMock.mockResolvedValue({
      checkpointAt
    });

    await expect(
      saveWhatsappReconciliationCheckpoint({
        whatsappId: 101,
        checkpointAt
      })
    ).resolves.toEqual(checkpointAt);

    expect(createMock).toHaveBeenCalledWith({
      whatsappId: 101,
      checkpointAt
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("uses an atomic conditional update for an existing checkpoint", async () => {
    const current =
      new Date("2026-08-12T12:00:00.000Z");

    const newer =
      new Date("2026-08-12T13:00:00.000Z");

    findOneMock
      .mockResolvedValueOnce({
        checkpointAt: current
      })
      .mockResolvedValueOnce({
        checkpointAt: newer
      });

    updateMock.mockResolvedValue([1]);

    await expect(
      saveWhatsappReconciliationCheckpoint({
        whatsappId: 101,
        checkpointAt: newer
      })
    ).resolves.toEqual(newer);

    expect(updateMock).toHaveBeenCalledWith(
      {
        checkpointAt: newer
      },
      {
        where: {
          whatsappId: 101,
          checkpointAt: {
            [Op.lt]: newer
          }
        }
      }
    );
  });

  it("returns the newer persisted checkpoint when an older concurrent write loses the condition", async () => {
    const persistedNewer =
      new Date("2026-08-12T14:00:00.000Z");

    const attemptedOlder =
      new Date("2026-08-12T13:00:00.000Z");

    findOneMock
      .mockResolvedValueOnce({
        checkpointAt: persistedNewer
      })
      .mockResolvedValueOnce({
        checkpointAt: persistedNewer
      });

    updateMock.mockResolvedValue([0]);

    await expect(
      saveWhatsappReconciliationCheckpoint({
        whatsappId: 101,
        checkpointAt: attemptedOlder
      })
    ).resolves.toEqual(persistedNewer);

    expect(updateMock).toHaveBeenCalledWith(
      {
        checkpointAt: attemptedOlder
      },
      {
        where: {
          whatsappId: 101,
          checkpointAt: {
            [Op.lt]: attemptedOlder
          }
        }
      }
    );
  });

  it("recovers from a concurrent first-row create and then applies the monotonic update", async () => {
    const lower =
      new Date("2026-08-12T12:00:00.000Z");

    const higher =
      new Date("2026-08-12T13:00:00.000Z");

    findOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        checkpointAt: higher
      });

    createMock.mockRejectedValue({
      name: "SequelizeUniqueConstraintError"
    });

    updateMock.mockResolvedValue([1]);

    await expect(
      saveWhatsappReconciliationCheckpoint({
        whatsappId: 101,
        checkpointAt: higher
      })
    ).resolves.toEqual(higher);

    expect(createMock).toHaveBeenCalledWith({
      whatsappId: 101,
      checkpointAt: higher
    });

    expect(updateMock).toHaveBeenCalledWith(
      {
        checkpointAt: higher
      },
      {
        where: {
          whatsappId: 101,
          checkpointAt: {
            [Op.lt]: higher
          }
        }
      }
    );
  });

  it("does not swallow non-unique create errors", async () => {
    const checkpointAt =
      new Date("2026-08-12T12:00:00.000Z");

    const persistenceError =
      new Error("database unavailable");

    findOneMock.mockResolvedValue(null);
    createMock.mockRejectedValue(persistenceError);

    await expect(
      saveWhatsappReconciliationCheckpoint({
        whatsappId: 101,
        checkpointAt
      })
    ).rejects.toBe(persistenceError);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("fails closed if persistence disappears after an update attempt", async () => {
    const checkpointAt =
      new Date("2026-08-12T13:00:00.000Z");

    findOneMock
      .mockResolvedValueOnce({
        checkpointAt:
          new Date("2026-08-12T12:00:00.000Z")
      })
      .mockResolvedValueOnce(null);

    updateMock.mockResolvedValue([1]);

    await expect(
      saveWhatsappReconciliationCheckpoint({
        whatsappId: 101,
        checkpointAt
      })
    ).rejects.toThrow(
      "ERR_RECONCILIATION_CHECKPOINT_PERSISTENCE_INCONSISTENT"
    );
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN
  ])(
    "rejects invalid whatsappId %p before persistence",
    async whatsappId => {
      await expect(
        getWhatsappReconciliationCheckpoint({
          whatsappId
        })
      ).rejects.toThrow(
        "ERR_INVALID_WHATSAPP_ID"
      );

      expect(findOneMock).not.toHaveBeenCalled();
    }
  );

  it("rejects invalid checkpoint date before persistence", async () => {
    const invalidDate =
      new Date("invalid-checkpoint");

    await expect(
      saveWhatsappReconciliationCheckpoint({
        whatsappId: 101,
        checkpointAt: invalidDate
      })
    ).rejects.toThrow(
      "ERR_INVALID_RECONCILIATION_CHECKPOINT"
    );

    expect(findOneMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});