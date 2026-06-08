import CheckContactOpenTickets from "../../../helpers/CheckContactOpenTickets";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import GetDefaultWhatsApp from "../../../helpers/GetDefaultWhatsApp";
import ShowContactService from "../../ContactServices/ShowContactService";
import CreateTicketService from "../CreateTicketService";

jest.mock("../../../models/Ticket", () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock("../../../models/User", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../helpers/CheckContactOpenTickets", () => jest.fn());
jest.mock("../../../helpers/GetDefaultWhatsApp", () => jest.fn());
jest.mock("../../ContactServices/ShowContactService", () => jest.fn());

const ticketFindAllMock = Ticket.findAll as jest.Mock;
const ticketFindOneMock = Ticket.findOne as jest.Mock;
const ticketFindByPkMock = Ticket.findByPk as jest.Mock;
const userFindByPkMock = User.findByPk as jest.Mock;
const checkContactOpenTicketsMock = CheckContactOpenTickets as jest.Mock;
const getDefaultWhatsAppMock = GetDefaultWhatsApp as jest.Mock;
const showContactServiceMock = ShowContactService as jest.Mock;

describe("CreateTicketService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    checkContactOpenTicketsMock.mockResolvedValue(undefined);
    showContactServiceMock.mockResolvedValue({
      isGroup: false,
      allowMultipleConversations: false
    });
    userFindByPkMock.mockResolvedValue({ queues: [{ id: 9 }] });
    ticketFindAllMock.mockResolvedValue([]);
  });

  it("blocks a new manual ticket when the contact already belongs to another responsible user", async () => {
    const brunaWhatsappId = 22;

    getDefaultWhatsAppMock.mockResolvedValue({ id: brunaWhatsappId });
    ticketFindAllMock.mockResolvedValueOnce([
      {
        id: 61,
        status: "open",
        userId: 7
      }
    ]);
    userFindByPkMock.mockResolvedValueOnce({
      id: 61,
      name: "Bruna"
    });

    await expect(
      CreateTicketService({
        contactId: 101,
        status: "open",
        userId: 5
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Este contato já possui atendimento anterior com Bruna. Para continuar, transfira o contato ou solicite liberação a um administrador.",
        statusCode: 400
      })
    );

    expect(checkContactOpenTicketsMock).not.toHaveBeenCalled();
    expect(ticketFindByPkMock).not.toHaveBeenCalled();
  });

  it("allows the current flow when the contact explicitly permits multiple conversations", async () => {
    const createTicketMock = jest.fn().mockResolvedValue({ id: 89 });
    const kesiaWhatsappId = 22;

    showContactServiceMock.mockResolvedValue({
      isGroup: false,
      allowMultipleConversations: true
    });
    getDefaultWhatsAppMock.mockResolvedValue({
      id: kesiaWhatsappId,
      $create: createTicketMock
    });
    ticketFindAllMock.mockResolvedValueOnce([
      {
        id: 15,
        status: "open",
        userId: 7,
        whatsappId: 11
      }
    ]);
    ticketFindOneMock.mockResolvedValueOnce(null);
    ticketFindByPkMock.mockResolvedValue({
      id: 89,
      whatsappId: kesiaWhatsappId,
      contact: { id: 101 }
    });

    const result = await CreateTicketService({
      contactId: 101,
      status: "open",
      userId: 5
    });

    expect(checkContactOpenTicketsMock).toHaveBeenCalledWith(101, kesiaWhatsappId);
    expect(createTicketMock).toHaveBeenCalled();
    expect(result).toEqual({
      id: 89,
      whatsappId: kesiaWhatsappId,
      contact: { id: 101 }
    });
  });

  it("does not block when the previous ticket belongs to the same responsible user", async () => {
    const createTicketMock = jest.fn().mockResolvedValue({ id: 90 });
    const brunaWhatsappId = 22;

    getDefaultWhatsAppMock.mockResolvedValue({
      id: brunaWhatsappId,
      $create: createTicketMock
    });
    ticketFindAllMock.mockResolvedValueOnce([
      {
        id: 44,
        status: "open",
        userId: 5,
        whatsappId: 11
      }
    ]);
    ticketFindOneMock.mockResolvedValueOnce(null);
    ticketFindByPkMock.mockResolvedValue({
      id: 90,
      whatsappId: brunaWhatsappId,
      contact: { id: 101 }
    });

    const result = await CreateTicketService({
      contactId: 101,
      status: "open",
      userId: 5
    });

    expect(createTicketMock).toHaveBeenCalled();
    expect(result).toEqual({
      id: 90,
      whatsappId: brunaWhatsappId,
      contact: { id: 101 }
    });
  });

  it("does not block when previous tickets have no responsible user", async () => {
    const createTicketMock = jest.fn().mockResolvedValue({ id: 91 });
    const brunaWhatsappId = 22;

    getDefaultWhatsAppMock.mockResolvedValue({
      id: brunaWhatsappId,
      $create: createTicketMock
    });
    ticketFindAllMock.mockResolvedValueOnce([
      {
        id: 45,
        status: "pending",
        userId: null,
        whatsappId: 11
      }
    ]);
    ticketFindOneMock.mockResolvedValueOnce(null);
    ticketFindByPkMock.mockResolvedValue({
      id: 91,
      whatsappId: brunaWhatsappId,
      contact: { id: 101 }
    });

    const result = await CreateTicketService({
      contactId: 101,
      status: "open",
      userId: 5
    });

    expect(createTicketMock).toHaveBeenCalled();
    expect(result).toEqual({
      id: 91,
      whatsappId: brunaWhatsappId,
      contact: { id: 101 }
    });
  });

  it("does not reuse or block Larissa's ticket when Bruna starts a manual conversation on another connection", async () => {
    const createTicketMock = jest.fn().mockResolvedValue({ id: 88 });
    const larissaWhatsappId = 11;
    const brunaWhatsappId = 22;

    getDefaultWhatsAppMock.mockResolvedValue({
      id: brunaWhatsappId,
      $create: createTicketMock
    });
    ticketFindAllMock.mockResolvedValueOnce([]);
    ticketFindOneMock.mockResolvedValueOnce(null);
    ticketFindByPkMock.mockResolvedValue({
      id: 88,
      whatsappId: brunaWhatsappId,
      contact: { id: 101 }
    });

    const result = await CreateTicketService({
      contactId: 101,
      status: "open",
      userId: 5
    });

    expect(ticketFindOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contactId: 101,
          whatsappId: brunaWhatsappId
        })
      })
    );
    expect(checkContactOpenTicketsMock).toHaveBeenCalledWith(
      101,
      brunaWhatsappId
    );
    expect(createTicketMock).toHaveBeenCalledWith("ticket", {
      contactId: 101,
      status: "open",
      isGroup: false,
      userId: 5,
      queueId: 9,
      pendingSince: undefined
    });
    expect(result).toEqual({
      id: 88,
      whatsappId: brunaWhatsappId,
      contact: { id: 101 }
    });
  });

  it("still blocks Bruna when the same contact already has an open ticket on Bruna's whatsapp", async () => {
    const brunaWhatsappId = 22;

    getDefaultWhatsAppMock.mockResolvedValue({ id: brunaWhatsappId });
    ticketFindAllMock.mockResolvedValueOnce([]);
    ticketFindOneMock
      .mockResolvedValueOnce({ id: 44, whatsappId: brunaWhatsappId });

    await expect(
      CreateTicketService({
        contactId: 101,
        status: "open",
        userId: 5
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "ERR_OTHER_OPEN_TICKET",
        statusCode: 400
      })
    );

    expect(ticketFindOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contactId: 101,
          whatsappId: brunaWhatsappId
        })
      })
    );
    expect(checkContactOpenTicketsMock).not.toHaveBeenCalled();
  });
});