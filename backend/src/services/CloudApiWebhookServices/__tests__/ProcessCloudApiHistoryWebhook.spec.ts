jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: { findByPk: jest.fn(), findAll: jest.fn() }
}));
jest.mock("../../MessageServices/CreateMessageService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../TicketServices/ResolveOperationalTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import CreateMessageService from "../../MessageServices/CreateMessageService";
import ResolveOperationalTicketService from "../../TicketServices/ResolveOperationalTicketService";
import ProcessCloudApiHistoryWebhook from "../ProcessCloudApiHistoryWebhook";

const contactFindOneMock = Contact.findOne as jest.Mock;
const messageFindByPkMock = Message.findByPk as jest.Mock;
const createMessageMock = CreateMessageService as jest.Mock;
const resolveOperationalTicketMock = ResolveOperationalTicketService as jest.Mock;

const buildPayload = (message: any) => ({
  entry: [{ changes: [{ field: "history", value: { history: [{ threads: [{ id: "553287072428", messages: [message] }] }] } }] }]
});

const textMessage = (overrides = {}) => ({
  id: "wamid.history.1",
  from: "5511981901577",
  timestamp: "1770000100",
  type: "text",
  text: { body: "Historico" },
  ...overrides
});

describe("ProcessCloudApiHistoryWebhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contactFindOneMock.mockResolvedValue({ id: 16, allowMultipleConversations: false });
    resolveOperationalTicketMock.mockResolvedValue({ id: 118, userId: 7 });
    messageFindByPkMock.mockResolvedValue(null);
    (Message.findAll as jest.Mock).mockResolvedValue([]);
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
        ...buildPayload(textMessage())
      }
    });

    expect(result).toEqual({ recognizedHistoryChanges: 1, persistedMessages: 1, skippedMessages: 0 });
    expect(createMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      messageData: expect.objectContaining({ id: "wamid.history.1", ticketId: 118, createdAt: new Date(1770000100 * 1000) }),
      broadcastToTicketRoom: false,
      broadcastToStatus: false,
      broadcastToNotification: false
    }));
    expect(resolveOperationalTicketMock).toHaveBeenCalledWith({
      contactId: 16,
      allowMultipleConversations: false
    });
  });

  it("skips an existing WAMID without modifying a message or ticket", async () => {
    messageFindByPkMock.mockResolvedValue({ id: "wamid.history.1", ticketId: 118 });
    const result = await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(textMessage())
    });

    expect(result).toEqual({ recognizedHistoryChanges: 1, persistedMessages: 0, skippedMessages: 1 });
    expect(createMessageMock).not.toHaveBeenCalled();
  });

  it("uses the webhook connection only for contacts allowing multiple conversations", async () => {
    contactFindOneMock.mockResolvedValueOnce({ id: 16, allowMultipleConversations: true });

    await ProcessCloudApiHistoryWebhook({ whatsappId: 35, payload: buildPayload(textMessage()) });

    expect(resolveOperationalTicketMock).toHaveBeenCalledWith({
      contactId: 16,
      allowMultipleConversations: true,
      whatsappId: 35
    });
  });

  it("skips a thread when the canonical ticket resolver returns null", async () => {
    resolveOperationalTicketMock.mockResolvedValueOnce(null);

    await expect(ProcessCloudApiHistoryWebhook({ whatsappId: 35, payload: buildPayload(textMessage()) })).resolves.toEqual({
      recognizedHistoryChanges: 1,
      persistedMessages: 0,
      skippedMessages: 1
    });
    expect(createMessageMock).not.toHaveBeenCalled();
  });

  it.each(["fallback_1770000100", "wwebjs-accepted-35-1770000100000", "evt_me_1770000100_remote_local"]) (
    "skips logical duplicate against temporary outbound id %s",
    async candidateId => {
      (Message.findAll as jest.Mock).mockResolvedValueOnce([
        { id: candidateId, createdAt: new Date(1770000100 * 1000) }
      ]);

      await expect(ProcessCloudApiHistoryWebhook({ whatsappId: 35, payload: buildPayload(textMessage()) })).resolves.toEqual({
        recognizedHistoryChanges: 1,
        persistedMessages: 0,
        skippedMessages: 1
      });
      expect(createMessageMock).not.toHaveBeenCalled();
    }
  );

  it("skips serialized and raw representations of the same provider id", async () => {
    (Message.findAll as jest.Mock).mockResolvedValueOnce([
      { id: "true_553287072428_wamid.serialized", createdAt: new Date(1770000100 * 1000) }
    ]);

    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(textMessage({ id: "wamid.serialized" }))
    });

    expect(createMessageMock).not.toHaveBeenCalled();
  });

  it("persists real ids that only share body and a nearby timestamp", async () => {
    (Message.findAll as jest.Mock).mockResolvedValueOnce([
      { id: "wamid.other.real", createdAt: new Date(1770000100 * 1000) }
    ]);

    await ProcessCloudApiHistoryWebhook({ whatsappId: 35, payload: buildPayload(textMessage()) });

    expect(createMessageMock).toHaveBeenCalledTimes(1);
  });

  it("does not deduplicate a temporary id outside the twenty-second window", async () => {
    (Message.findAll as jest.Mock).mockResolvedValueOnce([]);

    await ProcessCloudApiHistoryWebhook({ whatsappId: 35, payload: buildPayload(textMessage()) });

    expect(createMessageMock).toHaveBeenCalledTimes(1);
    expect(Message.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ mediaType: "chat" }),
      order: [["createdAt", "DESC"]],
      limit: 5
    }));
  });

  it("keeps recorded-audio candidates outside the textual history contract", async () => {
    (Message.findAll as jest.Mock).mockResolvedValueOnce([]);

    await ProcessCloudApiHistoryWebhook({ whatsappId: 35, payload: buildPayload(textMessage()) });

    expect(createMessageMock).toHaveBeenCalledTimes(1);
    expect(Message.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ mediaType: "chat" })
    }));
  });

  it("does not use logical deduplication for inbound or non-text history", async () => {
    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(textMessage({ id: "wamid.inbound", from: "553287072428" }))
    });
    expect(Message.findAll).not.toHaveBeenCalled();

    await expect(ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(textMessage({ id: "wamid.image", type: "image" }))
    })).resolves.toEqual({ recognizedHistoryChanges: 1, persistedMessages: 0, skippedMessages: 1 });
  });
});