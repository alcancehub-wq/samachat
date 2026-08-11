jest.mock("../../../database", () => ({
  __esModule: true,
  default: {
    transaction: jest.fn()
  }
}));

jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

jest.mock("../../../models/User", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../../models/WhatsappSharingSetting", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    destroy: jest.fn()
  }
}));

jest.mock("../../../models/WhatsappDistributionUser", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
    destroy: jest.fn()
  }
}));

import sequelize from "../../../database";
import User from "../../../models/User";
import Whatsapp from "../../../models/Whatsapp";
import WhatsappDistributionUser from "../../../models/WhatsappDistributionUser";
import WhatsappSharingSetting from "../../../models/WhatsappSharingSetting";
import GetWhatsAppSharingSettingsService from "../GetWhatsAppSharingSettingsService";
import SyncWhatsAppSharingSettingsService from "../SyncWhatsAppSharingSettingsService";

const sequelizeTransactionMock = sequelize.transaction as jest.Mock;
const whatsappFindByPkMock = Whatsapp.findByPk as jest.Mock;
const userFindAllMock = User.findAll as jest.Mock;
const settingFindOneMock = WhatsappSharingSetting.findOne as jest.Mock;
const settingFindOrCreateMock =
  WhatsappSharingSetting.findOrCreate as jest.Mock;
const settingDestroyMock = WhatsappSharingSetting.destroy as jest.Mock;
const distributionFindAllMock =
  WhatsappDistributionUser.findAll as jest.Mock;
const distributionFindOrCreateMock =
  WhatsappDistributionUser.findOrCreate as jest.Mock;
const distributionDestroyMock =
  WhatsappDistributionUser.destroy as jest.Mock;

const transaction = { id: "mock-transaction" };

