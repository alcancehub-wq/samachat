import sequelize from "../../../database";
import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import CreateOrUpdateContactService from "../../ContactServices/CreateOrUpdateContactService";
import ResolveOperationalTicketService from "../../TicketServices/ResolveOperationalTicketService";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import UpdateTicketService from "../../TicketServices/UpdateTicketService";
import ValidateEduzzRuleOwnershipService from "../ValidateEduzzRuleOwnershipService";
import ResolveEduzzContactTicketService from "../ResolveEduzzContactTicketService";

jest.mock("../../../database", () => ({
  transaction: jest.fn()
}));

jest.mock("../../../models/Contact", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../models/Ticket", () => ({
  create: jest.fn()
}));

jest.mock("../../../models/User", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../ContactServices/CreateOrUpdateContactService", () => jest.fn());
jest.mock("../../TicketServices/ResolveOperationalTicketService", () => jest.fn());
jest.mock("../../TicketServices/ShowTicketService", () => jest.fn());
jest.mock("../../TicketServices/UpdateTicketService", () => jest.fn());
jest.mock("../ValidateEduzzRuleOwnershipService", () => jest.fn());

const transactionMock = sequelize.transaction as jest.Mock;
const contactFindByPkMock = Contact.findByPk as jest.Mock;
const ticketCreateMock = Ticket.create as jest.Mock;
const userFindByPkMock = User.findByPk as jest.Mock;
const createOrUpdateContactMock = CreateOrUpdateContactService as jest.Mock;
const resolveOperationalTicketMock = ResolveOperationalTicketService as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const updateTicketServiceMock = UpdateTicketService as jest.Mock;
const validateOwnershipMock = ValidateEduzzRuleOwnershipService as jest.Mock;

describe("ResolveEduzzContactTicketService ownership", () => {
  const transaction = {
    LOCK: {
      UPDATE: "UPDATE"
    }
  };

  const contact = {
    id: 16963,
    allowMultipleConversations: false
  };

  const finalTicket = {
    id: 3507,
    status: "open",
    userId: 30,
    whatsappId: 36,
    queueId: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();

    validateOwnershipMock.mockResolvedValue({
      user: { id: 30 },
      whatsapp: { id: 36 }
    });

    createOrUpdateContactMock.mockResolvedValue(contact);
    contactFindByPkMock.mockResolvedValue(contact);

    userFindByPkMock.mockResolvedValue({
      id: 30,
      queues: [{ id: 5 }]
    });

    transactionMock.mockImplementation(async (callback: any) =>
      callback(transaction)
    );

    showTicketServiceMock.mockResolvedValue(finalTicket);

    updateTicketServiceMock.mockResolvedValue({
      ticket: finalTicket,
      oldStatus: "open",
      oldUserId: 21
    });
  });

  it("preserves an open ticket already owned by the configured user and whatsapp", async () => {
    resolveOperationalTicketMock.mockResolvedValue({
      id: 3507,
      status: "open",
      userId: 30,
      whatsappId: 36
    });

    const result = await ResolveEduzzContactTicketService({
      buyerName: "GABRIELLE ERTAL",
      buyerEmail: "alcancehub@gmail.com",
      buyerPhone: "+5541997837839",
      userId: 30,
      whatsappId: 36
    });

    expect(updateTicketServiceMock).not.toHaveBeenCalled();
    expect(ticketCreateMock).not.toHaveBeenCalled();

    expect(result).toEqual({
      contact,
      ticket: finalTicket,
      createdTicket: false
    });
  });

  it("claims an existing unowned pending ticket through the canonical update service", async () => {
    resolveOperationalTicketMock.mockResolvedValue({
      id: 3507,
      status: "pending",
      userId: null,
      whatsappId: 36
    });

    await ResolveEduzzContactTicketService({
      buyerName: "GABRIELLE ERTAL",
      buyerEmail: "alcancehub@gmail.com",
      buyerPhone: "+5541997837839",
      userId: 30,
      whatsappId: 36
    });

    expect(updateTicketServiceMock).toHaveBeenCalledTimes(1);

    expect(updateTicketServiceMock).toHaveBeenCalledWith({
      ticketId: 3507,
      ticketData: {
        status: "open",
        userId: 30,
        whatsappId: 36,
        applyUserDefaultWhatsappOnTransfer: true
      }
    });

    expect(ticketCreateMock).not.toHaveBeenCalled();
  });

  it("transfers a ticket owned by another user instead of blocking the Eduzz event", async () => {
    resolveOperationalTicketMock.mockResolvedValue({
      id: 1048,
      status: "open",
      userId: 21,
      whatsappId: 36
    });

    await ResolveEduzzContactTicketService({
      buyerName: "GABRIELLE ERTAL",
      buyerEmail: "alcancehub@gmail.com",
      buyerPhone: "+5541997837839",
      userId: 30,
      whatsappId: 36
    });

    expect(updateTicketServiceMock).toHaveBeenCalledTimes(1);

    expect(updateTicketServiceMock).toHaveBeenCalledWith({
      ticketId: 1048,
      ticketData: {
        status: "open",
        userId: 30,
        whatsappId: 36,
        applyUserDefaultWhatsappOnTransfer: true
      }
    });

    expect(ticketCreateMock).not.toHaveBeenCalled();
  });

  it("transfers a ticket from another whatsapp instead of blocking the Eduzz event", async () => {
    resolveOperationalTicketMock.mockResolvedValue({
      id: 1048,
      status: "open",
      userId: 30,
      whatsappId: 35
    });

    await ResolveEduzzContactTicketService({
      buyerName: "GABRIELLE ERTAL",
      buyerEmail: "alcancehub@gmail.com",
      buyerPhone: "+5541997837839",
      userId: 30,
      whatsappId: 36
    });

    expect(updateTicketServiceMock).toHaveBeenCalledTimes(1);

    expect(updateTicketServiceMock).toHaveBeenCalledWith({
      ticketId: 1048,
      ticketData: {
        status: "open",
        userId: 30,
        whatsappId: 36,
        applyUserDefaultWhatsappOnTransfer: true
      }
    });

    expect(ticketCreateMock).not.toHaveBeenCalled();
  });

  it("does not choose an arbitrary queue when the configured user has multiple queues", async () => {
    resolveOperationalTicketMock.mockResolvedValue(null);

    userFindByPkMock.mockResolvedValue({
      id: 30,
      queues: [{ id: 5 }, { id: 6 }]
    });

    ticketCreateMock.mockResolvedValue({
      id: 3507
    });

    await ResolveEduzzContactTicketService({
      buyerName: "GABRIELLE ERTAL",
      buyerEmail: "alcancehub@gmail.com",
      buyerPhone: "+5541997837839",
      userId: 30,
      whatsappId: 36
    });

    expect(ticketCreateMock).toHaveBeenCalledWith(
      {
        contactId: 16963,
        whatsappId: 36,
        userId: 30,
        queueId: undefined,
        status: "open",
        isGroup: false,
        unreadMessages: 0
      },
      { transaction }
    );
  });
  it("creates a new open ticket when no operational ticket exists", async () => {
    resolveOperationalTicketMock.mockResolvedValue(null);

    ticketCreateMock.mockResolvedValue({
      id: 3507
    });

    const result = await ResolveEduzzContactTicketService({
      buyerName: "GABRIELLE ERTAL",
      buyerEmail: "alcancehub@gmail.com",
      buyerPhone: "+5541997837839",
      userId: 30,
      whatsappId: 36
    });

    expect(ticketCreateMock).toHaveBeenCalledTimes(1);

    expect(ticketCreateMock).toHaveBeenCalledWith(
      {
        contactId: 16963,
        whatsappId: 36,
        userId: 30,
        queueId: 5,
        status: "open",
        isGroup: false,
        unreadMessages: 0
      },
      { transaction }
    );

    expect(updateTicketServiceMock).not.toHaveBeenCalled();

    expect(result).toEqual({
      contact,
      ticket: finalTicket,
      createdTicket: true
    });
  });
});
