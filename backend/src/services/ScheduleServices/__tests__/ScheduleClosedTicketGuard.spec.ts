import Schedule from "../../../models/Schedule";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import Contact from "../../../models/Contact";
import CreateScheduleService from "../CreateScheduleService";
import UpdateScheduleService from "../UpdateScheduleService";
import { executeSchedule, runScheduleWorkerOnce, resetScheduleWorkerState } from "../RunScheduleWorker";
import CreateScheduleLogService from "../CreateScheduleLogService";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import SendWhatsAppMedia from "../../WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../../WbotServices/SendWhatsAppMessage";
import { ERR_SCHEDULE_TICKET_CLOSED } from "../assertScheduleTicketIsActive";
import { buildScheduledMediaFile } from "../scheduleMedia";
import AppError from "../../../errors/AppError";

const FIXED_NOW = new Date("2026-05-23T12:00:00.000Z");

jest.mock("../../../models/Schedule", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn()
}));

jest.mock("../../../models/Ticket", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../models/User", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../models/Contact", () => ({
  findByPk: jest.fn()
}));

jest.mock("../CreateScheduleLogService", () => jest.fn());
jest.mock("../../TicketServices/ShowTicketService", () => jest.fn());
jest.mock("../../WbotServices/SendWhatsAppMedia", () => jest.fn());
jest.mock("../../WbotServices/SendWhatsAppMessage", () => jest.fn());
jest.mock("../scheduleMedia", () => ({
  buildScheduledMediaFile: jest.fn(),
  deleteScheduleMediaFileIfExists: jest.fn()
}));

const scheduleFindOneMock = Schedule.findOne as jest.Mock;
const scheduleCreateMock = Schedule.create as jest.Mock;
const scheduleFindByPkMock = Schedule.findByPk as jest.Mock;
const scheduleFindAllMock = Schedule.findAll as jest.Mock;
const scheduleUpdateStaticMock = Schedule.update as jest.Mock;
const ticketFindByPkMock = Ticket.findByPk as jest.Mock;
const userFindByPkMock = User.findByPk as jest.Mock;
const contactFindByPkMock = Contact.findByPk as jest.Mock;
const createScheduleLogServiceMock = CreateScheduleLogService as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const sendWhatsAppMediaMock = SendWhatsAppMedia as jest.Mock;
const sendWhatsAppMessageMock = SendWhatsAppMessage as jest.Mock;
const buildScheduledMediaFileMock = buildScheduledMediaFile as jest.Mock;

