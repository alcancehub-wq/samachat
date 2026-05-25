import AppError from "../../../errors/AppError";
import Schedule from "../../../models/Schedule";
import User from "../../../models/User";
import Contact from "../../../models/Contact";
import ListSchedulesService from "../ListSchedulesService";
import ShowScheduleService from "../ShowScheduleService";
import CreateScheduleService from "../CreateScheduleService";
import UpdateScheduleService from "../UpdateScheduleService";
import DeleteScheduleService from "../DeleteScheduleService";
import CreateScheduleLogService from "../CreateScheduleLogService";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import CheckTicketAccess from "../../TicketServices/CheckTicketAccess";

jest.mock("../../../models/Schedule", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn()
}));

jest.mock("../../../models/User", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../models/Contact", () => ({
  findByPk: jest.fn()
}));

jest.mock("../CreateScheduleLogService", () => jest.fn());
jest.mock("../../TicketServices/ShowTicketService", () => jest.fn());
jest.mock("../../TicketServices/CheckTicketAccess", () => jest.fn());

const scheduleFindOneMock = Schedule.findOne as jest.Mock;
const scheduleCreateMock = Schedule.create as jest.Mock;
const scheduleFindByPkMock = Schedule.findByPk as jest.Mock;
const scheduleFindAllMock = Schedule.findAll as jest.Mock;
const userFindByPkMock = User.findByPk as jest.Mock;
const contactFindByPkMock = Contact.findByPk as jest.Mock;
const createScheduleLogServiceMock = CreateScheduleLogService as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const checkTicketAccessMock = CheckTicketAccess as jest.Mock;

const operatorAccess = {
  userId: "5",
  profile: "user"
};

const adminAccess = {
  userId: "1",
  profile: "admin"
};

const FIXED_NOW = new Date("2026-05-23T12:00:00.000Z");

