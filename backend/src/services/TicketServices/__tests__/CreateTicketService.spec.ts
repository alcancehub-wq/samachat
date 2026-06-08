import CheckContactOpenTickets from "../../../helpers/CheckContactOpenTickets";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import GetDefaultWhatsApp from "../../../helpers/GetDefaultWhatsApp";
import ShowContactService from "../../ContactServices/ShowContactService";
import CreateTicketService from "../CreateTicketService";

jest.mock("../../../models/Ticket", () => ({
  findOne: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock("../../../models/User", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../helpers/CheckContactOpenTickets", () => jest.fn());
jest.mock("../../../helpers/GetDefaultWhatsApp", () => jest.fn());
jest.mock("../../ContactServices/ShowContactService", () => jest.fn());

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
    showContactServiceMock.mockResolvedValue({ isGroup: false });
    userFindByPkMock.mockResolvedValue({ queues: [{ id: 9 }] });
  });

  it("does not reuse or block Larissa's ticket when Bruna starts a manual conversation on another connection", async () => {
    const createTicketMock = jest.fn().mockResolvedValue({ id: 88 });
    const larissaWhatsappId = 11;
    const brunaWhatsappId = 22;

    getDefaultWhatsAppMock.mockResolvedValue({
      id: brunaWhatsappId,
      $create: createTicketMock
    });
    ticketFindOneMock.mockImplementation(async ({ where }) => {
      if (where.contactId === 101 && where.whatsappId === larissaWhatsappId) {
        return { id: 15, whatsappId: larissaWhatsappId };
      }

      return null;
    });
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
    ticketFindOneMock.mockResolvedValue({ id: 44, whatsappId: brunaWhatsappId });

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