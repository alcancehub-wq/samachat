import AppError from "../../../errors/AppError";
import Ticket from "../../../models/Ticket";
import ShowUserService from "../../UserServices/ShowUserService";
import ShowTicketService from "../ShowTicketService";

jest.mock("../../../models/Ticket", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../UserServices/ShowUserService");

const ticketFindByPkMock = Ticket.findByPk as jest.Mock;
const showUserServiceMock = ShowUserService as jest.Mock;

describe("ShowTicketService access control", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows the assigned user to load the ticket", async () => {
    const ticket = {
      id: 101,
      userId: 7,
      queueId: 11,
      status: "open"
    };

    ticketFindByPkMock.mockResolvedValue(ticket);

    await expect(
      ShowTicketService(101, {
        userId: 7,
        profile: "user"
      })
    ).resolves.toBe(ticket);

    expect(showUserServiceMock).not.toHaveBeenCalled();
  });

  it("allows queue members to load pending tickets from their own queues", async () => {
    ticketFindByPkMock.mockResolvedValue({
      id: 102,
      userId: null,
      queueId: 11,
      status: "pending"
    });
    showUserServiceMock.mockResolvedValue({
      id: 7,
      queues: [{ id: 11 }]
    });

    await expect(
      ShowTicketService(102, {
        userId: 7,
        profile: "user"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: 102
      })
    );
  });

  it("blocks non-admin users from loading other users tickets", async () => {
    ticketFindByPkMock.mockResolvedValue({
      id: 103,
      userId: 9,
      queueId: 11,
      status: "open"
    });
    showUserServiceMock.mockResolvedValue({
      id: 7,
      queues: [{ id: 11 }]
    });

    await expect(
      ShowTicketService(103, {
        userId: 7,
        profile: "user"
      })
    ).rejects.toEqual(new AppError("ERR_NO_PERMISSION", 403));
  });

  it("still allows admins to load any ticket", async () => {
    const ticket = {
      id: 104,
      userId: 9,
      queueId: 11,
      status: "open"
    };

    ticketFindByPkMock.mockResolvedValue(ticket);

    await expect(
      ShowTicketService(104, {
        userId: 1,
        profile: "admin"
      })
    ).resolves.toBe(ticket);

    expect(showUserServiceMock).not.toHaveBeenCalled();
  });
});