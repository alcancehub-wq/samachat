import AppError from "../../../errors/AppError";
import ResolveWhatsAppContext from "../../../helpers/ResolveWhatsAppContext";
import { whatsappProvider } from "../../../providers/WhatsApp";
import CheckIsValidContact from "../../../services/WbotServices/CheckIsValidContact";
import { logger } from "../../../utils/logger";

jest.mock("../../../helpers/ResolveWhatsAppContext", () => jest.fn());

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    checkNumber: jest.fn()
  }
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe("CheckIsValidContact", () => {
  const resolveWhatsAppContextMock = ResolveWhatsAppContext as jest.Mock;
  const checkNumberMock = whatsappProvider.checkNumber as jest.Mock;
  const loggerWarnMock = logger.warn as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resolveWhatsAppContextMock.mockResolvedValue({
      id: 35,
      phoneNumber: "5511981901577"
    });
  });

  it("keeps obviously invalid numbers blocked before provider lookup", async () => {
    await expect(CheckIsValidContact("123")).rejects.toMatchObject({
      message: "ERR_WAPP_INVALID_CONTACT"
    });

    expect(checkNumberMock).not.toHaveBeenCalled();
  });

  it("accepts a provider-confirmed valid number", async () => {
    checkNumberMock.mockResolvedValue("5511959207315");

    await expect(CheckIsValidContact("11959207315")).resolves.toBeUndefined();

    expect(checkNumberMock).toHaveBeenCalledWith(35, "11959207315");
  });

  it("keeps explicit provider negatives as invalid numbers", async () => {
    checkNumberMock.mockRejectedValue(
      new AppError("ERR_NUMBER_NOT_ON_WHATSAPP", 404)
    );

    await expect(CheckIsValidContact("5511959207315")).rejects.toMatchObject({
      message: "ERR_WAPP_INVALID_CONTACT"
    });
  });

  it("returns a lookup error when the provider cannot confirm a plausible number", async () => {
    checkNumberMock.mockResolvedValue("");

    await expect(CheckIsValidContact("11959207315")).rejects.toMatchObject({
      message: "ERR_WAPP_CHECK_CONTACT"
    });

    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: "contacts",
        whatsappId: 35,
        number: "11959207315",
        candidates: ["5511959207315", "11959207315"]
      }),
      "CheckIsValidContact lookup returned no confirmed number"
    );
  });

  it("preserves connection errors instead of masking them as invalid numbers", async () => {
    checkNumberMock.mockRejectedValue(new AppError("ERR_WAPP_NOT_INITIALIZED"));

    await expect(CheckIsValidContact("11959207315")).rejects.toMatchObject({
      message: "ERR_WAPP_NOT_INITIALIZED"
    });
  });
});