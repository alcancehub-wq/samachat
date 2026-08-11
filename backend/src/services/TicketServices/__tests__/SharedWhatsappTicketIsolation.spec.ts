import AppError from "../../../errors/AppError";
import Ticket from "../../../models/Ticket";
import ShowUserService from "../../UserServices/ShowUserService";
import CheckTicketAccess from "../CheckTicketAccess";

jest.mock("../../UserServices/ShowUserService", () => jest.fn());

const showUserServiceMock = ShowUserService as jest.Mock;

const SHARED_WHATSAPP_ID = 501;
const SHARED_QUEUE_ID = 701;
const USER_A_ID = 101;
const USER_B_ID = 102;

const buildUser = (id: number) => ({
  id,
  whatsappId: SHARED_WHATSAPP_ID,
  queues: [{ id: SHARED_QUEUE_ID }]
});

const buildTicket = (overrides: Record<string, unknown>) =>
  ({
    id: 9001,
    status: "open",
    userId: USER_A_ID,
    queueId: SHARED_QUEUE_ID,
    whatsappId: SHARED_WHATSAPP_ID,
    ...overrides
  } as Ticket);

describe("shared WhatsApp ticket isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows user A to access own open ticket", async () => {
    showUserServiceMock.mockResolvedValue(buildUser(USER_A_ID));

    const ticket = buildTicket({
      status: "open",
      userId: USER_A_ID
    });

    await expect(
      CheckTicketAccess({
        ticket,
        userId: USER_A_ID,
        profile: "user"
      })
    ).resolves.toBeUndefined();
  });

  it("denies user A access to user B open ticket even on the same whatsapp", async () => {
    showUserServiceMock.mockResolvedValue(buildUser(USER_A_ID));

    const ticket = buildTicket({
      status: "open",
      userId: USER_B_ID
    });

    await expect(
      CheckTicketAccess({
        ticket,
        userId: USER_A_ID,
        profile: "user"
      })
    ).rejects.toMatchObject({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    });
  });

  it("denies user B access to user A closed ticket even on the same whatsapp", async () => {
    showUserServiceMock.mockResolvedValue(buildUser(USER_B_ID));

    const ticket = buildTicket({
      status: "closed",
      userId: USER_A_ID
    });

    await expect(
      CheckTicketAccess({
        ticket,
        userId: USER_B_ID,
        profile: "user"
      })
    ).rejects.toMatchObject({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    });
  });

  it("allows compatible unassigned pending ticket through the shared queue", async () => {
    showUserServiceMock.mockResolvedValue(buildUser(USER_A_ID));

    const ticket = buildTicket({
      status: "pending",
      userId: null,
      queueId: SHARED_QUEUE_ID
    });

    await expect(
      CheckTicketAccess({
        ticket,
        userId: USER_A_ID,
        profile: "user"
      })
    ).resolves.toBeUndefined();
  });

  it("allows queue-null unassigned pending ticket through the same whatsapp", async () => {
    showUserServiceMock.mockResolvedValue(buildUser(USER_A_ID));

    const ticket = buildTicket({
      status: "pending",
      userId: null,
      queueId: null,
      whatsappId: SHARED_WHATSAPP_ID
    });

    await expect(
      CheckTicketAccess({
        ticket,
        userId: USER_A_ID,
        profile: "user"
      })
    ).resolves.toBeUndefined();
  });

  it("does not expose an assigned pending ticket from user B to user A", async () => {
    showUserServiceMock.mockResolvedValue(buildUser(USER_A_ID));

    const ticket = buildTicket({
      status: "pending",
      userId: USER_B_ID,
      queueId: SHARED_QUEUE_ID
    });

    await expect(
      CheckTicketAccess({
        ticket,
        userId: USER_A_ID,
        profile: "user"
      })
    ).rejects.toMatchObject({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    });
  });

  it("keeps admin access broad without loading user scope", async () => {
    const ticket = buildTicket({
      status: "closed",
      userId: USER_B_ID
    });

    await expect(
      CheckTicketAccess({
        ticket,
        userId: 999,
        profile: "admin"
      })
    ).resolves.toBeUndefined();

    expect(showUserServiceMock).not.toHaveBeenCalled();
  });
});
