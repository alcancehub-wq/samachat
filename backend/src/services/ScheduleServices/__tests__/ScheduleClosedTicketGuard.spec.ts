import Schedule from "../../../models/Schedule";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import Contact from "../../../models/Contact";
import CreateScheduleService from "../CreateScheduleService";
import UpdateScheduleService from "../UpdateScheduleService";
import { executeSchedule } from "../RunScheduleWorker";
import CreateScheduleLogService from "../CreateScheduleLogService";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import SendWhatsAppMessage from "../../WbotServices/SendWhatsAppMessage";
import { ERR_SCHEDULE_TICKET_CLOSED } from "../assertScheduleTicketIsActive";
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
jest.mock("../../WbotServices/SendWhatsAppMessage", () => jest.fn());

const scheduleFindOneMock = Schedule.findOne as jest.Mock;
const scheduleCreateMock = Schedule.create as jest.Mock;
const scheduleFindByPkMock = Schedule.findByPk as jest.Mock;
const scheduleUpdateStaticMock = Schedule.update as jest.Mock;
const ticketFindByPkMock = Ticket.findByPk as jest.Mock;
const userFindByPkMock = User.findByPk as jest.Mock;
const contactFindByPkMock = Contact.findByPk as jest.Mock;
const createScheduleLogServiceMock = CreateScheduleLogService as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const sendWhatsAppMessageMock = SendWhatsAppMessage as jest.Mock;

describe("Schedule closed ticket guards", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(FIXED_NOW);
    jest.clearAllMocks();
    scheduleFindOneMock.mockResolvedValue(null);
    userFindByPkMock.mockResolvedValue(null);
    contactFindByPkMock.mockResolvedValue(null);
    createScheduleLogServiceMock.mockResolvedValue({});
    scheduleUpdateStaticMock.mockResolvedValue([1]);
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
        message: "Schedule is not due yet"
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
        message: "Retrying schedule because WhatsApp session is not ready",
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
});