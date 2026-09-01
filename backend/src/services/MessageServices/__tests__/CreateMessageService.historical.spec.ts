jest.mock("../../../libs/socket", () => ({
  getIO: jest.fn()
}));

jest.mock("../../../helpers/socketRooms", () => ({
  getScopedNotificationRoom: jest.fn(() => "notification"),
  getScopedTicketsRoom: jest.fn(() => "tickets")
}));

jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    upsert: jest.fn()
  }
}));

jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: {}
}));

jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: {}
}));

import { getIO } from "../../../libs/socket";
import Message from "../../../models/Message";
import CreateMessageService from "../CreateMessageService";

const getIOMock = getIO as jest.Mock;
const findByPkMock = Message.findByPk as jest.Mock;
const upsertMock = Message.upsert as jest.Mock;

describe("CreateMessageService historical persistence contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards the provider timestamp as createdAt during historical persistence", async () => {
    const providerCreatedAt = new Date("2026-08-20T14:30:15.000Z");

    const storedMessage = {
      id: "wamid.history.persistence.1",
      ticketId: 118,
      body: "Mensagem historica",
      fromMe: true,
      createdAt: providerCreatedAt,
      ticket: {
        id: 118,
        status: "open",
        whatsappId: 35,
        contact: { id: 16 }
      }
    };

    findByPkMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedMessage);

    upsertMock.mockResolvedValue(undefined);
    getIOMock.mockReturnValue({
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    });

    await CreateMessageService({
      messageData: {
        id: "wamid.history.persistence.1",
        ticketId: 118,
        body: "Mensagem historica",
        fromMe: true,
        read: true,
        ack: 1,
        createdAt: providerCreatedAt
      },
      broadcastToTicketRoom: false,
      broadcastToStatus: false,
      broadcastToNotification: false
    } as any);

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "wamid.history.persistence.1",
        ticketId: 118,
        fromMe: true,
        createdAt: providerCreatedAt
      })
    );
  });

  it("does not touch socket infrastructure when every broadcast is disabled", async () => {
    const providerCreatedAt = new Date("2026-08-20T14:31:15.000Z");

    const storedMessage = {
      id: "wamid.history.persistence.2",
      ticketId: 118,
      body: "Mensagem historica silenciosa",
      fromMe: true,
      createdAt: providerCreatedAt,
      ticket: {
        id: 118,
        status: "open",
        whatsappId: 35,
        contact: { id: 16 }
      }
    };

    findByPkMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedMessage);

    upsertMock.mockResolvedValue(undefined);
    getIOMock.mockImplementation(() => {
      throw new Error("SOCKET_MUST_NOT_BE_TOUCHED");
    });

    await CreateMessageService({
      messageData: {
        id: "wamid.history.persistence.2",
        ticketId: 118,
        body: "Mensagem historica silenciosa",
        fromMe: true,
        read: true,
        ack: 1,
        createdAt: providerCreatedAt
      },
      broadcastToTicketRoom: false,
      broadcastToStatus: false,
      broadcastToNotification: false
    } as any);

    expect(getIOMock).not.toHaveBeenCalled();
  });

  it("keeps normal socket broadcasting when broadcasts are enabled", async () => {
    const ticketRoomEmitMock = jest.fn();
    const statusEmitMock = jest.fn();

    const ticketRoomToMock = jest.fn(() => ({
      emit: ticketRoomEmitMock
    }));

    const broadcasterMock: any = {
      to: jest.fn(),
      emit: statusEmitMock
    };

    broadcasterMock.to.mockReturnValue(broadcasterMock);

    const ioMock = {
      to: jest.fn((room: string) => {
        if (room === "118") {
          return ticketRoomToMock(room);
        }
        return broadcasterMock.to();
      })
    };

    const storedMessage = {
      id: "wamid.normal.broadcast.1",
      ticketId: 118,
      body: "Mensagem normal",
      fromMe: true,
      ticket: {
        id: 118,
        status: "open",
        whatsappId: 35,
        contact: { id: 16 }
      }
    };

    findByPkMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedMessage);

    upsertMock.mockResolvedValue(undefined);
    getIOMock.mockReturnValue(ioMock);

    await CreateMessageService({
      messageData: {
        id: "wamid.normal.broadcast.1",
        ticketId: 118,
        body: "Mensagem normal",
        fromMe: true,
        read: true,
        ack: 1
      }
    });

    expect(getIOMock).toHaveBeenCalledTimes(1);
    expect(ioMock.to).toHaveBeenCalledWith("118");
    expect(ticketRoomEmitMock).toHaveBeenCalledWith(
      "appMessage",
      expect.objectContaining({
        action: "create",
        message: storedMessage
      })
    );
    expect(statusEmitMock).toHaveBeenCalledWith(
      "appMessage",
      expect.objectContaining({
        action: "create",
        message: storedMessage
      })
    );
  });
});
