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
    jest.clearAllMocks();
    scheduleFindOneMock.mockResolvedValue(null);
    userFindByPkMock.mockResolvedValue(null);
    contactFindByPkMock.mockResolvedValue(null);
    createScheduleLogServiceMock.mockResolvedValue({});
    scheduleUpdateStaticMock.mockResolvedValue([1]);
    sendWhatsAppMessageMock.mockResolvedValue({});
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

  it("does not send legacy schedules when the linked ticket is closed", async () => {
    scheduleFindByPkMock.mockResolvedValue({
      id: 30,
      status: "processing",
      ticketId: 30,
      body: "scheduled body"
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
        body: "scheduled body"
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
});