jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: { findByPk: jest.fn(), findAll: jest.fn() }
}));
jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));
jest.mock("../../MessageServices/CreateMessageService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../TicketServices/ResolveOperationalTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../CloudApiServices/CloudApiClient", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../../handlers/handleWhatsappEvents", () => ({
  saveMediaFile: jest.fn()
}));

import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Whatsapp from "../../../models/Whatsapp";
import CreateMessageService from "../../MessageServices/CreateMessageService";
import ResolveOperationalTicketService from "../../TicketServices/ResolveOperationalTicketService";
import CloudApiClient from "../../CloudApiServices/CloudApiClient";
import { saveMediaFile } from "../../../handlers/handleWhatsappEvents";
import ProcessCloudApiHistoryWebhook from "../ProcessCloudApiHistoryWebhook";

const contactFindOneMock = Contact.findOne as jest.Mock;
const messageFindByPkMock = Message.findByPk as jest.Mock;
const createMessageMock = CreateMessageService as jest.Mock;
const resolveOperationalTicketMock = ResolveOperationalTicketService as jest.Mock;
const whatsappFindByPkMock = Whatsapp.findByPk as jest.Mock;
const cloudApiClientMock = CloudApiClient as jest.Mock;
const saveMediaFileMock = saveMediaFile as jest.Mock;
const retrieveMediaMock = jest.fn();
const downloadMediaMock = jest.fn();

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

