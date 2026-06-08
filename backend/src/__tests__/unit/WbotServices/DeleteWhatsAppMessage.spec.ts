import AppError from "../../../errors/AppError";
import Message from "../../../models/Message";
import { whatsappProvider } from "../../../providers/WhatsApp";
import DeleteWhatsAppMessage from "../../../services/WbotServices/DeleteWhatsAppMessage";
import ShowTicketService from "../../../services/TicketServices/ShowTicketService";
import { logger } from "../../../utils/logger";

jest.mock("../../../models/Message", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    deleteMessage: jest.fn()
  }
}));

jest.mock("../../../services/TicketServices/ShowTicketService", () => jest.fn());
jest.mock("../../../utils/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

const messageFindByPkMock = Message.findByPk as jest.Mock;
const deleteMessageMock = whatsappProvider.deleteMessage as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const loggerWarnMock = logger.warn as jest.Mock;

describe("DeleteWhatsAppMessage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("deletes an outbound message only after validating ticket access", async () => {
    const messageUpdateMock = jest.fn().mockResolvedValue(undefined);

    messageFindByPkMock.mockResolvedValue({
      id: "msg-1",
      ticketId: 91,
      fromMe: true,
      isInternal: false,
      update: messageUpdateMock,
      ticket: {
        whatsappId: 35,
        isGroup: false,
        contact: { number: "5511999999999" }
      }
    });
    showTicketServiceMock.mockResolvedValue({
      id: 91,
      whatsappId: 35,
      isGroup: false,
      contact: { number: "5511999999999" }
    });

    const result = await DeleteWhatsAppMessage("msg-1", {
      userId: 16,
      profile: "user"
    });

    expect(showTicketServiceMock).toHaveBeenCalledWith(91, {
      userId: 16,
      profile: "user"
    });
    expect(deleteMessageMock).toHaveBeenCalledWith(
      35,
      "5511999999999@c.us",
      "msg-1",
      true
    );
    expect(messageUpdateMock).toHaveBeenCalledWith({ isDeleted: true });
    expect(result.id).toBe("msg-1");
  });

  it("soft deletes internal messages without calling the WhatsApp provider", async () => {
    const messageUpdateMock = jest.fn().mockResolvedValue(undefined);

    messageFindByPkMock.mockResolvedValue({
      id: "msg-internal",
      ticketId: 91,
      fromMe: true,
      isInternal: true,
      update: messageUpdateMock,
      ticket: {
        whatsappId: 35,
        isGroup: false,
        contact: { number: "5511999999999" }
      }
    });
    showTicketServiceMock.mockResolvedValue({
      id: 91,
      whatsappId: 35,
      isGroup: false,
      contact: { number: "5511999999999" }
    });

    await DeleteWhatsAppMessage("msg-internal", {
      userId: 16,
      profile: "user"
    });

    expect(deleteMessageMock).not.toHaveBeenCalled();
    expect(messageUpdateMock).toHaveBeenCalledWith({ isDeleted: true });
  });

  it("rejects deleting a received customer message", async () => {
    const messageUpdateMock = jest.fn().mockResolvedValue(undefined);

    messageFindByPkMock.mockResolvedValue({
      id: "msg-received",
      ticketId: 91,
      fromMe: false,
      isInternal: false,
      update: messageUpdateMock,
      ticket: {
        whatsappId: 35,
        isGroup: false,
        contact: { number: "5511999999999" }
      }
    });
    showTicketServiceMock.mockResolvedValue({
      id: 91,
      whatsappId: 35,
      isGroup: false,
      contact: { number: "5511999999999" }
    });

    await expect(
      DeleteWhatsAppMessage("msg-received", {
        userId: 16,
        profile: "user"
      })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        message: "ERR_DELETE_RECEIVED_MESSAGE_NOT_ALLOWED",
        statusCode: 403
      })
    );

    expect(deleteMessageMock).not.toHaveBeenCalled();
    expect(messageUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects deletion when the ticket is not accessible to the user", async () => {
    const messageUpdateMock = jest.fn().mockResolvedValue(undefined);

    messageFindByPkMock.mockResolvedValue({
      id: "msg-locked",
      ticketId: 91,
      fromMe: true,
      isInternal: false,
      update: messageUpdateMock,
      ticket: {
        whatsappId: 35,
        isGroup: false,
        contact: { number: "5511999999999" }
      }
    });
    showTicketServiceMock.mockRejectedValue(
      new AppError("ERR_NO_TICKET_ACCESS", 403)
    );

    await expect(
      DeleteWhatsAppMessage("msg-locked", {
        userId: 16,
        profile: "user"
      })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        message: "ERR_NO_TICKET_ACCESS",
        statusCode: 403
      })
    );

    expect(deleteMessageMock).not.toHaveBeenCalled();
    expect(messageUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a controlled error and keeps the message visible when the WhatsApp provider revoke fails", async () => {
    const messageUpdateMock = jest.fn().mockResolvedValue(undefined);

    messageFindByPkMock.mockResolvedValue({
      id: "msg-provider-fail",
      ticketId: 91,
      fromMe: true,
      isInternal: false,
      update: messageUpdateMock,
      ticket: {
        whatsappId: 35,
        isGroup: false,
        contact: { number: "5511999999999" }
      }
    });
    showTicketServiceMock.mockResolvedValue({
      id: 91,
      whatsappId: 35,
      isGroup: false,
      contact: { number: "5511999999999" }
    });
    deleteMessageMock.mockRejectedValue(new Error("provider failed"));

    await expect(
      DeleteWhatsAppMessage("msg-provider-fail", {
        userId: 16,
        profile: "user"
      })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        message:
          "Nao foi possivel excluir esta mensagem no WhatsApp. Tente novamente ou verifique se ela ainda pode ser apagada.",
        statusCode: 422
      })
    );

    expect(deleteMessageMock).toHaveBeenCalledWith(
      35,
      "5511999999999@c.us",
      "msg-provider-fail",
      true
    );
    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        messageId: "msg-provider-fail",
        ticketId: 91,
        whatsappId: 35
      }),
      "DeleteWhatsAppMessage could not revoke remotely"
    );
    expect(messageUpdateMock).not.toHaveBeenCalled();
  });
});