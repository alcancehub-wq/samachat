import AppError from "../../../errors/AppError";
import ResolveWhatsAppContext from "../../../helpers/ResolveWhatsAppContext";
import { whatsappProvider } from "../../../providers/WhatsApp";
import CheckNumber from "../../../services/WbotServices/CheckNumber";

jest.mock("../../../helpers/ResolveWhatsAppContext", () => jest.fn());

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    checkNumber: jest.fn()
  }
}));

describe("CheckNumber", () => {
  const resolveWhatsAppContextMock = ResolveWhatsAppContext as jest.Mock;
  const checkNumberMock = whatsappProvider.checkNumber as jest.Mock;
  const whatsappProviderMock = whatsappProvider as typeof whatsappProvider & {
    checkNumberLookup?: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resolveWhatsAppContextMock.mockResolvedValue({ id: 35 });
    delete whatsappProviderMock.checkNumberLookup;
  });

  it("returns the provider-confirmed number when the session is ready", async () => {
    whatsappProviderMock.checkNumberLookup = jest.fn().mockResolvedValue({
      number: "5511959207315",
      chatId: "179473865519257@lid",
      jid: "179473865519257@lid",
      lid: "179473865519257@lid",
      serializedId: "179473865519257@lid"
    });

    await expect(CheckNumber("11959207315", { userId: 16 })).resolves.toBe(
      "5511959207315"
    );

    expect(whatsappProviderMock.checkNumberLookup).toHaveBeenCalledWith(
      35,
      "11959207315"
    );
    expect(checkNumberMock).not.toHaveBeenCalled();
  });

  it("exposes the rich lookup result for the send fallback without breaking the string contract", async () => {
    whatsappProviderMock.checkNumberLookup = jest.fn().mockResolvedValue({
      number: "5511959207315",
      chatId: "179473865519257@lid",
      jid: "179473865519257@lid",
      lid: "179473865519257@lid",
      serializedId: "179473865519257@lid"
    });

    await expect(
      CheckNumber("11959207315", { userId: 16, returnLookupResult: true })
    ).resolves.toEqual({
      number: "5511959207315",
      chatId: "179473865519257@lid",
      jid: "179473865519257@lid",
      lid: "179473865519257@lid",
      serializedId: "179473865519257@lid"
    });
  });

  it("falls back to the legacy provider string contract when no rich lookup exists", async () => {
    checkNumberMock.mockResolvedValue("5511959207315@s.whatsapp.net");

    await expect(CheckNumber("11959207315", { userId: 16 })).resolves.toBe(
      "5511959207315"
    );

    expect(checkNumberMock).toHaveBeenCalledWith(35, "11959207315");
  });

  it("preserves ERR_WAPP_NOT_INITIALIZED for the contact-create flow", async () => {
    whatsappProviderMock.checkNumberLookup = jest
      .fn()
      .mockRejectedValue(new AppError("ERR_WAPP_NOT_INITIALIZED"));

    await expect(CheckNumber("11959207315", { userId: 16 })).rejects.toMatchObject({
      message: "ERR_WAPP_NOT_INITIALIZED"
    });
  });
});