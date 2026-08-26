import AppError from "../../../errors/AppError";
import Whatsapp from "../../../models/Whatsapp";
import AuthorizeMetaMessageTemplateConnectionService from "../AuthorizeMetaMessageTemplateConnectionService";
import ListAuthorizedMetaTemplateConnectionsService from "../ListAuthorizedMetaTemplateConnectionsService";

jest.mock("../../../models/Whatsapp", () => ({
  findAll: jest.fn()
}));

jest.mock("../AuthorizeMetaMessageTemplateConnectionService");

const mockFindAll = Whatsapp.findAll as jest.MockedFunction<typeof Whatsapp.findAll>;
const mockAuthorize =
  AuthorizeMetaMessageTemplateConnectionService as jest.MockedFunction<
    typeof AuthorizeMetaMessageTemplateConnectionService
  >;

describe("ListAuthorizedMetaTemplateConnectionsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns only official connections authorized for metaTemplates.view", async () => {
    const allowed = {
      id: 35,
      name: "Official Allowed",
      providerType: "official",
      queues: [{ id: 10 }]
    } as any;
    const denied = {
      id: 36,
      name: "Official Denied",
      providerType: "official",
      queues: [{ id: 20 }]
    } as any;
    const legacy = {
      id: 37,
      name: "Legacy",
      providerType: "web",
      queues: [{ id: 10 }]
    } as any;

    mockFindAll.mockResolvedValue([allowed, denied, legacy] as any);
    mockAuthorize.mockImplementation(({ connection }) => {
      if ((connection as any).id === 36) {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
    });

    const result = await ListAuthorizedMetaTemplateConnectionsService({
      profile: "user",
      userQueueIds: [10]
    });

    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: ["id", "name", "providerType"],
        include: expect.any(Array)
      })
    );
    expect(mockAuthorize).toHaveBeenCalledTimes(2);
    expect(mockAuthorize).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "user",
        permission: "metaTemplates.view",
        userQueueIds: [10],
        connection: allowed
      })
    );
    expect(mockAuthorize).not.toHaveBeenCalledWith(
      expect.objectContaining({ connection: legacy })
    );
    expect(result).toEqual([
      {
        id: 35,
        name: "Official Allowed",
        providerType: "official"
      }
    ]);
  });

  it("rethrows unexpected authorization errors", async () => {
    const connection = {
      id: 35,
      name: "Official",
      providerType: "official",
      queues: []
    } as any;
    const unexpected = new Error("unexpected");

    mockFindAll.mockResolvedValue([connection] as any);
    mockAuthorize.mockImplementation(() => {
      throw unexpected;
    });

    await expect(
      ListAuthorizedMetaTemplateConnectionsService({
        profile: "user",
        userQueueIds: []
      })
    ).rejects.toBe(unexpected);
  });
});