describe("Schedule scope access", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(FIXED_NOW);
    jest.clearAllMocks();
    scheduleFindOneMock.mockResolvedValue(null);
    userFindByPkMock.mockResolvedValue(null);
    contactFindByPkMock.mockResolvedValue(null);
    createScheduleLogServiceMock.mockResolvedValue({});
    checkTicketAccessMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("lets admin list schedules from any ticket", async () => {
    const schedules = [
      { id: 1, ticketId: 10, ticket: { id: 10 } },
      { id: 2, ticketId: null, ticket: null }
    ];
    scheduleFindAllMock.mockResolvedValue(schedules);

    const result = await ListSchedulesService({ accessData: adminAccess });

    expect(result).toEqual(schedules);
    expect(checkTicketAccessMock).not.toHaveBeenCalled();
  });

  it("filters schedule listing to only tickets accessible to the operator", async () => {
    const allowedSchedule = {
      id: 1,
      ticketId: 10,
      ticket: { id: 10, status: "open", userId: 5, queueId: 1, whatsappId: 13 }
    };
    const hiddenSchedule = {
      id: 2,
      ticketId: 11,
      ticket: { id: 11, status: "open", userId: 9, queueId: 2, whatsappId: 99 }
    };
    const noTicketSchedule = {
      id: 3,
      ticketId: null,
      ticket: null
    };

    scheduleFindAllMock.mockResolvedValue([
      allowedSchedule,
      hiddenSchedule,
      noTicketSchedule
    ]);
    checkTicketAccessMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new AppError("ERR_NO_PERMISSION", 403));

    const result = await ListSchedulesService({ accessData: operatorAccess });

    expect(result).toEqual([allowedSchedule]);
    expect(checkTicketAccessMock).toHaveBeenCalledTimes(2);
  });

  it("returns 403 when showing a schedule outside the operator scope", async () => {
    scheduleFindByPkMock.mockResolvedValue({
      id: 20,
      ticketId: 20,
      ticket: { id: 20, status: "open", userId: 9, queueId: 2, whatsappId: 99 }
    });
    checkTicketAccessMock.mockRejectedValue(new AppError("ERR_NO_PERMISSION", 403));

    await expect(
      ShowScheduleService("20", operatorAccess)
    ).rejects.toMatchObject({ message: "ERR_NO_PERMISSION", statusCode: 403 });
  });

  it("returns 403 when creating a schedule for a ticket outside the operator scope", async () => {
    showTicketServiceMock.mockRejectedValue(new AppError("ERR_NO_PERMISSION", 403));

    await expect(
      CreateScheduleService({
        body: "scoped create",
        scheduledAt: "2026-05-24T10:00:00.000Z",
        ticketId: 30,
        accessData: operatorAccess
      })
    ).rejects.toMatchObject({ message: "ERR_NO_PERMISSION", statusCode: 403 });

    expect(scheduleCreateMock).not.toHaveBeenCalled();
  });

  it("returns 403 when canceling a schedule outside the operator scope", async () => {
    const scheduleUpdateMock = jest.fn().mockResolvedValue(undefined);
    const scheduleReloadMock = jest.fn().mockResolvedValue(undefined);

    scheduleFindByPkMock.mockResolvedValue({
      id: 40,
      body: "current",
      status: "pending",
      scheduledAt: new Date("2026-05-24T12:00:00.000Z"),
      sentAt: null,
      canceledAt: null,
      lastError: null,
      lastResult: null,
      assigneeId: null,
      ticketId: 40,
      contactId: null,
      ticket: { id: 40, status: "open", userId: 9, queueId: 2, whatsappId: 99 },
      update: scheduleUpdateMock,
      reload: scheduleReloadMock
    });
    checkTicketAccessMock.mockRejectedValue(new AppError("ERR_NO_PERMISSION", 403));

    await expect(
      UpdateScheduleService({
        scheduleId: "40",
        scheduleData: { status: "canceled" },
        accessData: operatorAccess
      })
    ).rejects.toMatchObject({ message: "ERR_NO_PERMISSION", statusCode: 403 });

    expect(scheduleUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 403 when deleting a schedule outside the operator scope", async () => {
    const scheduleDestroyMock = jest.fn().mockResolvedValue(undefined);

    scheduleFindByPkMock.mockResolvedValue({
      id: 50,
      ticketId: 50,
      ticket: { id: 50, status: "open", userId: 9, queueId: 2, whatsappId: 99 },
      destroy: scheduleDestroyMock
    });
    checkTicketAccessMock.mockRejectedValue(new AppError("ERR_NO_PERMISSION", 403));

    await expect(
      DeleteScheduleService("50", operatorAccess)
    ).rejects.toMatchObject({ message: "ERR_NO_PERMISSION", statusCode: 403 });

    expect(scheduleDestroyMock).not.toHaveBeenCalled();
  });

  it("keeps in-scope schedule operations working for the operator", async () => {
    const scheduleUpdateMock = jest.fn().mockResolvedValue(undefined);
    const scheduleReloadMock = jest.fn().mockResolvedValue(undefined);
    const schedule = {
      id: 60,
      body: "current",
      status: "pending",
      scheduledAt: new Date("2026-05-24T12:00:00.000Z"),
      sentAt: null,
      canceledAt: null,
      lastError: null,
      lastResult: null,
      assigneeId: null,
      ticketId: 60,
      contactId: null,
      ticket: { id: 60, status: "open", userId: 5, queueId: 1, whatsappId: 13 },
      update: scheduleUpdateMock,
      reload: scheduleReloadMock
    };

    showTicketServiceMock.mockResolvedValue({ id: 60, status: "open" });
    scheduleCreateMock.mockResolvedValue({ id: 61, status: "pending" });
    scheduleFindByPkMock.mockResolvedValue(schedule);

    const created = await CreateScheduleService({
      body: "scoped create ok",
      scheduledAt: "2026-05-24T13:00:00.000Z",
      ticketId: 60,
      accessData: operatorAccess
    });

    const updated = await UpdateScheduleService({
      scheduleId: "60",
      scheduleData: { body: "updated" },
      accessData: operatorAccess
    });

    expect(created).toEqual({ id: 61, status: "pending" });
    expect(scheduleUpdateMock).toHaveBeenCalled();
    expect(updated).toBe(schedule);
  });
});