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
    showUserServiceMock.mockResolvedValue({
      id: 7,
      whatsappId: null,
      queues: []
    });

    await expect(
      ShowTicketService(101, {
        userId: 7,
        profile: "user"
      })
    ).resolves.toBe(ticket);

		expect(showUserServiceMock).toHaveBeenCalledWith(7);
  });

  it("allows the assigned user even when whatsapp scope differs", async () => {
    const ticket = {
      id: 108,
      userId: 7,
      queueId: 11,
      whatsappId: 77,
      status: "pending"
    };

    ticketFindByPkMock.mockResolvedValue(ticket);
    showUserServiceMock.mockResolvedValue({
      id: 7,
      whatsappId: 33,
      queues: []
    });

    await expect(
      ShowTicketService(108, {
        userId: 7,
        profile: "user"
      })
    ).resolves.toBe(ticket);
  });

  it("allows queue members to preview pending tickets assigned to nobody", async () => {
    const ticket = {
      id: 102,
      userId: null,
      queueId: 11,
      status: "pending"
    };

    ticketFindByPkMock.mockResolvedValue(ticket);
    showUserServiceMock.mockResolvedValue({
      id: 7,
      whatsappId: null,
      queues: [{ id: 11 }]
    });

    await expect(
      ShowTicketService(102, {
        userId: 7,
        profile: "user"
      })
    ).resolves.toBe(ticket);
  });

  it("blocks pending preview when the queue is not authorized for the user", async () => {
    ticketFindByPkMock.mockResolvedValue({
      id: 106,
      userId: null,
      queueId: 12,
      status: "pending"
    });
    showUserServiceMock.mockResolvedValue({
      id: 7,
      whatsappId: null,
      queues: [{ id: 11 }]
    });

    await expect(
      ShowTicketService(106, {
        userId: 7,
        profile: "user"
      })
    ).rejects.toEqual(new AppError("ERR_NO_PERMISSION", 403));
  });

  it("blocks pending preview with queueId null when there is no explicit whatsapp scope", async () => {
    ticketFindByPkMock.mockResolvedValue({
      id: 107,
      userId: null,
      queueId: null,
      whatsappId: 33,
      status: "pending"
    });
    showUserServiceMock.mockResolvedValue({
      id: 7,
      whatsappId: null,
      queues: [{ id: 11 }]
    });

    await expect(
      ShowTicketService(107, {
        userId: 7,
        profile: "user"
      })
    ).rejects.toEqual(new AppError("ERR_NO_PERMISSION", 403));
  });

  it("blocks non-admin users from loading pending tickets assigned to another user", async () => {
    ticketFindByPkMock.mockResolvedValue({
      id: 103,
      userId: 9,
      queueId: 11,
      status: "pending"
    });
    showUserServiceMock.mockResolvedValue({
      id: 7,
      whatsappId: null,
      queues: [{ id: 11 }]
    });

    await expect(
      ShowTicketService(103, {
        userId: 7,
        profile: "user"
      })
    ).rejects.toEqual(new AppError("ERR_NO_PERMISSION", 403));
  });

  it("blocks non-admin users from loading other users open tickets", async () => {
    ticketFindByPkMock.mockResolvedValue({
      id: 104,
      userId: 9,
      queueId: 11,
      status: "open"
    });
    showUserServiceMock.mockResolvedValue({
      id: 7,
      whatsappId: null,
      queues: [{ id: 11 }]
    });

    await expect(
      ShowTicketService(104, {
        userId: 7,
        profile: "user"
      })
    ).rejects.toEqual(new AppError("ERR_NO_PERMISSION", 403));
  });

  it("still allows admins to load any ticket", async () => {
    const ticket = {
      id: 105,
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