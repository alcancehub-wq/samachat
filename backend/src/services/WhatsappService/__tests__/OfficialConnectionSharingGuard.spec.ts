jest.mock("../../../database", () => ({
  __esModule: true,
  default: {
    transaction: jest.fn()
  }
}));
jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../ShowWhatsAppService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../AssociateWhatsappQueue", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../SyncWhatsAppLinkedUserService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import Whatsapp from "../../../models/Whatsapp";
import CreateWhatsAppService from "../CreateWhatsAppService";
import UpdateWhatsAppService from "../UpdateWhatsAppService";
import ShowWhatsAppService from "../ShowWhatsAppService";
import AssociateWhatsappQueue from "../AssociateWhatsappQueue";
import SyncWhatsAppLinkedUserService from "../SyncWhatsAppLinkedUserService";

const whatsappFindOneMock = Whatsapp.findOne as jest.Mock;
const whatsappCreateMock = Whatsapp.create as jest.Mock;
const showWhatsAppMock = ShowWhatsAppService as jest.Mock;
const associateQueueMock = AssociateWhatsappQueue as jest.Mock;
const syncLinkedUsersMock = SyncWhatsAppLinkedUserService as jest.Mock;

describe("Official connection sharing guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    whatsappFindOneMock.mockResolvedValue(null);
    associateQueueMock.mockResolvedValue(undefined);
    syncLinkedUsersMock.mockResolvedValue(undefined);
  });

  it("rejects creating an official connection with multiple linked users", async () => {
    await expect(
      CreateWhatsAppService({
        name: "Official protected",
        providerType: "official",
        phoneNumberId: "phone-number-test",
        accessToken: "token-test",
        verifyToken: "verify-test",
        linkedUserIds: [501, 502]
      })
    ).rejects.toMatchObject({
      message: "ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED"
    });

    expect(whatsappCreateMock).not.toHaveBeenCalled();
    expect(syncLinkedUsersMock).not.toHaveBeenCalled();
  });

  it("allows a singular linked user when creating an official connection", async () => {
    const createdWhatsapp = {
      id: 701
    };

    whatsappCreateMock.mockResolvedValue(createdWhatsapp);

    await CreateWhatsAppService({
      name: "Official singular",
      providerType: "official",
      phoneNumberId: "phone-number-test",
      accessToken: "token-test",
      verifyToken: "verify-test",
      linkedUserIds: [501]
    });

    expect(whatsappCreateMock).toHaveBeenCalled();
    expect(syncLinkedUsersMock).toHaveBeenCalledWith({
      whatsappId: 701,
      linkedUserId: undefined,
      linkedUserIds: [501],
      linkedUserSignMessages: undefined
    });
  });

  it("rejects updating an official connection with multiple linked users before persistence", async () => {
    const whatsappUpdate = jest.fn().mockResolvedValue(undefined);

    showWhatsAppMock.mockResolvedValue({
      id: 702,
      providerType: "official",
      phoneNumberId: "phone-number-test",
      accessToken: "token-test",
      verifyToken: "verify-test",
      users: [{ id: 601 }],
      update: whatsappUpdate
    });

    await expect(
      UpdateWhatsAppService({
        whatsappId: "702",
        whatsappData: {
          linkedUserIds: [601, 602]
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED"
    });

    expect(whatsappUpdate).not.toHaveBeenCalled();
    expect(syncLinkedUsersMock).not.toHaveBeenCalled();
  });

  it("rejects converting a shared web connection to official even when linkedUserIds is omitted", async () => {
    const whatsappUpdate = jest.fn().mockResolvedValue(undefined);

    showWhatsAppMock.mockResolvedValue({
      id: 703,
      providerType: "web",
      phoneNumberId: "phone-number-test",
      accessToken: "token-test",
      verifyToken: "verify-test",
      users: [{ id: 611 }, { id: 612 }],
      update: whatsappUpdate
    });

    await expect(
      UpdateWhatsAppService({
        whatsappId: "703",
        whatsappData: {
          providerType: "official"
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED"
    });

    expect(whatsappUpdate).not.toHaveBeenCalled();
    expect(syncLinkedUsersMock).not.toHaveBeenCalled();
  });

  it("allows unrelated updates to an official connection with a single existing linked user", async () => {
    const whatsappUpdate = jest.fn().mockResolvedValue(undefined);

    showWhatsAppMock.mockResolvedValue({
      id: 704,
      providerType: "official",
      phoneNumberId: "phone-number-test",
      accessToken: "token-test",
      verifyToken: "verify-test",
      users: [{ id: 621 }],
      update: whatsappUpdate
    });

    await UpdateWhatsAppService({
      whatsappId: "704",
      whatsappData: {
        name: "Official protected updated"
      }
    });

    expect(whatsappUpdate).toHaveBeenCalled();
    expect(syncLinkedUsersMock).toHaveBeenCalledWith({
      whatsappId: 704,
      linkedUserId: undefined,
      linkedUserIds: undefined,
      linkedUserSignMessages: undefined
    });
  });
});