describe("WhatsApp sharing settings services", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    sequelizeTransactionMock.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback(transaction)
    );

    whatsappFindByPkMock.mockResolvedValue({
      id: 801,
      providerType: "web"
    });

    settingFindOneMock.mockResolvedValue(null);
    distributionFindAllMock.mockResolvedValue([]);
    distributionDestroyMock.mockResolvedValue(0);
    settingDestroyMock.mockResolvedValue(0);
    userFindAllMock.mockResolvedValue([]);

    distributionFindOrCreateMock.mockImplementation(
      async ({ where }: { where: { userId: number } }) => [
        {
          userId: where.userId
        },
        true
      ]
    );
  });

  it("returns the safe OFF default when no setting exists", async () => {
    const result = await GetWhatsAppSharingSettingsService(801);

    expect(result).toEqual({
      isShared: false,
      distributionEnabled: false,
      distributionMode: null,
      lastAssignedUserId: null,
      distributionUserIds: []
    });

    expect(distributionFindAllMock).not.toHaveBeenCalled();
  });

  it("rejects activation for an official connection", async () => {
    whatsappFindByPkMock.mockResolvedValue({
      id: 802,
      providerType: "official"
    });

    await expect(
      SyncWhatsAppSharingSettingsService({
        whatsappId: 802,
        isShared: true,
        distributionEnabled: false
      })
    ).rejects.toMatchObject({
      message: "ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED"
    });

    expect(settingFindOrCreateMock).not.toHaveBeenCalled();
    expect(distributionDestroyMock).not.toHaveBeenCalled();
  });

  it("requires sharing when distribution is enabled", async () => {
    await expect(
      SyncWhatsAppSharingSettingsService({
        whatsappId: 803,
        isShared: false,
        distributionEnabled: true,
        distributionMode: "random",
        distributionUserIds: [901]
      })
    ).rejects.toMatchObject({
      message: "ERR_DISTRIBUTION_REQUIRES_SHARING"
    });

    expect(sequelizeTransactionMock).not.toHaveBeenCalled();
  });

  it("requires random or round_robin when distribution is enabled", async () => {
    await expect(
      SyncWhatsAppSharingSettingsService({
        whatsappId: 804,
        isShared: true,
        distributionEnabled: true,
        distributionMode: "invalid",
        distributionUserIds: [901]
      })
    ).rejects.toMatchObject({
      message: "ERR_INVALID_DISTRIBUTION_MODE"
    });

    expect(sequelizeTransactionMock).not.toHaveBeenCalled();
  });

  it("requires at least one eligible distribution user", async () => {
    await expect(
      SyncWhatsAppSharingSettingsService({
        whatsappId: 805,
        isShared: true,
        distributionEnabled: true,
        distributionMode: "random",
        distributionUserIds: []
      })
    ).rejects.toMatchObject({
      message: "ERR_DISTRIBUTION_USERS_REQUIRED"
    });

    expect(sequelizeTransactionMock).not.toHaveBeenCalled();
  });

  it("rejects an eligible user that is not linked to the whatsapp", async () => {
    userFindAllMock.mockResolvedValue([{ id: 911 }]);

    await expect(
      SyncWhatsAppSharingSettingsService({
        whatsappId: 806,
        isShared: true,
        distributionEnabled: true,
        distributionMode: "random",
        distributionUserIds: [911, 912]
      })
    ).rejects.toMatchObject({
      message: "ERR_DISTRIBUTION_USER_NOT_LINKED"
    });

    expect(settingFindOrCreateMock).not.toHaveBeenCalled();
  });

  it("disables sharing by removing only sharing configuration inside one transaction", async () => {
    const result = await SyncWhatsAppSharingSettingsService({
      whatsappId: 807,
      isShared: false,
      distributionEnabled: false
    });

    expect(distributionDestroyMock).toHaveBeenCalledWith({
      where: { whatsappId: 807 },
      transaction
    });

    expect(settingDestroyMock).toHaveBeenCalledWith({
      where: { whatsappId: 807 },
      transaction
    });

    expect(result).toEqual({
      isShared: false,
      distributionEnabled: false,
      distributionMode: null,
      lastAssignedUserId: null,
      distributionUserIds: []
    });
  });

  it("keeps sharing on but clears distribution state when distribution is disabled", async () => {
    const update = jest.fn().mockResolvedValue(undefined);

    settingFindOrCreateMock.mockResolvedValue([
      {
        update
      },
      true
    ]);

    const result = await SyncWhatsAppSharingSettingsService({
      whatsappId: 808,
      isShared: true,
      distributionEnabled: false,
      distributionMode: "round_robin",
      distributionUserIds: [921]
    });

    expect(distributionDestroyMock).toHaveBeenCalledWith({
      where: { whatsappId: 808 },
      transaction
    });

    expect(update).toHaveBeenCalledWith(
      {
        isShared: true,
        distributionEnabled: false,
        distributionMode: null,
        lastAssignedUserId: null
      },
      { transaction }
    );

    expect(result).toEqual({
      isShared: true,
      distributionEnabled: false,
      distributionMode: null,
      lastAssignedUserId: null,
      distributionUserIds: []
    });
  });

  it("normalizes eligible users and resets round-robin state when eligibility changes", async () => {
    const update = jest.fn().mockResolvedValue(undefined);

    settingFindOneMock.mockResolvedValue({
      distributionMode: "round_robin",
      lastAssignedUserId: 931
    });

    distributionFindAllMock.mockResolvedValue([
      { userId: 931 }
    ]);

    userFindAllMock.mockResolvedValue([
      { id: 931 },
      { id: 932 }
    ]);

    settingFindOrCreateMock.mockResolvedValue([
      {
        update
      },
      false
    ]);

    const result = await SyncWhatsAppSharingSettingsService({
      whatsappId: 809,
      isShared: true,
      distributionEnabled: true,
      distributionMode: "round_robin",
      distributionUserIds: [932, 931, 932]
    });

    expect(update).toHaveBeenCalledWith(
      {
        isShared: true,
        distributionEnabled: true,
        distributionMode: "round_robin",
        lastAssignedUserId: null
      },
      { transaction }
    );

    expect(distributionFindOrCreateMock).toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      isShared: true,
      distributionEnabled: true,
      distributionMode: "round_robin",
      lastAssignedUserId: null,
      distributionUserIds: [931, 932]
    });
  });

  it("preserves round-robin state when mode and eligibility are unchanged", async () => {
    const update = jest.fn().mockResolvedValue(undefined);

    settingFindOneMock.mockResolvedValue({
      distributionMode: "round_robin",
      lastAssignedUserId: 941
    });

    distributionFindAllMock.mockResolvedValue([
      { userId: 941 },
      { userId: 942 }
    ]);

    userFindAllMock.mockResolvedValue([
      { id: 941 },
      { id: 942 }
    ]);

    settingFindOrCreateMock.mockResolvedValue([
      {
        update
      },
      false
    ]);

    const result = await SyncWhatsAppSharingSettingsService({
      whatsappId: 810,
      isShared: true,
      distributionEnabled: true,
      distributionMode: "round_robin",
      distributionUserIds: [942, 941]
    });

    expect(update).toHaveBeenCalledWith(
      {
        isShared: true,
        distributionEnabled: true,
        distributionMode: "round_robin",
        lastAssignedUserId: 941
      },
      { transaction }
    );

    expect(result.lastAssignedUserId).toBe(941);
    expect(result.distributionUserIds).toEqual([941, 942]);
  });
});
