jest.mock("../../../models/OfficialInboundMessage", () => ({
  __esModule: true,
  default: { findOrCreate: jest.fn(), findOne: jest.fn(), findByPk: jest.fn() }
}));
jest.mock("../../../models/OfficialOutboundOrigin", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));

import OfficialInboundMessage from "../../../models/OfficialInboundMessage";
import OfficialOutboundOrigin from "../../../models/OfficialOutboundOrigin";
import {
  GetLastOfficialInboundTimestampService,
  PersistOfficialInboundFactsService,
  ResolveOfficialInboundCorrelationService
} from "../OfficialInboundCorrelationService";

describe("OfficialInboundCorrelationService", () => {
  const inboundFacts = {
    providerMessageId: "wamid.inbound",
    providerTimestamp: 1770000000,
    contextProviderMessageId: "wamid.outbound",
    deliveryWhatsappId: 7,
    contactId: 8,
    ticketId: 9
  };

  afterEach(() => jest.clearAllMocks());

  it("persists factual inbound identifiers idempotently", async () => {
    (OfficialInboundMessage.findOrCreate as jest.Mock).mockResolvedValue([inboundFacts]);

    await expect(PersistOfficialInboundFactsService(inboundFacts)).resolves.toEqual(inboundFacts);
    expect(OfficialInboundMessage.findOrCreate).toHaveBeenCalledWith({
      where: { providerMessageId: "wamid.inbound" },
      defaults: inboundFacts
    });
  });

  it("returns only a persisted Meta inbound timestamp", async () => {
    (OfficialInboundMessage.findOne as jest.Mock).mockResolvedValue({ providerTimestamp: 1770000000 });
    await expect(GetLastOfficialInboundTimestampService(9, 7)).resolves.toBe(1770000000);
    (OfficialInboundMessage.findOne as jest.Mock).mockResolvedValue(null);
    await expect(GetLastOfficialInboundTimestampService(9, 7)).resolves.toBeNull();
  });

  it("correlates through factual context with matching ticket, contact, and delivery connection", async () => {
    (OfficialInboundMessage.findByPk as jest.Mock).mockResolvedValue(inboundFacts);
    const origin = { id: 10 };
    (OfficialOutboundOrigin.findOne as jest.Mock).mockResolvedValue(origin);

    await expect(ResolveOfficialInboundCorrelationService("wamid.inbound")).resolves.toBe(origin);
    expect(OfficialOutboundOrigin.findOne).toHaveBeenCalledWith({
      where: {
        providerMessageId: "wamid.outbound",
        contactId: 8,
        deliveryWhatsappId: 7,
        ticketId: 9
      }
    });
  });

  it("fails closed when the inbound message has no factual context", async () => {
    (OfficialInboundMessage.findByPk as jest.Mock).mockResolvedValue({ ...inboundFacts, contextProviderMessageId: null });
    await expect(ResolveOfficialInboundCorrelationService("wamid.inbound")).resolves.toBeNull();
    expect(OfficialOutboundOrigin.findOne).not.toHaveBeenCalled();
  });
});