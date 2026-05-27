jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: {
    count: jest.fn(),
    findAndCountAll: jest.fn()
  }
}));

jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../TicketServices/ShowTicketService", () => jest.fn());
jest.mock("../../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { Op } from "sequelize";
import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import ListMessagesService from "../ListMessagesService";

const contactFindAllMock = Contact.findAll as jest.Mock;
const messageCountMock = Message.count as jest.Mock;
const messageFindAndCountAllMock = Message.findAndCountAll as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const ticketFindAllMock = Ticket.findAll as jest.Mock;

describe("ListMessagesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contactFindAllMock.mockResolvedValue([]);
    ticketFindAllMock.mockResolvedValue([]);
  });

  it("lists the current ticket messages without fallback when history already exists", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 1153,
      contactId: 17160,
      whatsappId: 35,
      isGroup: false,
      contact: {
        id: 17160,
        number: "5599984396105"
      }
    });
    messageCountMock.mockResolvedValue(1);
    messageFindAndCountAllMock.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: "msg-current",
          body: "mensagem atual",
          createdAt: new Date("2026-05-27T17:18:53.000Z")
        }
      ]
    });

    const result = await ListMessagesService({
      ticketId: "1153",
      accessData: {
        userId: 16,
        profile: "user"
      }
    });

    expect(contactFindAllMock).not.toHaveBeenCalled();
    expect(ticketFindAllMock).not.toHaveBeenCalled();
    expect(messageFindAndCountAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ticketId: 1153 }
      })
    );
    expect(result.count).toBe(1);
    expect(result.messages.map(message => message.id)).toEqual(["msg-current"]);
    expect(result.hasMore).toBe(false);
  });

  it("merges messages from an equivalent pending duplicate when the visible ticket is empty", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 1153,
      contactId: 17160,
      whatsappId: 35,
      isGroup: false,
      contact: {
        id: 17160,
        number: "5599984396105"
      }
    });
    messageCountMock
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);
    contactFindAllMock.mockResolvedValue([
      { id: 17160, number: "5599984396105" },
      { id: 6189, number: "559984396105" }
    ]);
    ticketFindAllMock.mockResolvedValue([
      {
        id: 1154,
        contactId: 6189,
        status: "pending",
        userId: null,
        queueId: null,
        updatedAt: new Date("2026-05-27T17:18:53.000Z")
      }
    ]);
    messageFindAndCountAllMock.mockResolvedValue({
      count: 2,
      rows: [
        {
          id: "msg-second",
          body: "segunda",
          createdAt: new Date("2026-05-27T17:20:00.000Z")
        },
        {
          id: "msg-first",
          body: "primeira",
          createdAt: new Date("2026-05-27T17:19:00.000Z")
        }
      ]
    });

    const result = await ListMessagesService({
      ticketId: "1153",
      accessData: {
        userId: 16,
        profile: "user"
      }
    });

    expect(contactFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          number: {
            [Op.in]: ["5599984396105", "559984396105"]
          }
        }
      })
    );
    expect(ticketFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            [Op.ne]: 1153
          },
          contactId: {
            [Op.in]: [6189]
          },
          whatsappId: 35,
          status: "pending",
          userId: null,
          queueId: null
        }
      })
    );
    expect(messageFindAndCountAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ticketId: {
            [Op.in]: [1153, 1154]
          }
        }
      })
    );
    expect(result.count).toBe(2);
    expect(result.messages.map(message => message.id)).toEqual([
      "msg-first",
      "msg-second"
    ]);
    expect(result.hasMore).toBe(false);
  });
});