import AppError from "../../../errors/AppError";
import ValidateOfficialOutboundConfigurationService from "../ValidateOfficialOutboundConfigurationService";
import AuthorizeOfficialOutboundOwnershipService from "../AuthorizeOfficialOutboundOwnershipService";

jest.mock("../AuthorizeOfficialOutboundOwnershipService", () => jest.fn());

const authorize = AuthorizeOfficialOutboundOwnershipService as jest.MockedFunction<
  typeof AuthorizeOfficialOutboundOwnershipService
>;

describe("ValidateOfficialOutboundConfigurationService", () => {
  beforeEach(() => authorize.mockResolvedValue());

  it("does not authorize STANDARD configuration", async () => {
    await expect(
      ValidateOfficialOutboundConfigurationService({ ownerUserId: 0 })
    ).resolves.toBeUndefined();
    expect(authorize).not.toHaveBeenCalled();
  });

  it("fails closed when OFFICIAL configuration lacks queue", async () => {
    await expect(
      ValidateOfficialOutboundConfigurationService({
        outboundMode: "OFFICIAL",
        ownerUserId: 4,
        deliveryWhatsappId: 7,
        templateName: "welcome",
        templateLanguage: "pt_BR"
      })
    ).rejects.toMatchObject<AppError>({
      message: "ERR_META_OUTBOUND_OWNER_QUEUE_REQUIRED",
      statusCode: 400
    });
  });

  it("delegates valid OFFICIAL ownership to the shared authorization rule", async () => {
    await ValidateOfficialOutboundConfigurationService({
      outboundMode: "OFFICIAL",
      ownerUserId: 4,
      ownerQueueId: 8,
      deliveryWhatsappId: 7,
      templateName: "welcome",
      templateLanguage: "pt_BR",
      templateComponents: "[]"
    });
    expect(authorize).toHaveBeenCalledWith({
      ownerUserId: 4,
      ownerQueueId: 8,
      officialWhatsappId: 7,
      actorProfile: undefined
    });
  });
});