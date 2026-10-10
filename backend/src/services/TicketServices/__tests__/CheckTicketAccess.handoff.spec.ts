import CheckTicketAccess from "../CheckTicketAccess";
import ShowUserService from "../../UserServices/ShowUserService";

jest.mock("../../UserServices/ShowUserService");

const showUserMock = ShowUserService as jest.Mock;

describe("BIA handoff ticket authorization regression", () => {
  const aiTicket = {
    id: 3765,
    status: "open",
    userId: null,
    queueId: 5,
    whatsappId: 56,
    sdrAgentEnabled: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows Ju to reclaim an AI-active ticket in her own queue and connection", async () => {
    showUserMock.mockResolvedValue({
      id: 32,
      profile: "user",
      whatsappId: 56,
      queues: [{ id: 5 }]
    });

    await expect(
      CheckTicketAccess({
        ticket: aiTicket as any,
        userId: 32,
        profile: "user"
      })
    ).resolves.toBeUndefined();
  });

  it("blocks an operator from a different WhatsApp connection", async () => {
    showUserMock.mockResolvedValue({
      id: 33,
      profile: "user",
      whatsappId: 35,
      queues: [{ id: 5 }]
    });

    await expect(
      CheckTicketAccess({
        ticket: aiTicket as any,
        userId: 33,
        profile: "user"
      })
    ).rejects.toMatchObject({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    });
  });

  it("blocks an operator without access to the SDR queue", async () => {
    showUserMock.mockResolvedValue({
      id: 34,
      profile: "user",
      whatsappId: 56,
      queues: [{ id: 4 }]
    });

    await expect(
      CheckTicketAccess({
        ticket: aiTicket as any,
        userId: 34,
        profile: "user"
      })
    ).rejects.toMatchObject({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    });
  });

  it("allows the assigned human owner after successful reclaim", async () => {
    showUserMock.mockResolvedValue({
      id: 32,
      profile: "user",
      whatsappId: 56,
      queues: [{ id: 5 }]
    });

    await expect(
      CheckTicketAccess({
        ticket: {
          ...aiTicket,
          userId: 32,
          sdrAgentEnabled: false
        } as any,
        userId: 32,
        profile: "user"
      })
    ).resolves.toBeUndefined();
  });

  it("documents the forbidden self-lock state after a partial handoff", async () => {
    showUserMock.mockResolvedValue({
      id: 32,
      profile: "user",
      whatsappId: 56,
      queues: [{ id: 5 }]
    });

    await expect(
      CheckTicketAccess({
        ticket: {
          ...aiTicket,
          userId: null,
          sdrAgentEnabled: false
        } as any,
        userId: 32,
        profile: "user"
      })
    ).rejects.toMatchObject({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    });
  });
});
