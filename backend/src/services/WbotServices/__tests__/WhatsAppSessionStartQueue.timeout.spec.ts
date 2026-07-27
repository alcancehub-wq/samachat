jest.mock("../../../utils/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

describe("WhatsAppSessionStartQueue timeout recovery", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    process.env.WWEBJS_SESSION_START_TIMEOUT_MS = "15000";
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.WWEBJS_SESSION_START_TIMEOUT_MS;
  });

  it("releases the global queue after a stalled start times out", async () => {
    const { enqueueWhatsAppSessionStart } = require("../WhatsAppSessionStartQueue");

    const firstWhatsapp = { id: 35, name: "Larissa" } as any;
    const secondWhatsapp = { id: 36, name: "Bruna" } as any;

    const onTimeout = jest.fn().mockResolvedValue(undefined);
    const secondTask = jest.fn().mockResolvedValue(undefined);

    const firstStart = enqueueWhatsAppSessionStart(
      firstWhatsapp,
      {
        reason: "boot",
        sessionName: "Larissa",
        onTimeout
      },
      () => new Promise<void>(() => undefined)
    );

    const secondStart = enqueueWhatsAppSessionStart(
      secondWhatsapp,
      {
        reason: "boot",
        sessionName: "Bruna"
      },
      secondTask
    );

    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(15000);

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onTimeout).toHaveBeenCalledTimes(1);

    await firstStart;
    await secondStart;

    expect(secondTask).toHaveBeenCalledTimes(1);
  });

  it("releases the queue even when timeout cleanup never settles", async () => {
    const { enqueueWhatsAppSessionStart } = require("../WhatsAppSessionStartQueue");

    const firstWhatsapp = { id: 35, name: "Larissa" } as any;
    const secondWhatsapp = { id: 36, name: "Bruna" } as any;

    const secondTask = jest.fn().mockResolvedValue(undefined);

    const firstStart = enqueueWhatsAppSessionStart(
      firstWhatsapp,
      {
        reason: "boot",
        sessionName: "Larissa",
        onTimeout: () => new Promise<void>(() => undefined)
      },
      () => new Promise<void>(() => undefined)
    );

    const secondStart = enqueueWhatsAppSessionStart(
      secondWhatsapp,
      {
        reason: "boot",
        sessionName: "Bruna"
      },
      secondTask
    );

    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(15000);

    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(10000);

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    await firstStart;
    await secondStart;

    expect(secondTask).toHaveBeenCalledTimes(1);
  });
});