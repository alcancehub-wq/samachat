jest.mock("../../libs/socket", () => ({
  getIO: jest.fn()
}));

jest.mock("../../services/WbotServices/StartWhatsAppSession", () => ({
  StartWhatsAppSession: jest.fn()
}));

jest.mock("../../services/WhatsappService/CreateWhatsAppService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../services/WhatsappService/DeleteWhatsAppService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../services/WhatsappService/ListWhatsAppsService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../services/WhatsappService/ShowWhatsAppService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../services/WhatsappService/UpdateWhatsAppService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../services/WhatsappService/GetWhatsAppSharingSettingsService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../helpers/SerializeWhatsAppForClient", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../providers/WhatsApp", () => ({
  whatsappProvider: {
    removeSession: jest.fn()
  }
}));

import { getIO } from "../../libs/socket";
import CreateWhatsAppService from "../../services/WhatsappService/CreateWhatsAppService";
import ShowWhatsAppService from "../../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../../services/WhatsappService/UpdateWhatsAppService";
import GetWhatsAppSharingSettingsService from "../../services/WhatsappService/GetWhatsAppSharingSettingsService";
import SerializeWhatsAppForClient from "../../helpers/SerializeWhatsAppForClient";
import {
  show,
  store,
  update
} from "../WhatsAppController";

const getIOMock = getIO as jest.Mock;
const createMock = CreateWhatsAppService as jest.Mock;
const showMock = ShowWhatsAppService as jest.Mock;
const updateMock = UpdateWhatsAppService as jest.Mock;
const getSharingMock =
  GetWhatsAppSharingSettingsService as jest.Mock;
const serializeMock =
  SerializeWhatsAppForClient as jest.Mock;

const makeResponse = () => {
  const res: any = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

describe("WhatsAppController sharingSettings HTTP contract", () => {
  let io: { emit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    io = {
      emit: jest.fn()
    };

    getIOMock.mockReturnValue(io);

    serializeMock.mockImplementation((whatsapp: any) => ({
      id: whatsapp.id,
      name: whatsapp.name || "Connection"
    }));

    getSharingMock.mockResolvedValue({
      isShared: false,
      distributionEnabled: false,
      distributionMode: null,
      lastAssignedUserId: null,
      distributionUserIds: []
    });
  });

  it("adds sharingSettings to GET show response", async () => {
    showMock.mockResolvedValue({
      id: 1701,
      name: "Web connection"
    });

    getSharingMock.mockResolvedValue({
      isShared: true,
      distributionEnabled: true,
      distributionMode: "round_robin",
      lastAssignedUserId: 1801,
      distributionUserIds: [1801, 1802]
    });

    const req: any = {
      params: {
        whatsappId: "1701"
      }
    };

    const res = makeResponse();

    await show(req, res);

    expect(showMock).toHaveBeenCalledWith("1701");
    expect(getSharingMock).toHaveBeenCalledWith(1701);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 1701,
      name: "Web connection",
      sharingSettings: {
        isShared: true,
        distributionEnabled: true,
        distributionMode: "round_robin",
        lastAssignedUserId: 1801,
        distributionUserIds: [1801, 1802]
      }
    });
  });

  it("forwards sharingSettings on create and keeps socket payload historical", async () => {
    createMock.mockResolvedValue({
      whatsapp: {
        id: 1702
      },
      oldDefaultWhatsapp: null
    });

    showMock.mockResolvedValue({
      id: 1702,
      name: "Shared connection",
      providerType: "web"
    });

    getSharingMock.mockResolvedValue({
      isShared: true,
      distributionEnabled: true,
      distributionMode: "random",
      lastAssignedUserId: null,
      distributionUserIds: [1803]
    });

    const req: any = {
      body: {
        name: "Shared connection",
        queueIds: [1901],
        linkedUserIds: [1803, 1804],
        providerType: "web",
        sharingSettings: {
          isShared: true,
          distributionEnabled: true,
          distributionMode: "random",
          distributionUserIds: [1803]
        }
      }
    };

    const res = makeResponse();

    await store(req, res);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Shared connection",
        queueIds: [1901],
        linkedUserIds: [1803, 1804],
        providerType: "web",
        sharingSettings: {
          isShared: true,
          distributionEnabled: true,
          distributionMode: "random",
          distributionUserIds: [1803]
        }
      })
    );

    expect(getSharingMock).toHaveBeenCalledWith(1702);

    expect(res.json).toHaveBeenCalledWith({
      id: 1702,
      name: "Shared connection",
      sharingSettings: {
        isShared: true,
        distributionEnabled: true,
        distributionMode: "random",
        lastAssignedUserId: null,
        distributionUserIds: [1803]
      }
    });

    expect(io.emit).toHaveBeenCalledWith("whatsapp", {
      action: "update",
      whatsapp: {
        id: 1702,
        name: "Shared connection"
      }
    });

    expect(io.emit).not.toHaveBeenCalledWith(
      "whatsapp",
      expect.objectContaining({
        whatsapp: expect.objectContaining({
          sharingSettings: expect.anything()
        })
      })
    );
  });

  it("returns persisted sharingSettings on update and keeps socket payload historical", async () => {
    updateMock.mockResolvedValue({
      whatsapp: {
        id: 1703
      },
      oldDefaultWhatsapp: null
    });

    showMock.mockResolvedValue({
      id: 1703,
      name: "Updated connection",
      providerType: "web"
    });

    getSharingMock.mockResolvedValue({
      isShared: true,
      distributionEnabled: false,
      distributionMode: null,
      lastAssignedUserId: null,
      distributionUserIds: []
    });

    const req: any = {
      params: {
        whatsappId: "1703"
      },
      body: {
        name: "Updated connection",
        sharingSettings: {
          isShared: true,
          distributionEnabled: false
        }
      }
    };

    const res = makeResponse();

    await update(req, res);

    expect(updateMock).toHaveBeenCalledWith({
      whatsappData: req.body,
      whatsappId: "1703"
    });

    expect(getSharingMock).toHaveBeenCalledWith(1703);

    expect(res.json).toHaveBeenCalledWith({
      id: 1703,
      name: "Updated connection",
      sharingSettings: {
        isShared: true,
        distributionEnabled: false,
        distributionMode: null,
        lastAssignedUserId: null,
        distributionUserIds: []
      }
    });

    expect(io.emit).toHaveBeenCalledWith("whatsapp", {
      action: "update",
      whatsapp: {
        id: 1703,
        name: "Updated connection"
      }
    });

    expect(io.emit).not.toHaveBeenCalledWith(
      "whatsapp",
      expect.objectContaining({
        whatsapp: expect.objectContaining({
          sharingSettings: expect.anything()
        })
      })
    );
  });
});
