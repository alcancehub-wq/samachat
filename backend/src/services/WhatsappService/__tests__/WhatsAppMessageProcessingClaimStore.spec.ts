const redisMock = {
  status: "ready",
  set: jest.fn(),
  eval: jest.fn()
};

jest.mock(
  "../../../libs/redisStore",
  () => ({
    getRedisClient:
      jest.fn(() => redisMock)
  })
);

import {
  getRedisClient
} from "../../../libs/redisStore";

import {
  acquireWhatsAppMessageProcessingClaim,
  releaseWhatsAppMessageProcessingClaim,
  renewWhatsAppMessageProcessingClaim,
  runWithWhatsAppMessageProcessingClaimGuard,
  startWhatsAppMessageProcessingClaimHeartbeat,
  WhatsAppMessageProcessingClaimBlockedError,
  WhatsAppMessageProcessingClaimLostError,
  WHATSAPP_MESSAGE_PROCESSING_CLAIM_HEARTBEAT_MS,
  WHATSAPP_MESSAGE_PROCESSING_CLAIM_TTL_MS
} from "../WhatsAppMessageProcessingClaimStore";

const getRedisClientMock =
  getRedisClient as jest.Mock;

describe(
  "WhatsAppMessageProcessingClaimStore",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      redisMock.status = "ready";

      getRedisClientMock.mockReturnValue(
        redisMock
      );
    });

    it(
      "acquires a distributed message claim using NX and PX",
      async () => {
        redisMock.set.mockResolvedValue("OK");

        const claim =
          await acquireWhatsAppMessageProcessingClaim(
            101,
            "provider-message-id"
          );

        expect(claim).toEqual(
          expect.objectContaining({
            whatsappId: 101,
            messageId:
              "provider-message-id",
            token: expect.any(String)
          })
        );

        expect(
          redisMock.set
        ).toHaveBeenCalledTimes(1);

        const [
          key,
          token,
          px,
          ttl,
          nx
        ] = redisMock.set.mock.calls[0];

        expect(key).toContain(
          "samachat:whatsapp-message-processing:claim:101:"
        );

        expect(key).not.toContain(
          "provider-message-id"
        );

        expect(token).toEqual(
          expect.any(String)
        );

        expect(px).toBe("PX");

        expect(ttl).toBe(
          WHATSAPP_MESSAGE_PROCESSING_CLAIM_TTL_MS
        );

        expect(nx).toBe("NX");
      }
    );

    it(
      "returns null when another process already owns the same claim",
      async () => {
        redisMock.set.mockResolvedValue(null);

        await expect(
          acquireWhatsAppMessageProcessingClaim(
            101,
            "provider-message-id"
          )
        ).resolves.toBeNull();
      }
    );

    it(
      "uses different keys for different message identities",
      async () => {
        redisMock.set.mockResolvedValue("OK");

        await acquireWhatsAppMessageProcessingClaim(
          101,
          "message-a"
        );

        await acquireWhatsAppMessageProcessingClaim(
          101,
          "message-b"
        );

        const firstKey =
          redisMock.set.mock.calls[0][0];

        const secondKey =
          redisMock.set.mock.calls[1][0];

        expect(firstKey).not.toBe(secondKey);
      }
    );

    it(
      "uses different keys for the same message identity in different sessions",
      async () => {
        redisMock.set.mockResolvedValue("OK");

        await acquireWhatsAppMessageProcessingClaim(
          101,
          "same-message"
        );

        await acquireWhatsAppMessageProcessingClaim(
          102,
          "same-message"
        );

        const firstKey =
          redisMock.set.mock.calls[0][0];

        const secondKey =
          redisMock.set.mock.calls[1][0];

        expect(firstKey).not.toBe(secondKey);
      }
    );

    it(
      "renews only through token-aware Lua",
      async () => {
        redisMock.eval.mockResolvedValue(1);

        const claim = {
          whatsappId: 101,
          messageId:
            "provider-message-id",
          token: "owner-token"
        };

        await expect(
          renewWhatsAppMessageProcessingClaim(
            claim
          )
        ).resolves.toBe(true);

        expect(
          redisMock.eval
        ).toHaveBeenCalledTimes(1);

        const call =
          redisMock.eval.mock.calls[0];

        expect(call[1]).toBe(1);
        expect(call[3]).toBe(
          "owner-token"
        );
        expect(call[4]).toBe(
          String(
            WHATSAPP_MESSAGE_PROCESSING_CLAIM_TTL_MS
          )
        );
      }
    );

    it(
      "reports lost ownership when renew script returns zero",
      async () => {
        redisMock.eval.mockResolvedValue(0);

        await expect(
          renewWhatsAppMessageProcessingClaim({
            whatsappId: 101,
            messageId:
              "provider-message-id",
            token: "stale-token"
          })
        ).resolves.toBe(false);
      }
    );

    it(
      "releases only through token-aware Lua",
      async () => {
        redisMock.eval.mockResolvedValue(1);

        await releaseWhatsAppMessageProcessingClaim({
          whatsappId: 101,
          messageId:
            "provider-message-id",
          token: "owner-token"
        });

        expect(
          redisMock.eval
        ).toHaveBeenCalledTimes(1);

        const call =
          redisMock.eval.mock.calls[0];

        expect(call[1]).toBe(1);
        expect(call[3]).toBe(
          "owner-token"
        );
      }
    );

    it.each([
      0,
      -1,
      1.5,
      Number.NaN
    ])(
      "rejects invalid whatsappId %p",
      async whatsappId => {
        await expect(
          acquireWhatsAppMessageProcessingClaim(
            whatsappId,
            "provider-message-id"
          )
        ).rejects.toThrow(
          "ERR_INVALID_WHATSAPP_ID"
        );

        expect(
          redisMock.set
        ).not.toHaveBeenCalled();
      }
    );

    it.each([
      "",
      "   "
    ])(
      "rejects invalid message id %p",
      async messageId => {
        await expect(
          acquireWhatsAppMessageProcessingClaim(
            101,
            messageId
          )
        ).rejects.toThrow(
          "ERR_INVALID_WHATSAPP_MESSAGE_ID"
        );

        expect(
          redisMock.set
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when Redis is unavailable",
      async () => {
        getRedisClientMock.mockReturnValue(
          null
        );

        await expect(
          acquireWhatsAppMessageProcessingClaim(
            101,
            "provider-message-id"
          )
        ).rejects.toThrow(
          "ERR_WHATSAPP_MESSAGE_PROCESSING_CLAIM_UNAVAILABLE"
        );
      }
    );

    it(
      "fails closed while Redis is not ready",
      async () => {
        redisMock.status = "connecting";

        await expect(
          acquireWhatsAppMessageProcessingClaim(
            101,
            "provider-message-id"
          )
        ).rejects.toThrow(
          "ERR_WHATSAPP_MESSAGE_PROCESSING_CLAIM_UNAVAILABLE"
        );
      }
    );
  }
);
describe(
  "WhatsAppMessageProcessingClaimStore heartbeat",
  () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(
      "uses a heartbeat safely below the claim TTL",
      () => {
        expect(
          WHATSAPP_MESSAGE_PROCESSING_CLAIM_HEARTBEAT_MS
        ).toBe(20 * 1000);

        expect(
          WHATSAPP_MESSAGE_PROCESSING_CLAIM_HEARTBEAT_MS
        ).toBeLessThan(
          WHATSAPP_MESSAGE_PROCESSING_CLAIM_TTL_MS
        );
      }
    );

    it(
      "renews ownership on each heartbeat tick",
      async () => {
        redisMock.status = "ready";
        redisMock.eval.mockResolvedValue(1);

        let tick:
          | (() => void)
          | undefined;

        const timerHandle = {} as ReturnType<
          typeof setInterval
        >;

        const setIntervalSpy =
          jest.spyOn(
            global,
            "setInterval"
          ).mockImplementation(
            ((callback: () => void) => {
              tick = callback;
              return timerHandle;
            }) as typeof setInterval
          );

        const clearIntervalSpy =
          jest.spyOn(
            global,
            "clearInterval"
          ).mockImplementation(
            (() => undefined) as typeof clearInterval
          );

        const onClaimLost = jest.fn();

        const claim = {
          whatsappId: 101,
          messageId:
            "provider-message-id",
          token: "owner-token"
        };

        const stop =
          startWhatsAppMessageProcessingClaimHeartbeat(
            claim,
            onClaimLost
          );

        expect(
          setIntervalSpy
        ).toHaveBeenCalledWith(
          expect.any(Function),
          WHATSAPP_MESSAGE_PROCESSING_CLAIM_HEARTBEAT_MS
        );

        expect(tick).toEqual(
          expect.any(Function)
        );

        tick?.();

        await new Promise<void>(
          resolve => setImmediate(resolve)
        );

        expect(
          redisMock.eval
        ).toHaveBeenCalledTimes(1);

        expect(
          onClaimLost
        ).not.toHaveBeenCalled();

        stop();

        expect(
          clearIntervalSpy
        ).toHaveBeenCalledWith(
          timerHandle
        );
      }
    );

    it(
      "fails closed when heartbeat loses claim ownership",
      async () => {
        redisMock.status = "ready";
        redisMock.eval.mockResolvedValue(0);

        let tick:
          | (() => void)
          | undefined;

        const timerHandle = {} as ReturnType<
          typeof setInterval
        >;

        jest.spyOn(
          global,
          "setInterval"
        ).mockImplementation(
          ((callback: () => void) => {
            tick = callback;
            return timerHandle;
          }) as typeof setInterval
        );

        const clearIntervalSpy =
          jest.spyOn(
            global,
            "clearInterval"
          ).mockImplementation(
            (() => undefined) as typeof clearInterval
          );

        const onClaimLost = jest.fn();

        startWhatsAppMessageProcessingClaimHeartbeat(
          {
            whatsappId: 101,
            messageId:
              "provider-message-id",
            token: "owner-token"
          },
          onClaimLost
        );

        tick?.();

        await new Promise<void>(
          resolve => setImmediate(resolve)
        );

        expect(
          onClaimLost
        ).toHaveBeenCalledTimes(1);

        expect(
          clearIntervalSpy
        ).toHaveBeenCalledWith(
          timerHandle
        );
      }
    );

    it(
      "fails closed when heartbeat renewal throws",
      async () => {
        redisMock.status = "ready";

        redisMock.eval.mockRejectedValue(
          new Error("redis renewal failure")
        );

        let tick:
          | (() => void)
          | undefined;

        const timerHandle = {} as ReturnType<
          typeof setInterval
        >;

        jest.spyOn(
          global,
          "setInterval"
        ).mockImplementation(
          ((callback: () => void) => {
            tick = callback;
            return timerHandle;
          }) as typeof setInterval
        );

        jest.spyOn(
          global,
          "clearInterval"
        ).mockImplementation(
          (() => undefined) as typeof clearInterval
        );

        const onClaimLost = jest.fn();

        startWhatsAppMessageProcessingClaimHeartbeat(
          {
            whatsappId: 101,
            messageId:
              "provider-message-id",
            token: "owner-token"
          },
          onClaimLost
        );

        tick?.();

        await new Promise<void>(
          resolve => setImmediate(resolve)
        );

        expect(
          onClaimLost
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "does not report ownership loss after heartbeat was stopped",
      async () => {
        redisMock.status = "ready";

        let resolveRenew:
          | ((value: number) => void)
          | undefined;

        redisMock.eval.mockImplementation(
          () =>
            new Promise<number>(resolve => {
              resolveRenew = resolve;
            })
        );

        let tick:
          | (() => void)
          | undefined;

        const timerHandle = {} as ReturnType<
          typeof setInterval
        >;

        jest.spyOn(
          global,
          "setInterval"
        ).mockImplementation(
          ((callback: () => void) => {
            tick = callback;
            return timerHandle;
          }) as typeof setInterval
        );

        jest.spyOn(
          global,
          "clearInterval"
        ).mockImplementation(
          (() => undefined) as typeof clearInterval
        );

        const onClaimLost = jest.fn();

        const stop =
          startWhatsAppMessageProcessingClaimHeartbeat(
            {
              whatsappId: 101,
              messageId:
                "provider-message-id",
              token: "owner-token"
            },
            onClaimLost
          );

        tick?.();

        stop();

        resolveRenew?.(0);

        await new Promise<void>(
          resolve => setImmediate(resolve)
        );

        expect(
          onClaimLost
        ).not.toHaveBeenCalled();
      }
    );
  }
);
describe(
  "WhatsAppMessageProcessingClaimStore shared guard",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      redisMock.status = "ready";
      redisMock.set.mockResolvedValue("OK");
      redisMock.eval.mockResolvedValue(1);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(
      "does not execute the task when another process owns the claim",
      async () => {
        redisMock.set.mockResolvedValue(null);

        const task = jest.fn(
          async () => "should-not-run"
        );

        await expect(
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-1",
            task
          })
        ).rejects.toBeInstanceOf(
          WhatsAppMessageProcessingClaimBlockedError
        );

        expect(task).not.toHaveBeenCalled();
      }
    );

    it(
      "executes the task once after acquiring ownership",
      async () => {
        const task = jest.fn(
          async () => "done"
        );

        await expect(
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-2",
            task
          })
        ).resolves.toBe("done");

        expect(task).toHaveBeenCalledTimes(1);

        expect(
          redisMock.set
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "starts the heartbeat only after ownership is acquired",
      async () => {
        const setIntervalSpy =
          jest.spyOn(
            global,
            "setInterval"
          ).mockImplementation(
            (() =>
              ({} as ReturnType<typeof setInterval>)) as unknown as typeof setInterval
          );

        jest.spyOn(
          global,
          "clearInterval"
        ).mockImplementation(
          (() => undefined) as typeof clearInterval
        );

        const task = jest.fn(
          async () => "done"
        );

        await runWithWhatsAppMessageProcessingClaimGuard({
          whatsappId: 101,
          messageId: "message-3",
          task
        });

        expect(redisMock.set).toHaveBeenCalled();

        expect(
          setIntervalSpy
        ).toHaveBeenCalledWith(
          expect.any(Function),
          WHATSAPP_MESSAGE_PROCESSING_CLAIM_HEARTBEAT_MS
        );
      }
    );

    it(
      "stops the heartbeat and releases ownership after task success",
      async () => {
        const timerHandle =
          {} as ReturnType<typeof setInterval>;

        jest.spyOn(
          global,
          "setInterval"
        ).mockImplementation(
          (() => timerHandle) as unknown as typeof setInterval
        );

        const clearIntervalSpy =
          jest.spyOn(
            global,
            "clearInterval"
          ).mockImplementation(
          (() => undefined) as typeof clearInterval
        );

        await expect(
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-4",
            task: async () => "success"
          })
        ).resolves.toBe("success");

        expect(
          clearIntervalSpy
        ).toHaveBeenCalledWith(
          timerHandle
        );

        // Release is the only Redis eval because no heartbeat
        // tick was fired in this test.
        expect(
          redisMock.eval
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "stops the heartbeat and releases ownership when task throws",
      async () => {
        const timerHandle =
          {} as ReturnType<typeof setInterval>;

        jest.spyOn(
          global,
          "setInterval"
        ).mockImplementation(
          (() => timerHandle) as unknown as typeof setInterval
        );

        const clearIntervalSpy =
          jest.spyOn(
            global,
            "clearInterval"
          ).mockImplementation(
            (() => undefined) as typeof clearInterval
          );

        const taskError =
          new Error("task failure");

        await expect(
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-5",
            task: async () => {
              throw taskError;
            }
          })
        ).rejects.toBe(taskError);

        expect(
          clearIntervalSpy
        ).toHaveBeenCalledWith(
          timerHandle
        );

        expect(
          redisMock.eval
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "fails closed and aborts the signal when heartbeat loses ownership",
      async () => {
        let heartbeatTick:
          | (() => void)
          | undefined;

        jest.spyOn(
          global,
          "setInterval"
        ).mockImplementation(
          ((callback: () => void) => {
            heartbeatTick = callback;

            return {} as ReturnType<
              typeof setInterval
            >;
          }) as typeof setInterval
        );

        jest.spyOn(
          global,
          "clearInterval"
        ).mockImplementation(
          (() => undefined) as typeof clearInterval
        );

        redisMock.eval.mockResolvedValue(0);

        let receivedSignal:
          | {
              readonly aborted: boolean;
              throwIfAborted: () => void;
            }
          | undefined;

        const taskStarted =
          new Promise<void>(resolve => {
            receivedSignal = undefined;
            resolve();
          });

        const guardPromise =
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-6",
            task: async signal => {
              receivedSignal = signal;

              await taskStarted;

              return new Promise<string>(
                () => undefined
              );
            }
          });

        await new Promise<void>(
          resolve => setImmediate(resolve)
        );

        expect(heartbeatTick).toEqual(
          expect.any(Function)
        );

        heartbeatTick?.();

        await expect(
          guardPromise
        ).rejects.toBeInstanceOf(
          WhatsAppMessageProcessingClaimLostError
        );

        expect(
          receivedSignal?.aborted
        ).toBe(true);

        expect(
          () => receivedSignal?.throwIfAborted()
        ).toThrow(
          WhatsAppMessageProcessingClaimLostError
        );
      }
    );

    it(
      "fails closed when heartbeat renewal throws",
      async () => {
        let heartbeatTick:
          | (() => void)
          | undefined;

        jest.spyOn(
          global,
          "setInterval"
        ).mockImplementation(
          ((callback: () => void) => {
            heartbeatTick = callback;

            return {} as ReturnType<
              typeof setInterval
            >;
          }) as typeof setInterval
        );

        jest.spyOn(
          global,
          "clearInterval"
        ).mockImplementation(
          (() => undefined) as typeof clearInterval
        );

        redisMock.eval.mockRejectedValue(
          new Error("redis heartbeat failure")
        );

        const guardPromise =
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-7",
            task: async () =>
              new Promise<string>(
                () => undefined
              )
          });

        await new Promise<void>(
          resolve => setImmediate(resolve)
        );

        heartbeatTick?.();

        await expect(
          guardPromise
        ).rejects.toBeInstanceOf(
          WhatsAppMessageProcessingClaimLostError
        );
      }
    );

    it(
      "does not mask task success when final release fails",
      async () => {
        redisMock.eval.mockRejectedValueOnce(
          new Error("release failure")
        );

        await expect(
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-8",
            task: async () => "success"
          })
        ).resolves.toBe("success");
      }
    );

    it(
      "does not replace the original task error when final release fails",
      async () => {
        redisMock.eval.mockRejectedValueOnce(
          new Error("release failure")
        );

        const taskError =
          new Error("original task failure");

        await expect(
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-9",
            task: async () => {
              throw taskError;
            }
          })
        ).rejects.toBe(taskError);
      }
    );

    it(
      "does not return task success after ownership was lost",
      async () => {
        let heartbeatTick:
          | (() => void)
          | undefined;

        jest.spyOn(
          global,
          "setInterval"
        ).mockImplementation(
          ((callback: () => void) => {
            heartbeatTick = callback;

            return {} as ReturnType<
              typeof setInterval
            >;
          }) as typeof setInterval
        );

        jest.spyOn(
          global,
          "clearInterval"
        ).mockImplementation(
          (() => undefined) as typeof clearInterval
        );

        redisMock.eval.mockResolvedValue(0);

        let resolveTask:
          | ((value: string) => void)
          | undefined;

        const guardPromise =
          runWithWhatsAppMessageProcessingClaimGuard({
            whatsappId: 101,
            messageId: "message-10",
            task: async () =>
              new Promise<string>(resolve => {
                resolveTask = resolve;
              })
          });

        await new Promise<void>(
          resolve => setImmediate(resolve)
        );

        heartbeatTick?.();

        await expect(
          guardPromise
        ).rejects.toBeInstanceOf(
          WhatsAppMessageProcessingClaimLostError
        );

        resolveTask?.("late-success");

        await new Promise<void>(
          resolve => setImmediate(resolve)
        );
      }
    );
  }
);
