import { revokeMessageWithLookupFallback } from "../wwebjsDeleteLookup";

const buildSerializedMessageId = (
  chatId: string,
  fromMe: boolean,
  messageId: string
): string => `${fromMe}_${chatId}_${messageId}`;

const logger = {
  warn: jest.fn()
};

describe("wwebjs delete message lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the serialized id directly when getMessageById resolves the message", async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const getMessageById = jest.fn().mockResolvedValue({
      delete: deleteMock
    });
    const getChatById = jest.fn();

    await revokeMessageWithLookupFallback(
      {
        getMessageById,
        getChatById
      },
      "5511999999999@c.us",
      "3EB05C4B50B58B87D42E7F",
      true,
      buildSerializedMessageId,
      logger
    );

    expect(getMessageById).toHaveBeenCalledWith(
      "true_5511999999999@c.us_3EB05C4B50B58B87D42E7F"
    );
    expect(deleteMock).toHaveBeenCalledWith(true);
    expect(getChatById).not.toHaveBeenCalled();
  });

  it("falls back to recent chat messages when direct lookup does not find the message", async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const fetchMessages = jest.fn().mockResolvedValue([
      {
        id: {
          id: "3EB05C4B50B58B87D42E7F",
          _serialized: "true_5511999999999@c.us_3EB05C4B50B58B87D42E7F"
        },
        fromMe: true,
        delete: deleteMock
      }
    ]);
    const getMessageById = jest.fn().mockResolvedValue(null);
    const getChatById = jest.fn().mockResolvedValue({
      fetchMessages
    });

    await revokeMessageWithLookupFallback(
      {
        getMessageById,
        getChatById
      },
      "5511999999999@c.us",
      "3EB05C4B50B58B87D42E7F",
      true,
      buildSerializedMessageId,
      logger
    );

    expect(getMessageById).toHaveBeenCalledWith(
      "true_5511999999999@c.us_3EB05C4B50B58B87D42E7F"
    );
    expect(getChatById).toHaveBeenCalledWith("5511999999999@c.us");
    expect(fetchMessages).toHaveBeenCalledWith({ limit: 50 });
    expect(deleteMock).toHaveBeenCalledWith(true);
  });

  it("throws when neither direct lookup nor chat fallback can find the message", async () => {
    const fetchMessages = jest.fn().mockResolvedValue([]);
    const getMessageById = jest.fn().mockResolvedValue(null);
    const getChatById = jest.fn().mockResolvedValue({
      fetchMessages
    });

    await expect(
      revokeMessageWithLookupFallback(
        {
          getMessageById,
          getChatById
        },
        "5511999999999@c.us",
        "3EB05C4B50B58B87D42E7F",
        true,
        buildSerializedMessageId,
        logger
      )
    ).rejects.toThrow(
      "WWebJS delete lookup could not find message true_5511999999999@c.us_3EB05C4B50B58B87D42E7F in chat 5511999999999@c.us"
    );
  });

  it("bubbles the revoke failure when the located message cannot be deleted", async () => {
    const deleteError = new Error("revoke failed");
    const getMessageById = jest.fn().mockResolvedValue({
      delete: jest.fn().mockRejectedValue(deleteError)
    });
    const getChatById = jest.fn();

    await expect(
      revokeMessageWithLookupFallback(
        {
          getMessageById,
          getChatById
        },
        "5511999999999@c.us",
        "3EB05C4B50B58B87D42E7F",
        true,
        buildSerializedMessageId,
        logger
      )
    ).rejects.toThrow("revoke failed");

    expect(getChatById).not.toHaveBeenCalled();
  });
});