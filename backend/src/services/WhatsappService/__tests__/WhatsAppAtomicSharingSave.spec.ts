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

jest.mock("../SyncWhatsAppSharingSettingsService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import sequelize from "../../../database";
import Whatsapp from "../../../models/Whatsapp";
import CreateWhatsAppService from "../CreateWhatsAppService";
import UpdateWhatsAppService from "../UpdateWhatsAppService";
import ShowWhatsAppService from "../ShowWhatsAppService";
import AssociateWhatsappQueue from "../AssociateWhatsappQueue";
import SyncWhatsAppLinkedUserService from "../SyncWhatsAppLinkedUserService";
import SyncWhatsAppSharingSettingsService from "../SyncWhatsAppSharingSettingsService";

const transactionMock = sequelize.transaction as jest.Mock;
const whatsappFindOneMock = Whatsapp.findOne as jest.Mock;
const whatsappCreateMock = Whatsapp.create as jest.Mock;
const showMock = ShowWhatsAppService as jest.Mock;
const associateMock = AssociateWhatsappQueue as jest.Mock;
const linkedMock = SyncWhatsAppLinkedUserService as jest.Mock;
const sharingMock = SyncWhatsAppSharingSettingsService as jest.Mock;

const transaction = { id: "atomic-whatsapp-save" };

describe("WhatsApp atomic sharing save", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    transactionMock.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback(transaction)
    );

    whatsappFindOneMock.mockResolvedValue(null);
    associateMock.mockResolvedValue(undefined);
    linkedMock.mockResolvedValue(undefined);
    sharingMock.mockResolvedValue(undefined);
  });

  it("keeps the legacy create path without opening a new transaction", async () => {
    whatsappCreateMock.mockResolvedValue({
      id: 1001
    });

    await CreateWhatsAppService({
      name: "Legacy web",
      providerType: "web",
      linkedUserIds: [1101]
    });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(sharingMock).not.toHaveBeenCalled();
  });

  it("uses one transaction for the new create sharing path", async () => {
    whatsappCreateMock.mockResolvedValue({
      id: 1002
    });

    await CreateWhatsAppService({
      name: "Shared web",
      providerType: "web",
      linkedUserIds: [1101, 1102],
      sharingSettings: {
        isShared: true,
        distributionEnabled: true,
        distributionMode: "random",
        distributionUserIds: [1101]
      }
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);

    expect(associateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1002 }),
      [],
      transaction
    );

    expect(linkedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsappId: 1002,
        linkedUserIds: [1101, 1102],
        transaction
      })
    );

    expect(sharingMock).toHaveBeenCalledWith({
      whatsappId: 1002,
      isShared: true,
      distributionEnabled: true,
      distributionMode: "random",
      distributionUserIds: [1101],
      transaction
    });
  });

  it("rejects distribution users outside the linked users before transaction", async () => {
    await expect(
      CreateWhatsAppService({
        name: "Invalid shared web",
        providerType: "web",
        linkedUserIds: [1201],
        sharingSettings: {
          isShared: true,
          distributionEnabled: true,
          distributionMode: "random",
          distributionUserIds: [1202]
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_DISTRIBUTION_USERS_MUST_BE_LINKED"
    });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(whatsappCreateMock).not.toHaveBeenCalled();
  });

  it("rejects multiple linked users when sharing is explicitly off", async () => {
    await expect(
      CreateWhatsAppService({
        name: "Sharing off",
        providerType: "web",
        linkedUserIds: [1301, 1302],
        sharingSettings: {
          isShared: false,
          distributionEnabled: false
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_SHARING_REQUIRED_FOR_MULTIPLE_USERS"
    });

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("keeps the legacy update path without opening a new transaction", async () => {
    const update = jest.fn().mockResolvedValue(undefined);

    showMock.mockResolvedValue({
      id: 1003,
      providerType: "web",
      users: [{ id: 1401 }],
      update
    });

    await UpdateWhatsAppService({
      whatsappId: "1003",
      whatsappData: {
        name: "Legacy update"
      }
    });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(sharingMock).not.toHaveBeenCalled();
  });

  it("uses the same transaction for update, queues, linked users and sharing", async () => {
    const update = jest.fn().mockResolvedValue(undefined);

    showMock.mockResolvedValue({
      id: 1004,
      providerType: "web",
      users: [{ id: 1501 }],
      update
    });

    await UpdateWhatsAppService({
      whatsappId: "1004",
      whatsappData: {
        name: "Atomic update",
        linkedUserIds: [1501, 1502],
        sharingSettings: {
          isShared: true,
          distributionEnabled: true,
          distributionMode: "round_robin",
          distributionUserIds: [1501, 1502]
        }
      }
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Atomic update"
      }),
      { transaction }
    );

    expect(associateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1004 }),
      [],
      transaction
    );

    expect(linkedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsappId: 1004,
        linkedUserIds: [1501, 1502],
        transaction
      })
    );

    expect(sharingMock).toHaveBeenCalledWith({
      whatsappId: 1004,
      isShared: true,
      distributionEnabled: true,
      distributionMode: "round_robin",
      distributionUserIds: [1501, 1502],
      transaction
    });
  });

  it("rejects an official sharing activation before transaction", async () => {
    const update = jest.fn().mockResolvedValue(undefined);

    showMock.mockResolvedValue({
      id: 1005,
      providerType: "official",
      users: [{ id: 1601 }],
      phoneNumberId: "phone-test",
      accessToken: "access-test",
      verifyToken: "verify-test",
      update
    });

    await expect(
      UpdateWhatsAppService({
        whatsappId: "1005",
        whatsappData: {
          sharingSettings: {
            isShared: true,
            distributionEnabled: false
          }
        }
      })
    ).rejects.toMatchObject({
      message: "ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED"
    });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
