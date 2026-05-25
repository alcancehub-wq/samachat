import Message from "../../../models/Message";
import { getIO } from "../../../libs/socket";
import CreateMessageService from "../CreateMessageService";

jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: {
    upsert: jest.fn(),
    findByPk: jest.fn()
  }
}));

jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: "Ticket"
}));

jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: "Whatsapp"
}));

jest.mock("../../../libs/socket", () => ({
  getIO: jest.fn()
}));

const messageUpsertMock = (Message as unknown as {
  upsert: jest.Mock;
  findByPk: jest.Mock;
}).upsert;

const messageFindByPkMock = (Message as unknown as {
  upsert: jest.Mock;
  findByPk: jest.Mock;
}).findByPk;

const getIOMock = getIO as jest.Mock;

describe("CreateMessageService realtime delivery", () => {
  const emitMock = jest.fn();
  const toMock = jest.fn();
  const ioMock = {
    to: toMock,
    emit: emitMock
  };

  beforeEach(() => {
    jest.clearAllMocks();
    toMock.mockReturnThis();
    getIOMock.mockReturnValue(ioMock);
    messageUpsertMock.mockResolvedValue(undefined);
  });

  it("publishes new messages to the owner room and the admin rooms", async () => {
    messageFindByPkMock.mockResolvedValue({
      id: "msg-1",
      ticketId: 118,
      ticket: {
        id: 118,
        status: "pending",
        whatsappId: 35,
        userId: 16,
        contact: { id: 9, name: "Larissa" }
      }
    });

    await CreateMessageService({
      messageData: {
        id: "msg-1",
        ticketId: 118,
        body: "hello"
      }
    } as any);

    expect(toMock).toHaveBeenCalledWith("118");
    expect(toMock).toHaveBeenCalledWith("tickets:pending:all");
    expect(toMock).toHaveBeenCalledWith("tickets:pending:whatsapp:35");
    expect(toMock).toHaveBeenCalledWith("tickets:pending:user:16");
    expect(toMock).toHaveBeenCalledWith("notification:all");
    expect(toMock).toHaveBeenCalledWith("notification:whatsapp:35");
    expect(toMock).toHaveBeenCalledWith("notification:user:16");
    expect(emitMock).toHaveBeenCalledWith(
      "appMessage",
      expect.objectContaining({
        action: "create",
        ticket: expect.objectContaining({ id: 118, userId: 16 })
      })
    );
  });

  it("does not emit user-scoped rooms when the ticket has no owner", async () => {
    messageFindByPkMock.mockResolvedValue({
      id: "msg-2",
      ticketId: 119,
      ticket: {
        id: 119,
        status: "pending",
        whatsappId: 35,
        userId: null,
        contact: { id: 10, name: "Kesia" }
      }
    });

    await CreateMessageService({
      messageData: {
        id: "msg-2",
        ticketId: 119,
        body: "hello"
      }
    } as any);

    expect(toMock).not.toHaveBeenCalledWith("tickets:pending:user:16");
    expect(toMock).not.toHaveBeenCalledWith("notification:user:16");
    expect(toMock).toHaveBeenCalledWith("tickets:pending:all");
    expect(toMock).toHaveBeenCalledWith("notification:all");
  });
});