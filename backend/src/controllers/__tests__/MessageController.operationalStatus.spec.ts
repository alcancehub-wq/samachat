jest.mock("../../services/TicketServices/ShowTicketService", () => jest.fn());
jest.mock("../../services/MessageServices/CreateMessageService", () => jest.fn());
jest.mock("../../services/WbotServices/DeleteWhatsAppMessage", () => jest.fn());
jest.mock("../../services/WbotServices/SendWhatsAppMessage", () => jest.fn());
jest.mock("../../services/WbotServices/SendWhatsAppMedia", () => jest.fn());
jest.mock("../../helpers/SetTicketMessagesAsRead", () => jest.fn());
jest.mock("../../libs/socket", () => ({ getIO: jest.fn() }));

import CreateMessageService from "../../services/MessageServices/CreateMessageService";
import { getIO } from "../../libs/socket";
import ShowTicketService from "../../services/TicketServices/ShowTicketService";
import SendWhatsAppMedia from "../../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../../services/WbotServices/SendWhatsAppMessage";
import { store } from "../MessageController";

const showTicketServiceMock = ShowTicketService as jest.Mock;
const createMessageServiceMock = CreateMessageService as jest.Mock;
const sendWhatsAppMessageMock = SendWhatsAppMessage as jest.Mock;
const sendWhatsAppMediaMock = SendWhatsAppMedia as jest.Mock;
const getIOMock = getIO as jest.Mock;

describe("MessageController operational status guard", () => {
  const response = () => ({ send: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() });
  const request = (medias?: any[]) => ({
    params: { ticketId: "51" },
    user: { id: 7, profile: "user" },
    body: { body: "hello", isInternal: false },
    files: medias
  });

  beforeEach(() => {
    jest.resetAllMocks();
    const io = { to: jest.fn(), emit: jest.fn() };
    io.to.mockReturnValue(io);
    getIOMock.mockReturnValue(io);
  });

  it.each([
    ["T09 pending text", "pending", undefined],
    ["T10 pending media", "pending", [{ filename: "image.png", mimetype: "image/png", originalname: "image.png" }]],
    ["T11 closed text", "closed", undefined],
    ["T12 closed media", "closed", [{ filename: "image.png", mimetype: "image/png", originalname: "image.png" }]],
    ["T13 lost text", "lost", undefined],
    ["T13 lost media", "lost", [{ filename: "image.png", mimetype: "image/png", originalname: "image.png" }]]
  ])("%s rejects before provider or persistence", async (_scenario, status, medias) => {
    showTicketServiceMock.mockResolvedValue({ id: 51, status, whatsappId: 4 });

    await expect(store(request(medias) as any, response() as any)).rejects.toMatchObject({
      message: "ERR_TICKET_NOT_OPEN_FOR_SEND",
      statusCode: 409
    });

    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
    expect(sendWhatsAppMediaMock).not.toHaveBeenCalled();
    expect(createMessageServiceMock).not.toHaveBeenCalled();
  });

  it("T14 permits an open ticket to send text through the mocked provider", async () => {
    const ticket: any = {
      id: 51,
      status: "open",
      whatsappId: 4,
      reload: jest.fn().mockResolvedValue(undefined)
    };
    showTicketServiceMock.mockResolvedValue(ticket);
    sendWhatsAppMessageMock.mockResolvedValue({ id: "provider-1", body: "hello", type: "chat", ack: 1 });
    createMessageServiceMock.mockResolvedValue(undefined);

    await expect(store(request() as any, response() as any)).resolves.toBeUndefined();

    expect(sendWhatsAppMessageMock).toHaveBeenCalledWith(expect.objectContaining({ ticket }));
    expect(createMessageServiceMock).toHaveBeenCalledWith(expect.objectContaining({
      messageData: expect.objectContaining({ ticketId: 51, body: "hello" })
    }));
  });
});