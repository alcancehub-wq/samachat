jest.mock("../../../database", () => ({
  __esModule: true,
  default: { transaction: jest.fn() }
}));
jest.mock("../../../models/Contact", () => ({ findByPk: jest.fn(), findAll: jest.fn() }));
jest.mock("../../../models/Ticket", () => ({ create: jest.fn(), findOne: jest.fn() }));
jest.mock("../../../models/User", () => ({ findByPk: jest.fn() }));
jest.mock("../../../models/Tag", () => ({ findOne: jest.fn() }));
jest.mock("../../../models/TicketTag", () => ({ destroy: jest.fn() }));
jest.mock("../../../helpers/GetDefaultWhatsApp", () => jest.fn());
jest.mock("../../../helpers/GetDefaultWhatsAppByUser", () => jest.fn());
jest.mock("../../../helpers/BuildEquivalentContactNumberCandidates", () => jest.fn());
jest.mock("../../../libs/socket", () => ({ getIO: jest.fn() }));
jest.mock("../ResolveOperationalTicketService", () => jest.fn());
jest.mock("../ShowTicketService", () => jest.fn());

import sequelize from "../../../database";
import GetDefaultWhatsAppByUser from "../../../helpers/GetDefaultWhatsAppByUser";
import BuildEquivalentContactNumberCandidates from "../../../helpers/BuildEquivalentContactNumberCandidates";
import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import ResolveOperationalTicketService from "../ResolveOperationalTicketService";
import ShowTicketService from "../ShowTicketService";
import CreateTicketService from "../CreateTicketService";
import FindOrCreateTicketService from "../FindOrCreateTicketService";

const transactionMock = (sequelize as any).transaction as jest.Mock;
const contactFindByPkMock = (Contact as any).findByPk as jest.Mock;
const contactFindAllMock = (Contact as any).findAll as jest.Mock;
const ticketCreateMock = (Ticket as any).create as jest.Mock;
const ticketFindOneMock = (Ticket as any).findOne as jest.Mock;
const resolveOperationalTicketMock = ResolveOperationalTicketService as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const defaultWhatsappByUserMock = GetDefaultWhatsAppByUser as jest.Mock;
const equivalentNumberCandidatesMock = BuildEquivalentContactNumberCandidates as jest.Mock;

const transaction = { LOCK: { UPDATE: "UPDATE" } };

describe("canonical ticket flows", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    transactionMock.mockImplementation(callback => callback(transaction));
    defaultWhatsappByUserMock.mockResolvedValue({ id: 31 });
    contactFindAllMock.mockResolvedValue([]);
    equivalentNumberCandidatesMock.mockReturnValue([]);
  });

  it.each([
    ["T03 pending without owner", { id: 1, status: "pending", userId: null }],
    ["T04 active owned by the same user", { id: 2, status: "open", userId: 9 }],
    ["T05 active owned by another user", { id: 3, status: "open", userId: 18 }]
  ])("%s blocks manual parallel creation", async (_scenario, existingTicket) => {
    contactFindByPkMock.mockResolvedValue({ id: 77, isGroup: false, allowMultipleConversations: false });
    resolveOperationalTicketMock.mockResolvedValue(existingTicket);

    await expect(
      CreateTicketService({ contactId: 77, status: "open", userId: 9 })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(contactFindByPkMock).toHaveBeenCalledWith(77, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    expect(ticketCreateMock).not.toHaveBeenCalled();
  });

  it.each([
    ["T07 closed", { id: 12, status: "closed", lostAt: null }],
    ["T08 lost", { id: 13, status: "lost", lostAt: new Date("2026-01-01") }]
  ])("%s inbound creates a new pending ticket without mutating history", async (_scenario, historicalTicket) => {
    const historicalSnapshot = { ...historicalTicket };
    const contact = { id: 88, number: "5511999999999", allowMultipleConversations: false };
    const createdTicket = { id: 90, status: "pending", whatsappId: 44 };
    contactFindByPkMock.mockResolvedValue(contact);
    resolveOperationalTicketMock.mockResolvedValue(null);
    ticketCreateMock.mockResolvedValue(createdTicket);
    showTicketServiceMock.mockResolvedValue(createdTicket);

    await expect(FindOrCreateTicketService(contact as any, 44, 1)).resolves.toBe(createdTicket);

    expect(ticketCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: 88, status: "pending", whatsappId: 44 }),
      { transaction }
    );
    expect(ticketFindOneMock).not.toHaveBeenCalled();
    expect(historicalTicket).toEqual(historicalSnapshot);
  });

  it.each([
    ["T19 inbound on the transferred connection", 44],
    ["T20 inbound on the former connection", 31]
  ])("%s reuses the canonical ticket without changing its connection", async (_scenario, inboundWhatsappId) => {
    const contact = { id: 99, number: "5511988888888", allowMultipleConversations: false };
    const canonicalTicket: any = {
      id: 100,
      status: "open",
      whatsappId: 44,
      unreadMessages: 0,
      update: jest.fn().mockResolvedValue(undefined)
    };
    contactFindByPkMock.mockResolvedValue(contact);
    resolveOperationalTicketMock.mockResolvedValue(canonicalTicket);
    showTicketServiceMock.mockResolvedValue(canonicalTicket);

    await expect(FindOrCreateTicketService(contact as any, inboundWhatsappId, 1)).resolves.toBe(canonicalTicket);

    expect(ticketCreateMock).not.toHaveBeenCalled();
    expect(canonicalTicket.update).toHaveBeenCalledWith({ unreadMessages: 1 }, { transaction });
    expect(canonicalTicket.whatsappId).toBe(44);
  });
});