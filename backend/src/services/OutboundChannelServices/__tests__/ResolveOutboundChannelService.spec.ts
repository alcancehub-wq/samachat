import GetDefaultWhatsApp from "../../../helpers/GetDefaultWhatsApp";
import Whatsapp from "../../../models/Whatsapp";
import ResolveOutboundChannelService from "../ResolveOutboundChannelService";
import LoadOfficialOutboundConnectionService from "../LoadOfficialOutboundConnectionService";
import AuthorizeOfficialOutboundConnectionService from "../AuthorizeOfficialOutboundConnectionService";

jest.mock("../../../helpers/GetDefaultWhatsApp");
jest.mock("../../../models/Whatsapp");
jest.mock("../LoadOfficialOutboundConnectionService");
jest.mock("../AuthorizeOfficialOutboundConnectionService");

describe("ResolveOutboundChannelService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("defaults to STANDARD using owner user", async () => {
    const mockGetDefault =
      GetDefaultWhatsApp as jest.MockedFunction<
        typeof GetDefaultWhatsApp
      >;

    mockGetDefault.mockResolvedValue({
      id: 12,
      providerType: "wwebjs"
    } as Whatsapp);

    const result = await ResolveOutboundChannelService({
      context: "campaign",
      ownerUserId: 24
    });

    expect(mockGetDefault).toHaveBeenCalledWith(24);

    expect(result).toMatchObject({
      mode: "STANDARD",
      context: "campaign",
      ownerUserId: 24,
      whatsappId: 12
    });
  });

  it("preserves existing ticket whatsapp in STANDARD", async () => {
    const findByPk = Whatsapp.findByPk as jest.Mock;

    findByPk.mockResolvedValue({
      id: 19,
      providerType: "wwebjs"
    } as Whatsapp);

    const result = await ResolveOutboundChannelService({
      mode: "STANDARD",
      context: "schedule",
      ownerUserId: 24,
      existingTicketWhatsappId: 19
    });

    expect(findByPk).toHaveBeenCalledWith(19);
    expect(result.whatsappId).toBe(19);
  });

  it("resolves OFFICIAL as delivery infrastructure", async () => {
    const mockLoad =
      LoadOfficialOutboundConnectionService as jest.MockedFunction<
        typeof LoadOfficialOutboundConnectionService
      >;

    const mockAuthorize =
      AuthorizeOfficialOutboundConnectionService as jest.MockedFunction<
        typeof AuthorizeOfficialOutboundConnectionService
      >;

    const officialWhatsapp = {
      id: 35,
      providerType: "official",
      queues: []
    } as unknown as Whatsapp;

    mockLoad.mockResolvedValue(officialWhatsapp);

    const result = await ResolveOutboundChannelService({
      mode: "OFFICIAL",
      context: "flow",
      ownerUserId: 24,
      actorProfile: "admin",
      actorQueueIds: [],
      officialWhatsappId: 35
    });

    expect(mockLoad).toHaveBeenCalledWith(35);

    expect(mockAuthorize).toHaveBeenCalledWith({
      profile: "admin",
      userQueueIds: [],
      connection: officialWhatsapp
    });

    expect(result).toMatchObject({
      mode: "OFFICIAL",
      ownerUserId: 24,
      whatsappId: 35,
      providerType: "official"
    });
  });

  it("requires owner user", async () => {
    await expect(
      ResolveOutboundChannelService({
        context: "campaign",
        ownerUserId: 0
      })
    ).rejects.toMatchObject({
      message: "ERR_OUTBOUND_OWNER_REQUIRED"
    });
  });

  it("requires official connection id", async () => {
    await expect(
      ResolveOutboundChannelService({
        mode: "OFFICIAL",
        context: "campaign",
        ownerUserId: 24
      })
    ).rejects.toMatchObject({
      message:
        "ERR_META_OUTBOUND_OFFICIAL_CONNECTION_REQUIRED"
    });
  });
});
