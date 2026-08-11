import { Op } from "sequelize";

jest.mock("../../../models/User", () => ({
  __esModule: true,
  default: {
    update: jest.fn(),
    findAll: jest.fn()
  }
}));

import User from "../../../models/User";
import SyncWhatsAppLinkedUserService from "../SyncWhatsAppLinkedUserService";

const userUpdateManyMock = User.update as jest.Mock;
const userFindAllMock = User.findAll as jest.Mock;

describe("SyncWhatsAppLinkedUserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userUpdateManyMock.mockResolvedValue([0]);
  });

  it("links multiple selected users to the same whatsapp", async () => {
    const firstUserUpdate = jest.fn().mockResolvedValue(undefined);
    const secondUserUpdate = jest.fn().mockResolvedValue(undefined);

    userFindAllMock.mockResolvedValue([
      { id: 101, update: firstUserUpdate },
      { id: 102, update: secondUserUpdate }
    ]);

    await SyncWhatsAppLinkedUserService({
      whatsappId: 77,
      linkedUserIds: [101, 102]
    });

    expect(userFindAllMock).toHaveBeenCalledWith({
      where: {
        id: {
          [Op.in]: [101, 102]
        }
      }
    });

    expect(userUpdateManyMock).toHaveBeenCalledWith(
      { whatsappId: null },
      {
        where: {
          whatsappId: 77,
          id: {
            [Op.notIn]: [101, 102]
          }
        }
      }
    );

    expect(firstUserUpdate).toHaveBeenCalledWith({
      whatsappId: 77
    });

    expect(secondUserUpdate).toHaveBeenCalledWith({
      whatsappId: 77
    });
  });

  it("preserves each user's signMessages in explicit multi-user mode", async () => {
    const firstUserUpdate = jest.fn().mockResolvedValue(undefined);
    const secondUserUpdate = jest.fn().mockResolvedValue(undefined);

    userFindAllMock.mockResolvedValue([
      { id: 111, update: firstUserUpdate },
      { id: 112, update: secondUserUpdate }
    ]);

    await SyncWhatsAppLinkedUserService({
      whatsappId: 78,
      linkedUserIds: [111, 112],
      linkedUserSignMessages: true
    });

    expect(firstUserUpdate).toHaveBeenCalledWith({
      whatsappId: 78
    });

    expect(secondUserUpdate).toHaveBeenCalledWith({
      whatsappId: 78
    });

    expect(firstUserUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        signMessages: expect.any(Boolean)
      })
    );

    expect(secondUserUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        signMessages: expect.any(Boolean)
      })
    );
  });

  it("keeps legacy linkedUserSignMessages behavior for the singular field", async () => {
    const legacyUserUpdate = jest.fn().mockResolvedValue(undefined);

    userFindAllMock.mockResolvedValue([
      { id: 302, update: legacyUserUpdate }
    ]);

    await SyncWhatsAppLinkedUserService({
      whatsappId: 95,
      linkedUserId: 302,
      linkedUserSignMessages: true
    });

    expect(legacyUserUpdate).toHaveBeenCalledWith({
      whatsappId: 95,
      signMessages: true
    });
  });
  it("removes users that are no longer selected while keeping selected users", async () => {
    const selectedUserUpdate = jest.fn().mockResolvedValue(undefined);

    userFindAllMock.mockResolvedValue([
      { id: 202, update: selectedUserUpdate }
    ]);

    await SyncWhatsAppLinkedUserService({
      whatsappId: 88,
      linkedUserIds: [202]
    });

    expect(userUpdateManyMock).toHaveBeenCalledWith(
      { whatsappId: null },
      {
        where: {
          whatsappId: 88,
          id: {
            [Op.notIn]: [202]
          }
        }
      }
    );

    expect(selectedUserUpdate).toHaveBeenCalledWith({
      whatsappId: 88
    });
  });

  it("clears every linked user when the explicit multi-user selection is empty", async () => {
    await SyncWhatsAppLinkedUserService({
      whatsappId: 91,
      linkedUserIds: []
    });

    expect(userFindAllMock).not.toHaveBeenCalled();

    expect(userUpdateManyMock).toHaveBeenCalledWith(
      { whatsappId: null },
      {
        where: {
          whatsappId: 91
        }
      }
    );
  });

  it("keeps backward compatibility with the legacy linkedUserId field", async () => {
    const legacyUserUpdate = jest.fn().mockResolvedValue(undefined);

    userFindAllMock.mockResolvedValue([
      { id: 301, update: legacyUserUpdate }
    ]);

    await SyncWhatsAppLinkedUserService({
      whatsappId: 92,
      linkedUserId: 301
    });

    expect(userFindAllMock).toHaveBeenCalledWith({
      where: {
        id: {
          [Op.in]: [301]
        }
      }
    });

    expect(legacyUserUpdate).toHaveBeenCalledWith({
      whatsappId: 92
    });
  });

  it("does nothing when neither legacy nor multi-user linkage was submitted", async () => {
    await SyncWhatsAppLinkedUserService({
      whatsappId: 93
    });

    expect(userFindAllMock).not.toHaveBeenCalled();
    expect(userUpdateManyMock).not.toHaveBeenCalled();
  });

  it("rejects the change when any selected user does not exist", async () => {
    userFindAllMock.mockResolvedValue([
      { id: 401, update: jest.fn() }
    ]);

    await expect(
      SyncWhatsAppLinkedUserService({
        whatsappId: 94,
        linkedUserIds: [401, 402]
      })
    ).rejects.toMatchObject({
      message: "ERR_NO_USER_FOUND",
      statusCode: 404
    });

    expect(userUpdateManyMock).not.toHaveBeenCalled();
  });
});
