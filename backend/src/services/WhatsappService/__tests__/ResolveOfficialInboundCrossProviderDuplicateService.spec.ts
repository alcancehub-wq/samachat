import Message from "../../../models/Message";
import OfficialInboundMessage from "../../../models/OfficialInboundMessage";
import ResolveOfficialInboundCrossProviderDuplicateService from "../ResolveOfficialInboundCrossProviderDuplicateService";

jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../../../models/OfficialInboundMessage", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

const messageFindOneMock = Message.findOne as jest.Mock;
const officialFindAllMock = OfficialInboundMessage.findAll as jest.Mock;

describe("ResolveOfficialInboundCrossProviderDuplicateService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the existing official inbound when provider identity is unambiguous", async () => {
    officialFindAllMock.mockResolvedValue([
      {
        providerMessageId: "wamid.official.1",
        providerTimestamp: 1770000100
      }
    ]);

    messageFindOneMock.mockResolvedValue({
      id: "wamid.official.1",
      ticketId: 3263,
      contactId: 17639,
      fromMe: false,
      mediaType: null
    });

    const result =
      await ResolveOfficialInboundCrossProviderDuplicateService({
        ticketId: 3263,
        contactId: 17639,
        providerTimestamp: 1770000100
      });

    expect(result).toEqual(
      expect.objectContaining({
        id: "wamid.official.1"
      })
    );

    expect(officialFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ticketId: 3263,
          contactId: 17639,
          providerTimestamp: 1770000100
        },
        limit: 2
      })
    );

    expect(messageFindOneMock).toHaveBeenCalledWith({
      where: {
        id: "wamid.official.1",
        ticketId: 3263,
        contactId: 17639,
        fromMe: false
      }
    });
  });

  it("does not suppress an inbound when there is no official fact", async () => {
    officialFindAllMock.mockResolvedValue([]);

    const result =
      await ResolveOfficialInboundCrossProviderDuplicateService({
        ticketId: 3263,
        contactId: 17639,
        providerTimestamp: 1770000100
      });

    expect(result).toBeNull();
    expect(messageFindOneMock).not.toHaveBeenCalled();
  });

  it("does not suppress an inbound when official correlation is ambiguous", async () => {
    officialFindAllMock.mockResolvedValue([
      {
        providerMessageId: "wamid.official.1",
        providerTimestamp: 1770000100
      },
      {
        providerMessageId: "wamid.official.2",
        providerTimestamp: 1770000100
      }
    ]);

    const result =
      await ResolveOfficialInboundCrossProviderDuplicateService({
        ticketId: 3263,
        contactId: 17639,
        providerTimestamp: 1770000100
      });

    expect(result).toBeNull();
    expect(messageFindOneMock).not.toHaveBeenCalled();
  });

  it("does not suppress an inbound when media type conflicts", async () => {
    officialFindAllMock.mockResolvedValue([
      {
        providerMessageId: "wamid.official.audio",
        providerTimestamp: 1770000100
      }
    ]);

    messageFindOneMock.mockResolvedValue({
      id: "wamid.official.audio",
      ticketId: 3263,
      contactId: 17639,
      fromMe: false,
      mediaType: "audio"
    });

    const result =
      await ResolveOfficialInboundCrossProviderDuplicateService({
        ticketId: 3263,
        contactId: 17639,
        providerTimestamp: 1770000100,
        mediaType: "image"
      });

    expect(result).toBeNull();
  });

  it("does not correlate an invalid provider timestamp", async () => {
    const result =
      await ResolveOfficialInboundCrossProviderDuplicateService({
        ticketId: 3263,
        contactId: 17639,
        providerTimestamp: 0
      });

    expect(result).toBeNull();
    expect(officialFindAllMock).not.toHaveBeenCalled();
    expect(messageFindOneMock).not.toHaveBeenCalled();
  });
});
