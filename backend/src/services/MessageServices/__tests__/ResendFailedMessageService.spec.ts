jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

jest.mock("../../TicketServices/ShowTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../UserServices/ShowUserService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../OutboundChannelServices/ResolveOutboundChannelService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../WbotServices/SendWhatsAppMessage", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../WbotServices/SendStoredWhatsAppMedia", () => ({
  __esModule: true,
  default: jest.fn()
}));

import AppError from "../../../errors/AppError";
import Message from "../../../models/Message";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import SendWhatsAppMessage from "../../WbotServices/SendWhatsAppMessage";
import SendStoredWhatsAppMedia from "../../WbotServices/SendStoredWhatsAppMedia";
import ResendFailedMessageService from "../ResendFailedMessageService";

const findByPkMock =
  Message.findByPk as jest.Mock;

const updateMock =
  Message.update as jest.Mock;

const showTicketMock =
  ShowTicketService as jest.Mock;

const sendTextMock =
  SendWhatsAppMessage as jest.Mock;

const sendMediaMock =
  SendStoredWhatsAppMedia as jest.Mock;

const accessData = {
  userId: 7,
  profile: "user"
};

const buildTicket = () => ({
  id: 51,
  status: "open",
  whatsappId: 4,
  replyOutboundMode: "AUTO",
  replyDeliveryWhatsappId: null,
  contact: {
    id: 10,
    number: "5511999999999",
    lid: null
  },
  user: {
    id: 7,
    name: "Tester"
  },
  queue: null,
  whatsapp: {
    name: "Main",
    providerType: "web"
  }
});

const buildMessage = (
  overrides: Record<string, unknown> = {}
) => ({
  id: "failed-1",
  ticketId: 51,
  body: "hello",
  fromMe: true,
  isInternal: false,
  isDeleted: false,
  ack: -1,
  mediaType: "chat",
  quotedMsg: undefined,
  getDataValue: jest.fn(() => null),
  ...overrides
});

describe(
  "ResendFailedMessageService",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      showTicketMock.mockResolvedValue(
        buildTicket()
      );
    });

    it(
      "blocks ack -2 because delivery is ambiguous",
      async () => {
        findByPkMock.mockResolvedValueOnce(
          buildMessage({
            ack: -2
          })
        );

        await expect(
          ResendFailedMessageService({
            messageId: "failed-1",
            accessData
          })
        ).rejects.toMatchObject({
          message:
            "ERR_MESSAGE_RESEND_NOT_ALLOWED",
          statusCode: 409
        });

        expect(
          sendTextMock
        ).not.toHaveBeenCalled();

        expect(
          sendMediaMock
        ).not.toHaveBeenCalled();

        expect(
          updateMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "reuses text pipeline and adopts provider id",
      async () => {
        const failedMessage =
          buildMessage();

        const finalMessage = {
          ...failedMessage,
          id: "provider-new-1",
          ack: 1
        };

        findByPkMock
          .mockResolvedValueOnce(
            failedMessage
          )
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(
            finalMessage
          );

        updateMock
          .mockResolvedValueOnce([1])
          .mockResolvedValueOnce([1]);

        sendTextMock.mockResolvedValue({
          id: "provider-new-1",
          body: "hello",
          fromMe: true,
          hasMedia: false,
          type: "chat",
          timestamp: 123,
          from: "",
          to: "",
          ack: 1
        });

        const result =
          await ResendFailedMessageService({
            messageId: "failed-1",
            accessData
          });

        expect(
          sendTextMock
        ).toHaveBeenCalled();

        expect(
          updateMock
        ).toHaveBeenNthCalledWith(
          1,
          { ack: 0 },
          {
            where: {
              id: "failed-1",
              ack: -1
            }
          }
        );

        expect(
          updateMock
        ).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            id: "provider-new-1",
            ack: 1
          }),
          {
            where: {
              id: "failed-1",
              ack: 0
            }
          }
        );

        expect(
          result.previousMessageId
        ).toBe("failed-1");

        expect(
          result.message.id
        ).toBe("provider-new-1");
      }
    );

    it(
      "reuses persisted media",
      async () => {
        const failedMessage =
          buildMessage({
            body:
              "recorded_1758840000000.ogg",
            mediaType: "audio",
            getDataValue: jest.fn(
              (key: string) =>
                key === "mediaUrl"
                  ? "voice.ABC12.mp3"
                  : null
            )
          });

        const finalMessage = {
          ...failedMessage,
          id: "provider-audio-1",
          ack: 1
        };

        findByPkMock
          .mockResolvedValueOnce(
            failedMessage
          )
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(
            finalMessage
          );

        updateMock
          .mockResolvedValueOnce([1])
          .mockResolvedValueOnce([1]);

        sendMediaMock.mockResolvedValue({
          id: "provider-audio-1",
          body: "",
          fromMe: true,
          hasMedia: true,
          type: "ptt",
          timestamp: 123,
          from: "",
          to: "",
          ack: 1
        });

        await ResendFailedMessageService({
          messageId: "failed-1",
          accessData
        });

        expect(
          sendMediaMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName:
              "voice.ABC12.mp3",
            body:
              "recorded_1758840000000.ogg",
            forceSendAudioAsVoice:
              true
          })
        );
      }
    );

    it(
      "marks ambiguous resend as -2",
      async () => {
        const failedMessage =
          buildMessage();

        findByPkMock
          .mockResolvedValueOnce(
            failedMessage
          );

        updateMock
          .mockResolvedValueOnce([1])
          .mockResolvedValueOnce([1]);

        sendTextMock.mockRejectedValue(
          new AppError(
            "ERR_SENDING_WAPP_MSG"
          )
        );

        await expect(
          ResendFailedMessageService({
            messageId: "failed-1",
            accessData
          })
        ).rejects.toMatchObject({
          message:
            "ERR_SENDING_WAPP_MSG"
        });

        expect(
          updateMock
        ).toHaveBeenNthCalledWith(
          2,
          { ack: -2 },
          {
            where: {
              id: "failed-1"
            }
          }
        );
      }
    );

    it(
      "blocks duplicate simultaneous claim",
      async () => {
        const failedMessage =
          buildMessage();

        findByPkMock
          .mockResolvedValueOnce(
            failedMessage
          );

        updateMock
          .mockResolvedValueOnce([0]);

        await expect(
          ResendFailedMessageService({
            messageId: "failed-1",
            accessData
          })
        ).rejects.toMatchObject({
          message:
            "ERR_MESSAGE_RESEND_STATE_CHANGED",
          statusCode: 409
        });

        expect(
          sendTextMock
        ).not.toHaveBeenCalled();

        expect(
          sendMediaMock
        ).not.toHaveBeenCalled();
      }
    );
  }
);
