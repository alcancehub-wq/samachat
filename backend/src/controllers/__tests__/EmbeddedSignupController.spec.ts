jest.mock("../../libs/socket", () => ({
  getIO: jest.fn()
}));

jest.mock(
  "../../services/CloudApiEmbeddedSignupServices/ApplyEmbeddedSignupToExistingWhatsApp",
  () => jest.fn()
);

jest.mock("../../helpers/SerializeWhatsAppForClient", () => jest.fn());

import { store } from "../EmbeddedSignupController";
import { getIO } from "../../libs/socket";
import ApplyEmbeddedSignupToExistingWhatsApp from "../../services/CloudApiEmbeddedSignupServices/ApplyEmbeddedSignupToExistingWhatsApp";
import SerializeWhatsAppForClient from "../../helpers/SerializeWhatsAppForClient";

const getIOMock = getIO as jest.Mock;
const applyEmbeddedSignupMock =
  ApplyEmbeddedSignupToExistingWhatsApp as jest.Mock;
const serializeMock =
  SerializeWhatsAppForClient as jest.Mock;

describe("EmbeddedSignupController", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
      META_EMBEDDED_SIGNUP_APP_ID: "1671814291237488",
      META_EMBEDDED_SIGNUP_APP_SECRET: "backend-app-secret",
      META_EMBEDDED_SIGNUP_API_VERSION: "v25.0"
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("applies Embedded Signup to the explicit existing connection", async () => {
    const emitMock = jest.fn();

    getIOMock.mockReturnValue({
      emit: emitMock
    });

    const whatsapp = {
      id: 35,
      providerType: "official",
      accessToken: "generated-business-token",
      appSecret: "backend-app-secret"
    };

    applyEmbeddedSignupMock.mockResolvedValue(whatsapp);

    serializeMock.mockReturnValue({
      id: 35,
      providerType: "official",
      hasAccessToken: true,
      hasAppSecret: true
    });

    const req = {
      params: {
        whatsappId: "35"
      },
      body: {
        code: "temporary-code",
        sessionInfo: {
          wabaId: "1015864050707890",
          phoneNumberId: "629748506897910",
          businessAccountId: "152675177927860"
        }
      }
    } as any;

    const jsonMock = jest.fn();

    const res = {
      status: jest.fn().mockReturnValue({
        json: jsonMock
      })
    } as any;

    await store(req, res);

    expect(applyEmbeddedSignupMock).toHaveBeenCalledWith({
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

    expect(serializeMock).toHaveBeenCalledWith(whatsapp);

    expect(emitMock).toHaveBeenCalledWith("whatsapp", {
      action: "update",
      whatsapp: {
        id: 35,
        providerType: "official",
        hasAccessToken: true,
        hasAppSecret: true
      }
    });

    expect(res.status).toHaveBeenCalledWith(200);

    expect(jsonMock).toHaveBeenCalledWith({
      id: 35,
      providerType: "official",
      hasAccessToken: true,
      hasAppSecret: true
    });
  });

  it("blocks execution when the backend app id is absent", async () => {
    delete process.env.META_EMBEDDED_SIGNUP_APP_ID;

    const req = {
      params: {
        whatsappId: "35"
      },
      body: {}
    } as any;

    await expect(
      store(req, {} as any)
    ).rejects.toMatchObject({
      message:
        "ERR_EMBEDDED_SIGNUP_APP_ID_NOT_CONFIGURED",
      statusCode: 500
    });

    expect(applyEmbeddedSignupMock).not.toHaveBeenCalled();
  });

  it("blocks execution when the backend app secret is absent", async () => {
    delete process.env.META_EMBEDDED_SIGNUP_APP_SECRET;

    const req = {
      params: {
        whatsappId: "35"
      },
      body: {}
    } as any;

    await expect(
      store(req, {} as any)
    ).rejects.toMatchObject({
      message:
        "ERR_EMBEDDED_SIGNUP_APP_SECRET_NOT_CONFIGURED",
      statusCode: 500
    });

    expect(applyEmbeddedSignupMock).not.toHaveBeenCalled();
  });

  it("uses v25.0 when the API version environment variable is absent", async () => {
    delete process.env.META_EMBEDDED_SIGNUP_API_VERSION;

    getIOMock.mockReturnValue({
      emit: jest.fn()
    });

    applyEmbeddedSignupMock.mockResolvedValue({
      id: 35
    });

    serializeMock.mockReturnValue({
      id: 35
    });

    const req = {
      params: {
        whatsappId: "35"
      },
      body: {
        code: "temporary-code",
        sessionInfo: {
          wabaId: "1015864050707890",
          phoneNumberId: "629748506897910"
        }
      }
    } as any;

    const res = {
      status: jest.fn().mockReturnValue({
        json: jest.fn()
      })
    } as any;

    await store(req, res);

    expect(applyEmbeddedSignupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiVersion: "v25.0"
      })
    );
  });
});
