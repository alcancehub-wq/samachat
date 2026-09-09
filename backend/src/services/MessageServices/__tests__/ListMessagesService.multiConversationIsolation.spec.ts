jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: { findAndCountAll: jest.fn() }
}));

jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));

jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));

jest.mock("../../TicketServices/ShowTicketService", () => jest.fn());

jest.mock("../../../utils/logger", () => ({
  logger: { warn: jest.fn() }
}));

import { Op } from "sequelize";
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";
import Contact from "../../../models/Contact";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import ListMessagesService from "../ListMessagesService";

const messageFindAndCountAllMock = Message.findAndCountAll as jest.Mock;
const ticketFindAllMock = Ticket.findAll as jest.Mock;
const contactFindByPkMock = Contact.findByPk as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;

describe("ListMessagesService multiple conversation isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    messageFindAndCountAllMock.mockResolvedValue({
      count: 1,
      rows: []
    });
  });

  it("isolates multiple conversations to current ticket", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 3126,
      contactId: 14007,
      isGroup: false
    });

    contactFindByPkMock.mockResolvedValue({
      id: 14007,
      allowMultipleConversations: true
    });

    await ListMessagesService({
      ticketId: "3126",
      accessData: {
        userId: 22,
        profile: "user"
      }
    });

    expect(ticketFindAllMock).not.toHaveBeenCalled();

    expect(messageFindAndCountAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ticketId: 3126
        }
      })
    );
  });

  it("preserves canonical history for ordinary contacts", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 1153,
      contactId: 17160,
      isGroup: false
    });

    contactFindByPkMock.mockResolvedValue({
      id: 17160,
      allowMultipleConversations: false
    });

    ticketFindAllMock.mockResolvedValue([
      { id: 1153 },
      { id: 1154 }
    ]);

    await ListMessagesService({
      ticketId: "1153",
      accessData: {
        userId: 16,
        profile: "user"
      }
    });

    expect(ticketFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          contactId: 17160
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
  });
});