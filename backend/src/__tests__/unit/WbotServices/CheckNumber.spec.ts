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

  beforeEach(() => {
    jest.clearAllMocks();
    resolveWhatsAppContextMock.mockResolvedValue({ id: 35 });
  });

  it("returns the provider-confirmed number when the session is ready", async () => {
    checkNumberMock.mockResolvedValue("5511959207315");

    await expect(CheckNumber("11959207315", { userId: 16 })).resolves.toBe(
      "5511959207315"
    );

    expect(checkNumberMock).toHaveBeenCalledWith(35, "11959207315");
  });

  it("preserves ERR_WAPP_NOT_INITIALIZED for the contact-create flow", async () => {
    checkNumberMock.mockRejectedValue(new AppError("ERR_WAPP_NOT_INITIALIZED"));

    await expect(CheckNumber("11959207315", { userId: 16 })).rejects.toMatchObject({
      message: "ERR_WAPP_NOT_INITIALIZED"
    });
  });
});