describe("Schedule closed ticket guards", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(FIXED_NOW);
    jest.clearAllMocks();
    resetScheduleWorkerState();
    scheduleFindOneMock.mockResolvedValue(null);
    userFindByPkMock.mockResolvedValue(null);
    contactFindByPkMock.mockResolvedValue(null);
    createScheduleLogServiceMock.mockResolvedValue({});
    scheduleFindAllMock.mockResolvedValue([]);
    scheduleUpdateStaticMock.mockResolvedValue([1]);
    buildScheduledMediaFileMock.mockReturnValue(null);
    sendWhatsAppMediaMock.mockResolvedValue({});
    sendWhatsAppMessageMock.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows creating a schedule for an open ticket", async () => {
    ticketFindByPkMock.mockResolvedValue({ id: 10, status: "open" });
    scheduleCreateMock.mockResolvedValue({ id: 11, status: "pending" });

    const result = await CreateScheduleService({
      body: " follow up ",
      scheduledAt: "2026-05-24T10:00:00.000Z",
      ticketId: 10
    });

    expect(scheduleCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "follow up",
        ticketId: 10,
        status: "pending"
      })
    );
    expect(result).toEqual({ id: 11, status: "pending" });
  });

  it("allows creating a schedule for a pending ticket", async () => {
    ticketFindByPkMock.mockResolvedValue({ id: 12, status: "pending" });
    scheduleCreateMock.mockResolvedValue({ id: 12, status: "pending" });

    const result = await CreateScheduleService({
      body: "pending flow",
      scheduledAt: "2026-05-24T11:00:00.000Z",
      ticketId: 12
    });

    expect(scheduleCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "pending flow",
        ticketId: 12,
        status: "pending"
      })
    );
    expect(result).toEqual({ id: 12, status: "pending" });
  });

  it("rejects creating a schedule in the past", async () => {
    ticketFindByPkMock.mockResolvedValue({ id: 14, status: "open" });

    await expect(
      CreateScheduleService({
        body: "past flow",
        scheduledAt: "2026-05-23T08:59",
        ticketId: 14
      })
    ).rejects.toMatchObject({ message: "ERR_SCHEDULE_DATE_MUST_BE_FUTURE" });

    expect(scheduleCreateMock).not.toHaveBeenCalled();
    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
  });

  it("rejects creating a schedule equal to the current time", async () => {
    ticketFindByPkMock.mockResolvedValue({ id: 15, status: "open" });

    await expect(
      CreateScheduleService({
        body: "equal flow",
        scheduledAt: "2026-05-23T09:00:00-03:00",
        ticketId: 15
      })
    ).rejects.toMatchObject({ message: "ERR_SCHEDULE_DATE_MUST_BE_FUTURE" });

    expect(scheduleCreateMock).not.toHaveBeenCalled();
    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
  });

  it("blocks creating a schedule for a closed ticket", async () => {
    ticketFindByPkMock.mockResolvedValue({ id: 13, status: "closed" });

    await expect(
      CreateScheduleService({
        body: "closed flow",
        scheduledAt: "2026-05-24T12:00:00.000Z",
        ticketId: 13
      })
    ).rejects.toMatchObject({ message: ERR_SCHEDULE_TICKET_CLOSED });

    expect(scheduleCreateMock).not.toHaveBeenCalled();
  });

  it("blocks creating a schedule for a lost ticket", async () => {
    ticketFindByPkMock.mockResolvedValue({ id: 130, status: "lost" });

    await expect(
      CreateScheduleService({
        body: "lost flow",
        scheduledAt: "2026-05-24T12:00:00.000Z",
        ticketId: 130
      })
    ).rejects.toMatchObject({ message: ERR_SCHEDULE_TICKET_CLOSED });

    expect(scheduleCreateMock).not.toHaveBeenCalled();
  });

  it("allows creating a schedule with media only", async () => {
    ticketFindByPkMock.mockResolvedValue({ id: 16, status: "open" });
    scheduleCreateMock.mockResolvedValue({ id: 16, status: "pending" });

    const result = await CreateScheduleService({
      body: "",
      scheduledAt: "2026-05-24T12:30:00.000Z",
      ticketId: 16,
      mediaFileName: "media-16.mp3",
      mediaOriginalName: "audio.mp3",
      mediaMimeType: "audio/mpeg"
    });

    expect(scheduleCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "",
        mediaFileName: "media-16.mp3",
        mediaOriginalName: "audio.mp3",
        mediaMimeType: "audio/mpeg"
      })
    );
    expect(result).toEqual({ id: 16, status: "pending" });
  });

  it("blocks editing a schedule linked to a closed ticket", async () => {
    const scheduleUpdateMock = jest.fn().mockResolvedValue(undefined);
    const scheduleReloadMock = jest.fn().mockResolvedValue(undefined);

    scheduleFindByPkMock.mockResolvedValue({
      id: 20,
      body: "current",
      status: "pending",
      scheduledAt: new Date("2026-05-24T12:00:00.000Z"),
      sentAt: null,
      canceledAt: null,
      lastError: null,
      lastResult: null,
      assigneeId: null,
      ticketId: 20,
      contactId: null,
      update: scheduleUpdateMock,
      reload: scheduleReloadMock
    });
    ticketFindByPkMock.mockResolvedValue({ id: 20, status: "closed" });

    await expect(
      UpdateScheduleService({
        scheduleId: "20",
        scheduleData: { body: "updated body" }
      })
    ).rejects.toMatchObject({ message: ERR_SCHEDULE_TICKET_CLOSED });

    expect(scheduleUpdateMock).not.toHaveBeenCalled();
    expect(scheduleReloadMock).not.toHaveBeenCalled();
  });

  it("allows editing a schedule when the new date remains in the future", async () => {
    const scheduleUpdateMock = jest.fn().mockResolvedValue(undefined);
    const scheduleReloadMock = jest.fn().mockResolvedValue(undefined);
    const schedule = {
      id: 21,
      body: "current",
      status: "pending",
      scheduledAt: new Date("2026-05-24T12:00:00.000Z"),
      sentAt: null,
      canceledAt: null,
      lastError: null,
      lastResult: null,
      assigneeId: null,
      ticketId: 21,
      contactId: null,
      update: scheduleUpdateMock,
      reload: scheduleReloadMock
    };

    scheduleFindByPkMock.mockResolvedValue(schedule);
    ticketFindByPkMock.mockResolvedValue({ id: 21, status: "open" });

    const result = await UpdateScheduleService({
      scheduleId: "21",
      scheduleData: { scheduledAt: "2026-05-23T12:30" }
    });

    expect(scheduleUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledAt: new Date("2026-05-23T15:30:00.000Z")
      })
    );
    expect(result).toBe(schedule);
    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
  });

  it("rejects editing a schedule into the past", async () => {
    const scheduleUpdateMock = jest.fn().mockResolvedValue(undefined);
    const scheduleReloadMock = jest.fn().mockResolvedValue(undefined);

    scheduleFindByPkMock.mockResolvedValue({
      id: 22,
      body: "current",
      status: "pending",
      scheduledAt: new Date("2026-05-24T12:00:00.000Z"),
      sentAt: null,
      canceledAt: null,
      lastError: null,
      lastResult: null,
      assigneeId: null,
      ticketId: 22,
      contactId: null,
      update: scheduleUpdateMock,
      reload: scheduleReloadMock
    });
    ticketFindByPkMock.mockResolvedValue({ id: 22, status: "open" });

    await expect(
      UpdateScheduleService({
        scheduleId: "22",
        scheduleData: { scheduledAt: "2026-05-23T08:59" }
      })
    ).rejects.toMatchObject({ message: "ERR_SCHEDULE_DATE_MUST_BE_FUTURE" });

    expect(scheduleUpdateMock).not.toHaveBeenCalled();
    expect(scheduleReloadMock).not.toHaveBeenCalled();
    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
  });

  it("does not send legacy schedules when the linked ticket is closed", async () => {
    scheduleFindByPkMock.mockResolvedValue({
      id: 30,
      status: "processing",
      ticketId: 30,
      body: "scheduled body",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
    });
    showTicketServiceMock.mockResolvedValue({ id: 30, status: "closed" });

    await executeSchedule(30);

    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      {
        status: "failed",
        lastError: ERR_SCHEDULE_TICKET_CLOSED
      },
      { where: { id: 30 } }
    );
    expect(createScheduleLogServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 30,
        status: "failed",
        error: ERR_SCHEDULE_TICKET_CLOSED
      })
    );
  });

  it("sends scheduled media through SendWhatsAppMedia", async () => {
    const scheduledMedia = {
      filename: "media-31.pdf",
      originalname: "proposal.pdf",
      mimetype: "application/pdf",
      path: "C:\\temp\\media-31.pdf",
      size: 1234
    };

    scheduleFindByPkMock.mockResolvedValue({
      id: 31,
      status: "processing",
      ticketId: 31,
      body: "scheduled body",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00"),
      mediaFileName: "media-31.pdf",
      mediaOriginalName: "proposal.pdf",
      mediaMimeType: "application/pdf"
    });
    showTicketServiceMock.mockResolvedValue({ id: 31, status: "open" });
    buildScheduledMediaFileMock.mockReturnValue(scheduledMedia);

    await executeSchedule(31);

    expect(sendWhatsAppMediaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        media: scheduledMedia,
        body: "scheduled body"
      })
    );
    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent"
      }),
      { where: { id: 31 } }
    );
  });

  it("fails scheduled media execution when the stored file is missing", async () => {
    scheduleFindByPkMock.mockResolvedValue({
      id: 32,
      status: "processing",
      ticketId: 32,
      body: "scheduled body",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00"),
      mediaFileName: "missing-32.pdf",
      mediaOriginalName: "missing.pdf",
      mediaMimeType: "application/pdf"
    });
    showTicketServiceMock.mockResolvedValue({ id: 32, status: "open" });
    buildScheduledMediaFileMock.mockImplementation(() => {
      throw new AppError("ERR_SCHEDULE_MEDIA_NOT_FOUND", 404);
    });

    await executeSchedule(32);

    expect(sendWhatsAppMediaMock).not.toHaveBeenCalled();
    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      {
        status: "failed",
        lastError: "ERR_SCHEDULE_MEDIA_NOT_FOUND"
      },
      { where: { id: 32 } }
    );
  });

  it.each(["open", "pending"])(
    "preserves worker execution for %s tickets",
    async ticketStatus => {
      scheduleFindByPkMock.mockResolvedValue({
        id: 31,
        status: "processing",
        ticketId: 31,
        body: "scheduled body",
        scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
      });
      showTicketServiceMock.mockResolvedValue({ id: 31, status: ticketStatus });

      await executeSchedule(31);

      expect(sendWhatsAppMessageMock).toHaveBeenCalledWith({
        body: "scheduled body",
        ticket: { id: 31, status: ticketStatus }
      });
      expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "sent",
          lastResult: "Schedule sent successfully",
          lastError: null
        }),
        { where: { id: 31 } }
      );
    }
  );

  it("does not execute a schedule before the scheduled time", async () => {
    scheduleFindByPkMock.mockResolvedValue({
      id: 32,
      status: "processing",
      ticketId: 32,
      body: "scheduled body",
      scheduledAt: new Date("2026-05-23T09:01:00.000-03:00")
    });

    await executeSchedule(32);

    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      {
        status: "pending",
        lastError: null,
        lastResult: null
      },
      {
        where: {
          id: 32,
          status: "processing"
        }
      }
    );
    expect(createScheduleLogServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 32,
        status: "pending",
        message: expect.stringContaining('"event":"schedule_not_due_yet"')
      })
    );
  });

  it("does not execute schedules with invalid scheduledAt values", async () => {
    scheduleFindByPkMock.mockResolvedValue({
      id: 33,
      status: "processing",
      ticketId: 33,
      body: "scheduled body",
      scheduledAt: "invalid-date"
    });

    await executeSchedule(33);

    expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      {
        status: "failed",
        lastError: "ERR_SCHEDULE_DATE_INVALID"
      },
      { where: { id: 33 } }
    );
    expect(createScheduleLogServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 33,
        status: "failed",
        error: "ERR_SCHEDULE_DATE_INVALID"
      })
    );
  });

  it.each(["sent", "canceled", "failed"])(
    "does not execute schedules already marked as %s",
    async status => {
      scheduleFindByPkMock.mockResolvedValue({
        id: 34,
        status,
        ticketId: 34,
        body: "scheduled body",
        scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
      });

      await executeSchedule(34);

      expect(sendWhatsAppMessageMock).not.toHaveBeenCalled();
      expect(scheduleUpdateStaticMock).not.toHaveBeenCalled();
    }
  );


  it("uses the schedule creator as message context even after ticket transfer", async () => {
    const scheduleCreator = {
        id: 101,
        name: "Bruna",
        email: "bruna@example.com",
        whatsappId: 303,
        whatsapp: { id: 303 }
      };
    const transferredTicket = {
      id: 70,
      status: "open",
      userId: 202,
      user: { id: 202, name: "Ana Carvalho", email: "ana@example.com" },
      setDataValue: jest.fn((key: string, value: unknown) => {
        transferredTicket[key as keyof typeof transferredTicket] = value as never;
      })
    };

    scheduleFindByPkMock.mockResolvedValue({
      id: 70,
      status: "processing",
      ticketId: 70,
      createdById: 101,
      body: "scheduled body with creator context",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
    });

    showTicketServiceMock.mockResolvedValue(transferredTicket);
    userFindByPkMock.mockResolvedValue(scheduleCreator);

    await executeSchedule(70);

    expect(userFindByPkMock).toHaveBeenCalledWith(101, {
      attributes: ["id", "name", "email", "whatsappId"],
      include: ["whatsapp"]
    });

    expect(transferredTicket.setDataValue).toHaveBeenCalledWith(
      "user",
      scheduleCreator
    );

    expect(transferredTicket.setDataValue).toHaveBeenCalledWith(
      "whatsappId",
      303
    );

    expect(sendWhatsAppMessageMock).toHaveBeenCalledWith({
      body: "scheduled body with creator context",
      ticket: expect.objectContaining({
        id: 70,
        userId: 202,
        user: scheduleCreator
      })
    });

    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
        lastResult: "Schedule sent successfully",
        lastError: null
      }),
      { where: { id: 70 } }
    );
  });

  it("returns the schedule to pending when WhatsApp is not initialized yet", async () => {
    scheduleFindByPkMock.mockResolvedValue({
      id: 35,
      status: "processing",
      ticketId: 35,
      body: "scheduled body",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
    });
    showTicketServiceMock.mockResolvedValue({ id: 35, status: "open" });
    sendWhatsAppMessageMock.mockRejectedValue(new AppError("ERR_WAPP_NOT_INITIALIZED"));

    await executeSchedule(35);

    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      {
        status: "pending",
        lastError: "ERR_WAPP_NOT_INITIALIZED",
        lastResult: null
      },
      {
        where: {
          id: 35,
          status: "processing"
        }
      }
    );
    expect(createScheduleLogServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 35,
        status: "pending",
        message: expect.stringContaining('"event":"schedule_retry_whatsapp_unavailable"'),
        error: "ERR_WAPP_NOT_INITIALIZED"
      })
    );
  });

  it("preserves definitive send errors instead of masking them as generic failures", async () => {
    scheduleFindByPkMock.mockResolvedValue({
      id: 36,
      status: "processing",
      ticketId: 36,
      body: "scheduled body",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
    });
    showTicketServiceMock.mockResolvedValue({ id: 36, status: "open" });
    sendWhatsAppMessageMock.mockRejectedValue({ message: "ERR_WAPP_INVALID_CONTACT" });

    await executeSchedule(36);

    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      {
        status: "failed",
        lastError: "ERR_WAPP_INVALID_CONTACT"
      },
      { where: { id: 36 } }
    );
    expect(createScheduleLogServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 36,
        status: "failed",
        error: "ERR_WAPP_INVALID_CONTACT"
      })
    );
  });

  it("retries on a later worker pass without duplicating a successful send", async () => {
    scheduleFindByPkMock
      .mockResolvedValueOnce({
        id: 37,
        status: "processing",
        ticketId: 37,
        body: "scheduled body",
        scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
      })
      .mockResolvedValueOnce({
        id: 37,
        status: "processing",
        ticketId: 37,
        body: "scheduled body",
        scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
      })
      .mockResolvedValueOnce({
        id: 37,
        status: "sent",
        ticketId: 37,
        body: "scheduled body",
        scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
      });
    showTicketServiceMock.mockResolvedValue({ id: 37, status: "open" });
    sendWhatsAppMessageMock
      .mockRejectedValueOnce(new AppError("ERR_WAPP_NOT_INITIALIZED"))
      .mockResolvedValueOnce({});

    await executeSchedule(37);
    await executeSchedule(37);
    await executeSchedule(37);

    expect(sendWhatsAppMessageMock).toHaveBeenCalledTimes(2);
    expect(scheduleUpdateStaticMock).toHaveBeenNthCalledWith(
      1,
      {
        status: "pending",
        lastError: "ERR_WAPP_NOT_INITIALIZED",
        lastResult: null
      },
      {
        where: {
          id: 37,
          status: "processing"
        }
      }
    );
    expect(scheduleUpdateStaticMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: "sent",
        lastResult: "Schedule sent successfully",
        lastError: null
      }),
      { where: { id: 37 } }
    );
  });

  it("processes different WhatsApp connections in the same worker cycle", async () => {
    scheduleFindAllMock.mockResolvedValue([
      {
        id: 41,
        ticket: { id: 410, whatsappId: 101 }
      },
      {
        id: 42,
        ticket: { id: 420, whatsappId: 202 }
      }
    ]);
    scheduleFindByPkMock
      .mockResolvedValueOnce({
        id: 41,
        status: "processing",
        ticketId: 410,
        body: "message 41",
        scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
      })
      .mockResolvedValueOnce({
        id: 42,
        status: "processing",
        ticketId: 420,
        body: "message 42",
        scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
      });
    showTicketServiceMock
      .mockResolvedValueOnce({ id: 410, status: "open", whatsappId: 101 })
      .mockResolvedValueOnce({ id: 420, status: "open", whatsappId: 202 });

    await runScheduleWorkerOnce();

    expect(sendWhatsAppMessageMock).toHaveBeenCalledTimes(2);
    expect(sendWhatsAppMessageMock).toHaveBeenNthCalledWith(1, {
      body: "message 41",
      ticket: { id: 410, status: "open", whatsappId: 101 }
    });
    expect(sendWhatsAppMessageMock).toHaveBeenNthCalledWith(2, {
      body: "message 42",
      ticket: { id: 420, status: "open", whatsappId: 202 }
    });
  });

  it("limits the worker to one due schedule per WhatsApp connection per cycle", async () => {
    scheduleFindAllMock.mockResolvedValue([
      {
        id: 51,
        ticket: { id: 510, whatsappId: 303 }
      },
      {
        id: 52,
        ticket: { id: 520, whatsappId: 303 }
      }
    ]);
    scheduleFindByPkMock.mockResolvedValue({
      id: 51,
      status: "processing",
      ticketId: 510,
      body: "message 51",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
    });
    showTicketServiceMock.mockResolvedValue({ id: 510, status: "open", whatsappId: 303 });

    await runScheduleWorkerOnce();

    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      { status: "processing" },
      {
        where: {
          id: 51,
          status: "pending"
        }
      }
    );
    expect(scheduleUpdateStaticMock).not.toHaveBeenCalledWith(
      { status: "processing" },
      {
        where: {
          id: 52,
          status: "pending"
        }
      }
    );
    expect(sendWhatsAppMessageMock).toHaveBeenCalledTimes(1);
  });

  it("skips a WhatsApp connection during cooldown after ERR_WAPP_NOT_INITIALIZED and retries later", async () => {
    process.env.SCHEDULE_WAPP_UNAVAILABLE_COOLDOWN_MS = "60000";
    scheduleFindByPkMock.mockResolvedValue({
      id: 61,
      status: "processing",
      ticketId: 610,
      body: "message 61",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
    });
    showTicketServiceMock.mockResolvedValue({ id: 610, status: "open", whatsappId: 404 });
    sendWhatsAppMessageMock.mockRejectedValueOnce(new AppError("ERR_WAPP_NOT_INITIALIZED"));

    await executeSchedule(61);

    scheduleFindAllMock.mockResolvedValue([
      {
        id: 61,
        ticket: { id: 610, whatsappId: 404 }
      },
      {
        id: 62,
        ticket: { id: 620, whatsappId: 505 }
      }
    ]);
    scheduleFindByPkMock.mockResolvedValueOnce({
      id: 62,
      status: "processing",
      ticketId: 620,
      body: "message 62",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
    });
    showTicketServiceMock.mockResolvedValueOnce({ id: 620, status: "open", whatsappId: 505 });
    sendWhatsAppMessageMock.mockResolvedValueOnce({});

    await runScheduleWorkerOnce();

    expect(scheduleUpdateStaticMock).toHaveBeenCalledWith(
      { status: "processing" },
      {
        where: {
          id: 62,
          status: "pending"
        }
      }
    );
    expect(scheduleUpdateStaticMock).not.toHaveBeenCalledWith(
      { status: "processing" },
      {
        where: {
          id: 61,
          status: "pending"
        }
      }
    );

    jest.advanceTimersByTime(60001);

    scheduleFindAllMock.mockResolvedValue([
      {
        id: 61,
        ticket: { id: 610, whatsappId: 404 }
      }
    ]);
    scheduleFindByPkMock.mockResolvedValueOnce({
      id: 61,
      status: "processing",
      ticketId: 610,
      body: "message 61",
      scheduledAt: new Date("2026-05-23T08:59:00.000-03:00")
    });
    showTicketServiceMock.mockResolvedValueOnce({ id: 610, status: "open", whatsappId: 404 });
    sendWhatsAppMessageMock.mockResolvedValueOnce({});

    await runScheduleWorkerOnce();

    expect(sendWhatsAppMessageMock).toHaveBeenCalledTimes(3);
  });
});