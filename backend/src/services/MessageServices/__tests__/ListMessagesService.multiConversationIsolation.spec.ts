jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: {
    findAndCountAll: jest.fn()
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
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import ListMessagesService from "../ListMessagesService";

const messageFindAndCountAllMock = Message.findAndCountAll as jest.Mock;
const ticketFindAllMock = Ticket.findAll as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;

describe("ListMessagesService multi conversation isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    messageFindAndCountAllMock.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: "msg-current",
          body: "current",
          createdAt: new Date("2026-09-09T13:00:00.000Z")
        }
      ]
    });
  });

  it("keeps allowMultipleConversations=true isolated to the current ticket", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 3126,
      contactId: 14007,
      whatsappId: 36,
      isGroup: false,
      contact: {
        id: 14007,
        allowMultipleConversations: true
      }
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

  it("preserves canonical history aggregation when allowMultipleConversations=false", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 1153,
      contactId: 17160,
      whatsappId: 35,
      isGroup: false,
      contact: {
        id: 17160,
        allowMultipleConversations: false
      }
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
