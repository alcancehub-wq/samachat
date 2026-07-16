jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../ShowWhatsAppService", () => jest.fn());
jest.mock("../AssociateWhatsappQueue", () => jest.fn());
jest.mock("../SyncWhatsAppLinkedUserService", () => jest.fn());

import UpdateWhatsAppService from "../UpdateWhatsAppService";
import ShowWhatsAppService from "../ShowWhatsAppService";
import AssociateWhatsappQueue from "../AssociateWhatsappQueue";
import SyncWhatsAppLinkedUserService from "../SyncWhatsAppLinkedUserService";

const showWhatsAppMock = ShowWhatsAppService as jest.Mock;
const associateQueueMock = AssociateWhatsappQueue as jest.Mock;
const syncLinkedUserMock = SyncWhatsAppLinkedUserService as jest.Mock;

describe("UpdateWhatsAppService credential preservation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    associateQueueMock.mockResolvedValue(undefined);
    syncLinkedUserMock.mockResolvedValue(undefined);
  });

  it("preserves stored credentials when blank fields are submitted", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);

    showWhatsAppMock.mockResolvedValue({
      id: 35,
      providerType: "official",
      phoneNumberId: "629748506897910",
      accessToken: "stored-access-token",
      verifyToken: "stored-verify-token",
      appSecret: "stored-app-secret",
      apiVersion: "v25.0",
      cloudApiStatus: "configured",
      update: updateMock
    });

    await UpdateWhatsAppService({
      whatsappId: "35",
      whatsappData: {
        name: "Larissa",
        isDefault: false,
        providerType: "official",
        phoneNumberId: "",
        accessToken: "",
        verifyToken: "",
        appSecret: "",
        queueIds: []
      }
    });

    const updateData = updateMock.mock.calls[0][0];

    expect(updateData.providerType).toBe("official");
    expect(updateData).not.toHaveProperty("phoneNumberId");
    expect(updateData).not.toHaveProperty("accessToken");
    expect(updateData).not.toHaveProperty("verifyToken");
    expect(updateData).not.toHaveProperty("appSecret");
  });

  it("blocks switching to official without stored or new credentials", async () => {
    showWhatsAppMock.mockResolvedValue({
      id: 99,
      providerType: "web",
      phoneNumberId: null,
      accessToken: null,
      verifyToken: null,
      appSecret: null,
      apiVersion: "v20.0",
      update: jest.fn()
    });

    await expect(
      UpdateWhatsAppService({
        whatsappId: "99",
        whatsappData: {
          name: "Nova conexão",
          isDefault: false,
          providerType: "official",
          phoneNumberId: "",
          accessToken: "",
          verifyToken: "",
          queueIds: []
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_CLOUD_API_REQUIRED_FIELDS",
      statusCode: 400
    });
  });

  it("updates only a non-empty credential replacement", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);

    showWhatsAppMock.mockResolvedValue({
      id: 35,
      providerType: "official",
      phoneNumberId: "629748506897910",
      accessToken: "old-access-token",
      verifyToken: "stored-verify-token",
      appSecret: "stored-app-secret",
      apiVersion: "v25.0",
      cloudApiStatus: "configured",
      update: updateMock
    });

    await UpdateWhatsAppService({
      whatsappId: "35",
      whatsappData: {
        name: "Larissa",
        isDefault: false,
        providerType: "official",
        accessToken: "new-access-token",
        verifyToken: "",
        appSecret: "",
        queueIds: []
      }
    });

    const updateData = updateMock.mock.calls[0][0];

    expect(updateData.accessToken).toBe("new-access-token");
    expect(updateData).not.toHaveProperty("verifyToken");
    expect(updateData).not.toHaveProperty("appSecret");
  });

  it("keeps the original web-provider status behavior", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);

    showWhatsAppMock.mockResolvedValue({
      id: 35,
      providerType: "official",
      phoneNumberId: "629748506897910",
      accessToken: "stored-access-token",
      verifyToken: "stored-verify-token",
      appSecret: "stored-app-secret",
      apiVersion: "v25.0",
      cloudApiStatus: "configured",
      update: updateMock
    });

    await UpdateWhatsAppService({
      whatsappId: "35",
      whatsappData: {
        name: "Larissa",
        isDefault: false,
        providerType: "web",
        queueIds: []
      }
    });

    const updateData = updateMock.mock.calls[0][0];

    expect(updateData.providerType).toBe("web");
    expect(updateData).toHaveProperty(
      "cloudApiStatus",
      undefined
    );
  });
});