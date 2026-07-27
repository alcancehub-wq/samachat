import { whatsappProvider } from "../../../providers/WhatsApp";
import { StartWhatsAppSession } from "../StartWhatsAppSession";
import { enqueueWhatsAppSessionStart } from "../WhatsAppSessionStartQueue";

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    isSessionReady: jest.fn(),
    isSessionActive: jest.fn(),
    removeSession: jest.fn(),
    init: jest.fn()
  }
}));

jest.mock("../WhatsAppSessionStartQueue", () => ({
  enqueueWhatsAppSessionStart: jest.fn(
    async (_whatsapp, _options, task: () => Promise<void>) => task()
  )
}));

jest.mock("../../../libs/socket", () => ({
  getIO: jest.fn(() => ({
    emit: jest.fn()
  }))
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

describe("StartWhatsAppSession recovery", () => {
  const isSessionReadyMock = whatsappProvider.isSessionReady as jest.Mock;
  const isSessionActiveMock = whatsappProvider.isSessionActive as jest.Mock;
  const removeSessionMock = whatsappProvider.removeSession as jest.Mock;
  const initMock = whatsappProvider.init as jest.Mock;
  const enqueueMock = enqueueWhatsAppSessionStart as jest.Mock;

  const whatsapp = {
    id: 35,
    name: "Larissa",
    status: "OPENING",
    update: jest.fn().mockResolvedValue(undefined)
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    isSessionReadyMock.mockReturnValue(false);
    removeSessionMock.mockResolvedValue(undefined);
    initMock.mockResolvedValue(undefined);
    whatsapp.update.mockResolvedValue(undefined);
  });

  it("keeps an active client during a normal duplicate start", async () => {
    isSessionActiveMock.mockReturnValue(true);

    await StartWhatsAppSession(whatsapp, { reason: "boot" });

    expect(removeSessionMock).not.toHaveBeenCalled();
    expect(initMock).not.toHaveBeenCalled();
  });

  it("does not restart a session that became ready while queued", async () => {
    isSessionReadyMock.mockReturnValue(true);
    isSessionActiveMock.mockReturnValue(true);

    await StartWhatsAppSession(whatsapp, {
      reason: "message_recovery",
      forceRestartActive: true
    });

    expect(removeSessionMock).not.toHaveBeenCalled();
    expect(initMock).not.toHaveBeenCalled();
  });

  it("restarts an active client during explicit recovery", async () => {
    isSessionActiveMock.mockReturnValue(true);

    await StartWhatsAppSession(whatsapp, {
      reason: "message_recovery",
      forceRestartActive: true
    });

    expect(removeSessionMock).toHaveBeenCalledWith(35);
    expect(whatsapp.update).toHaveBeenCalledWith({ status: "OPENING" });
    expect(initMock).toHaveBeenCalledWith(whatsapp);
  });

  it("registers timeout cleanup for the queued start", async () => {
    isSessionActiveMock.mockReturnValue(false);

    await StartWhatsAppSession(whatsapp, { reason: "boot" });

    expect(enqueueMock).toHaveBeenCalledWith(
      whatsapp,
      expect.objectContaining({
        reason: "boot",
        sessionName: "Larissa",
        onTimeout: expect.any(Function)
      }),
      expect.any(Function)
    );

    const options = enqueueMock.mock.calls[0][1];
    await options.onTimeout();

    expect(removeSessionMock).toHaveBeenCalledWith(35);
  });
});