const mediaMessage = (
  type: "audio" | "image" | "video" | "document",
  overrides: any = {}
) => ({
  id: `wamid.history.${type}`,
  from: "5511981901577",
  timestamp: "1770000100",
  type,
  [type]: {
    id: `media-${type}`,
    mime_type: `${type}/metadata`,
    caption: "Legenda",
    filename: `${type}.bin`
  },
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
    whatsappFindByPkMock.mockResolvedValue({
      accessToken: "token",
      phoneNumberId: "phone",
      apiVersion: "v20.0"
    });
    retrieveMediaMock.mockResolvedValue({
      url: "https://media.example/file",
      mime_type: "image/metadata"
    });
    downloadMediaMock.mockResolvedValue({
      data: Buffer.from("media"),
      mimetype: "image/downloaded"
    });
    cloudApiClientMock.mockImplementation(() => ({
      retrieveMedia: retrieveMediaMock,
      downloadMedia: downloadMediaMock
    }));
    saveMediaFileMock.mockResolvedValue("stored-file");
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
      payload: buildPayload(textMessage({ id: "wamid.sticker", type: "sticker" }))
    })).resolves.toEqual({ recognizedHistoryChanges: 1, persistedMessages: 0, skippedMessages: 1 });
  });

  it.each(["audio", "image", "video", "document"] as const)(
    "restores %s history media passively",
    async type => {
      await expect(ProcessCloudApiHistoryWebhook({
        whatsappId: 35,
        payload: buildPayload(mediaMessage(type))
      })).resolves.toEqual({
        recognizedHistoryChanges: 1,
        persistedMessages: 1,
        skippedMessages: 0
      });

      expect(retrieveMediaMock).toHaveBeenCalledWith(`media-${type}`);
      expect(downloadMediaMock).toHaveBeenCalledWith("https://media.example/file");
      expect(saveMediaFileMock).toHaveBeenCalledWith({
        filename: `${type}.bin`,
        mimetype: "image/downloaded",
        data: Buffer.from("media").toString("base64")
      });
      expect(createMessageMock).toHaveBeenCalledWith(expect.objectContaining({
        messageData: expect.objectContaining({
          mediaType: type,
          mediaUrl: "stored-file",
          body: "Legenda",
          createdAt: new Date(1770000100 * 1000)
        }),
        broadcastToTicketRoom: false,
        broadcastToStatus: false,
        broadcastToNotification: false
      }));
    }
  );

  it("uses filename and metadata mimetype when caption and downloaded mimetype are unavailable", async () => {
    downloadMediaMock.mockResolvedValueOnce({ data: Buffer.from("media"), mimetype: "" });
    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(mediaMessage("document", {
        document: { id: "media-document", filename: "arquivo.pdf" }
      }))
    });

    expect(saveMediaFileMock).toHaveBeenCalledWith(expect.objectContaining({
      filename: "arquivo.pdf",
      mimetype: "image/metadata"
    }));
    expect(createMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      messageData: expect.objectContaining({ body: "arquivo.pdf" })
    }));
  });

  it.each(["missing id", "missing URL", "retrieve failure", "download failure", "save failure"])(
    "skips media on %s and continues the batch",
    async failure => {
      const first: any = mediaMessage("image");
      const second = mediaMessage("video", {
        id: "wamid.history.video.2",
        video: { id: "media-video-2" }
      });
      if (failure === "missing id") first.image = {};
      if (failure === "missing URL") retrieveMediaMock.mockResolvedValueOnce({});
      if (failure === "retrieve failure") retrieveMediaMock.mockRejectedValueOnce(new Error("retrieve"));
      if (failure === "download failure") downloadMediaMock.mockRejectedValueOnce(new Error("download"));
      if (failure === "save failure") saveMediaFileMock.mockRejectedValueOnce(new Error("save"));

      await expect(ProcessCloudApiHistoryWebhook({
        whatsappId: 35,
        payload: buildPayload(first)
      })).resolves.toEqual(expect.objectContaining({ persistedMessages: 0, skippedMessages: 1 }));
      await expect(ProcessCloudApiHistoryWebhook({
        whatsappId: 35,
        payload: buildPayload(second)
      })).resolves.toEqual(expect.objectContaining({ persistedMessages: 1 }));
    }
  );

  it("skips exact WAMID before downloading and keeps inbound media out of logical deduplication", async () => {
    messageFindByPkMock.mockResolvedValueOnce({ id: "wamid.history.image" });
    await ProcessCloudApiHistoryWebhook({ whatsappId: 35, payload: buildPayload(mediaMessage("image")) });
    expect(retrieveMediaMock).not.toHaveBeenCalled();

    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(mediaMessage("audio", { from: "553287072428" }))
    });
    expect(Message.findAll).not.toHaveBeenCalled();
  });

  it("deduplicates one temporary media candidate but preserves ambiguous and real ids", async () => {
    (Message.findAll as jest.Mock).mockResolvedValueOnce([
      { id: "fallback_1770000100", createdAt: new Date(1770000100 * 1000) }
    ]);
    await ProcessCloudApiHistoryWebhook({ whatsappId: 35, payload: buildPayload(mediaMessage("image")) });
    expect(createMessageMock).not.toHaveBeenCalled();

    (Message.findAll as jest.Mock).mockResolvedValueOnce([
      { id: "fallback_a", createdAt: new Date() },
      { id: "fallback_b", createdAt: new Date() }
    ]);
    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(mediaMessage("image", { id: "wamid.ambiguous" }))
    });
    (Message.findAll as jest.Mock).mockResolvedValueOnce([
      { id: "wamid.real.other", createdAt: new Date() }
    ]);
    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(mediaMessage("image", { id: "wamid.real.new" }))
    });
    expect(createMessageMock).toHaveBeenCalledTimes(2);
  });

  it("skips an outbound media duplicate before creating the media client", async () => {
    (Message.findAll as jest.Mock).mockResolvedValueOnce([
      { id: "fallback_1770000100", createdAt: new Date(1770000100 * 1000) }
    ]);

    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(mediaMessage("image"))
    });

    expect(whatsappFindByPkMock).not.toHaveBeenCalled();
    expect(retrieveMediaMock).not.toHaveBeenCalled();
    expect(downloadMediaMock).not.toHaveBeenCalled();
    expect(saveMediaFileMock).not.toHaveBeenCalled();
  });

  it.each(["ptt", "chat"])("deduplicates outbound audio persisted as %s before download", async persistedType => {
    (Message.findAll as jest.Mock).mockResolvedValueOnce([
      { id: "fallback_audio", createdAt: new Date(1770000100 * 1000) }
    ]);

    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(mediaMessage("audio"))
    });

    expect(Message.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ mediaType: expect.anything() })
    }));
    const mediaTypes = (Message.findAll as jest.Mock).mock.calls[0][0].where.mediaType;
    const mediaTypeValues = mediaTypes[Object.getOwnPropertySymbols(mediaTypes)[0]];
    expect(mediaTypeValues).toContain(persistedType);
    expect(retrieveMediaMock).not.toHaveBeenCalled();
  });

  it("uses the persisted filename when media has neither caption nor original filename", async () => {
    await ProcessCloudApiHistoryWebhook({
      whatsappId: 35,
      payload: buildPayload(mediaMessage("image", {
        image: { id: "media-image" }
      }))
    });

    expect(createMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      messageData: expect.objectContaining({ body: "stored-file" })
    }));
  });
});