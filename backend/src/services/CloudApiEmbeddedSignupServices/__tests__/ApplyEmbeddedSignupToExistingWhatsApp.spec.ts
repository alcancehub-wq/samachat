jest.mock("../../WhatsappService/ShowWhatsAppService", () => jest.fn());
jest.mock("../ExchangeEmbeddedSignupCode", () => jest.fn());

import ApplyEmbeddedSignupToExistingWhatsApp from "../ApplyEmbeddedSignupToExistingWhatsApp";
import ExchangeEmbeddedSignupCode from "../ExchangeEmbeddedSignupCode";
import ShowWhatsAppService from "../../WhatsappService/ShowWhatsAppService";

const showWhatsAppMock = ShowWhatsAppService as jest.Mock;
const exchangeCodeMock = ExchangeEmbeddedSignupCode as jest.Mock;

describe("ApplyEmbeddedSignupToExistingWhatsApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    exchangeCodeMock.mockResolvedValue({
      accessToken: "generated-business-token",
      tokenType: "bearer"
    });
  });

  it("updates only Cloud API fields on the existing connection", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);

    const existingWhatsapp = {
      id: 35,
      name: "Larissa",
      providerType: "web",
      wabaId: "1015864050707890",
      phoneNumberId: "629748506897910",
      businessAccountId: "152675177927860",
      apiVersion: "v25.0",
      update: updateMock
    };

    showWhatsAppMock.mockResolvedValue(existingWhatsapp);

    const result = await ApplyEmbeddedSignupToExistingWhatsApp({
      whatsappId: "35",
      code: "temporary-code",
      appId: "1671814291237488",
      appSecret: "backend-app-secret",
      apiVersion: "v25.0",
      sessionInfo: {
        wabaId: "1015864050707890",
        phoneNumberId: "629748506897910",
        businessAccountId: "152675177927860"
      }
    });

    expect(showWhatsAppMock).toHaveBeenCalledWith("35");

    expect(exchangeCodeMock).toHaveBeenCalledWith({
      code: "temporary-code",
      appId: "1671814291237488",
      appSecret: "backend-app-secret",
      apiVersion: "v25.0"
    });

    expect(updateMock).toHaveBeenCalledWith({
      providerType: "official",
      wabaId: "1015864050707890",
      phoneNumberId: "629748506897910",
      businessAccountId: "152675177927860",
      accessToken: "generated-business-token",
      appSecret: "backend-app-secret",
      apiVersion: "v25.0",
      cloudApiStatus: "configured",
      cloudApiLastError: undefined
    });

    const updateData = updateMock.mock.calls[0][0];

    expect(updateData).not.toHaveProperty("name");
    expect(updateData).not.toHaveProperty("queueIds");
    expect(updateData).not.toHaveProperty("linkedUserId");
    expect(updateData).not.toHaveProperty("session");
    expect(updateData).not.toHaveProperty("status");

    expect(result).toBe(existingWhatsapp);
  });

  it("rejects an invalid connection id before database access", async () => {
    await expect(
      ApplyEmbeddedSignupToExistingWhatsApp({
        whatsappId: "35-invalid",
        code: "temporary-code",
        appId: "1671814291237488",
        appSecret: "backend-app-secret",
        sessionInfo: {
          wabaId: "1015864050707890",
          phoneNumberId: "629748506897910"
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_EMBEDDED_SIGNUP_INVALID_WHATSAPP_ID",
      statusCode: 400
    });

    expect(showWhatsAppMock).not.toHaveBeenCalled();
    expect(exchangeCodeMock).not.toHaveBeenCalled();
  });

  it("blocks a different phone number before exchanging the code", async () => {
    const updateMock = jest.fn();

    showWhatsAppMock.mockResolvedValue({
      id: 35,
      wabaId: "1015864050707890",
      phoneNumberId: "629748506897910",
      businessAccountId: "152675177927860",
      update: updateMock
    });

    await expect(
      ApplyEmbeddedSignupToExistingWhatsApp({
        whatsappId: "35",
        code: "temporary-code",
        appId: "1671814291237488",
        appSecret: "backend-app-secret",
        sessionInfo: {
          wabaId: "1015864050707890",
          phoneNumberId: "999999999999999",
          businessAccountId: "152675177927860"
        }
      })
    ).rejects.toMatchObject({
      message:
        "ERR_EMBEDDED_SIGNUP_PHONE_NUMBER_ID_MISMATCH",
      statusCode: 409
    });

    expect(exchangeCodeMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("blocks a different WABA before exchanging the code", async () => {
    const updateMock = jest.fn();

    showWhatsAppMock.mockResolvedValue({
      id: 35,
      wabaId: "1015864050707890",
      phoneNumberId: "629748506897910",
      businessAccountId: "152675177927860",
      update: updateMock
    });

    await expect(
      ApplyEmbeddedSignupToExistingWhatsApp({
        whatsappId: "35",
        code: "temporary-code",
        appId: "1671814291237488",
        appSecret: "backend-app-secret",
        sessionInfo: {
          wabaId: "999999999999999",
          phoneNumberId: "629748506897910",
          businessAccountId: "152675177927860"
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_EMBEDDED_SIGNUP_WABA_ID_MISMATCH",
      statusCode: 409
    });

    expect(exchangeCodeMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not update the connection when token exchange fails", async () => {
    const updateMock = jest.fn();

    showWhatsAppMock.mockResolvedValue({
      id: 35,
      wabaId: "1015864050707890",
      phoneNumberId: "629748506897910",
      businessAccountId: "152675177927860",
      update: updateMock
    });

    exchangeCodeMock.mockRejectedValue({
      message: "ERR_EMBEDDED_SIGNUP_META_UNAVAILABLE",
      statusCode: 502
    });

    await expect(
      ApplyEmbeddedSignupToExistingWhatsApp({
        whatsappId: "35",
        code: "temporary-code",
        appId: "1671814291237488",
        appSecret: "backend-app-secret",
        sessionInfo: {
          wabaId: "1015864050707890",
          phoneNumberId: "629748506897910",
          businessAccountId: "152675177927860"
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_EMBEDDED_SIGNUP_META_UNAVAILABLE",
      statusCode: 502
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("accepts identifiers when the existing connection has none stored", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);

    showWhatsAppMock.mockResolvedValue({
      id: 35,
      wabaId: null,
      phoneNumberId: null,
      businessAccountId: null,
      apiVersion: null,
      update: updateMock
    });

    await ApplyEmbeddedSignupToExistingWhatsApp({
      whatsappId: 35,
      code: "temporary-code",
      appId: "1671814291237488",
      appSecret: "backend-app-secret",
      sessionInfo: {
        wabaId: "1015864050707890",
        phoneNumberId: "629748506897910",
        businessAccountId: "152675177927860"
      }
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: "official",
        wabaId: "1015864050707890",
        phoneNumberId: "629748506897910",
        businessAccountId: "152675177927860",
        accessToken: "generated-business-token",
        apiVersion: "v25.0"
      })
    );
  });
});
