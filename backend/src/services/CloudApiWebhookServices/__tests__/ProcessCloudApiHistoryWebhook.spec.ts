jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));
jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));
jest.mock("../../MessageServices/CreateMessageService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import Message from "../../../models/Message";
import CreateMessageService from "../../MessageServices/CreateMessageService";
import ProcessCloudApiHistoryWebhook from "../ProcessCloudApiHistoryWebhook";

const contactFindOneMock = Contact.findOne as jest.Mock;
const ticketFindAllMock = Ticket.findAll as jest.Mock;
const messageFindByPkMock = Message.findByPk as jest.Mock;
const createMessageMock = CreateMessageService as jest.Mock;

describe("ProcessCloudApiHistoryWebhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contactFindOneMock.mockResolvedValue({ id: 16 });
    ticketFindAllMock.mockResolvedValue([{ id: 118, userId: 7 }]);
    messageFindByPkMock.mockResolvedValue(null);
    createMessageMock.mockResolvedValue(undefined);
  });

  it("reports recognized history changes without claiming message restoration", async () => {
    const result = await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: {
        entry: [
          {
            changes: [{ field: "history", value: {} }]
          }
        ]
      }
    });

    expect(result).toEqual(
      expect.objectContaining({ recognizedHistoryChanges: 1 })
    );
    expect(result).not.toHaveProperty("processed");
  });

  it("silently persists only a new text history message on its single existing ticket", async () => {
    const result = await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: {
        entry: [{ changes: [{ field: "history", value: { history: [{ threads: [{ id: "553287072428", messages: [{ id: "wamid.history.1", from: "5511981901577", timestamp: "1770000100", type: "text", text: { body: "Historico" } }] }] }] } }] }]
      }
    });

    expect(result).toEqual({ recognizedHistoryChanges: 1, persistedMessages: 1, skippedMessages: 0 });
    expect(createMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      messageData: expect.objectContaining({ id: "wamid.history.1", ticketId: 118, createdAt: new Date(1770000100 * 1000) }),
      broadcastToTicketRoom: false,
      broadcastToStatus: false,
      broadcastToNotification: false
    }));
  });

  it("skips an existing WAMID without modifying a message or ticket", async () => {
    messageFindByPkMock.mockResolvedValue({ id: "wamid.history.1", ticketId: 118 });
    const result = await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: { entry: [{ changes: [{ field: "history", value: { history: [{ threads: [{ id: "553287072428", messages: [{ id: "wamid.history.1", from: "5511981901577", timestamp: "1770000100", type: "text", text: { body: "Historico" } }] }] }] } }] }] }
    });

    expect(result).toEqual({ recognizedHistoryChanges: 1, persistedMessages: 0, skippedMessages: 1 });
    expect(createMessageMock).not.toHaveBeenCalled();
  });
});