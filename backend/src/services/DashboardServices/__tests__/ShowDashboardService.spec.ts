import Ticket from "../../../models/Ticket";
import Campaign from "../../../models/Campaign";
import Contact from "../../../models/Contact";
import Flow from "../../../models/Flow";
import Message from "../../../models/Message";
import Queue from "../../../models/Queue";
import Schedule from "../../../models/Schedule";
import Task from "../../../models/Task";
import Whatsapp from "../../../models/Whatsapp";
import { Op } from "sequelize";
import ShowDashboardService from "../ShowDashboardService";
import ShowUserService from "../../UserServices/ShowUserService";

jest.mock("../../../models/Ticket", () => ({
  count: jest.fn(),
  findAll: jest.fn()
}));

jest.mock("../../../models/Campaign", () => ({
  count: jest.fn()
}));

jest.mock("../../../models/Contact", () => ({
  count: jest.fn()
}));

jest.mock("../../../models/Flow", () => ({
  count: jest.fn()
}));

jest.mock("../../../models/Message", () => ({
  findAll: jest.fn()
}));

jest.mock("../../../models/Queue", () => ({
  findAll: jest.fn()
}));

jest.mock("../../../models/Schedule", () => ({
  count: jest.fn(),
  findAll: jest.fn()
}));

jest.mock("../../../models/Task", () => ({
  count: jest.fn(),
  findAll: jest.fn()
}));

jest.mock("../../../models/Whatsapp", () => ({
  findAll: jest.fn()
}));

jest.mock("../../UserServices/ShowUserService");

const ticketCountMock = Ticket.count as jest.Mock;
const ticketFindAllMock = Ticket.findAll as jest.Mock;
const contactCountMock = Contact.count as jest.Mock;
const queueFindAllMock = Queue.findAll as jest.Mock;
const whatsappFindAllMock = Whatsapp.findAll as jest.Mock;
const taskCountMock = Task.count as jest.Mock;
const taskFindAllMock = Task.findAll as jest.Mock;
const scheduleCountMock = Schedule.count as jest.Mock;
const scheduleFindAllMock = Schedule.findAll as jest.Mock;
const flowCountMock = Flow.count as jest.Mock;
const campaignCountMock = Campaign.count as jest.Mock;
const messageFindAllMock = Message.findAll as jest.Mock;
const showUserServiceMock = ShowUserService as jest.Mock;

const hasAssigneeScope = (value: unknown, assigneeId: number): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if ((value as Record<string, unknown>).userId === assigneeId) {
    return true;
  }

  return Reflect.ownKeys(value).some(key => {
    const nestedValue = (value as Record<PropertyKey, unknown>)[key];

    if (key === Op.and || key === Op.or) {
      return Array.isArray(nestedValue)
        ? nestedValue.some(entry => hasAssigneeScope(entry, assigneeId))
        : hasAssigneeScope(nestedValue, assigneeId);
    }

    return hasAssigneeScope(nestedValue, assigneeId);
  });
};

const hasQueueNullScope = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if ((value as Record<string, unknown>).queueId === null) {
    return true;
  }

  return Reflect.ownKeys(value).some(key => {
    const nestedValue = (value as Record<PropertyKey, unknown>)[key];

    if (key === Op.and || key === Op.or) {
      return Array.isArray(nestedValue)
        ? nestedValue.some(entry => hasQueueNullScope(entry))
        : hasQueueNullScope(nestedValue);
    }

    return hasQueueNullScope(nestedValue);
  });
};

describe("ShowDashboardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    showUserServiceMock.mockResolvedValue({
      id: 7,
      queues: [{ id: 11 }]
    });

    ticketCountMock.mockResolvedValue(0);
    contactCountMock.mockResolvedValue(0);
    queueFindAllMock.mockResolvedValue([{ id: 11, name: "Suporte" }]);
    whatsappFindAllMock.mockResolvedValue([]);
    taskCountMock.mockResolvedValue(0);
    taskFindAllMock.mockResolvedValue([]);
    scheduleCountMock.mockResolvedValue(0);
    scheduleFindAllMock.mockResolvedValue([]);
    flowCountMock.mockResolvedValue(0);
    campaignCountMock.mockResolvedValue(0);
    messageFindAllMock.mockResolvedValue([]);

    ticketFindAllMock
      .mockResolvedValueOnce([{ bucketHour: 10, count: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
  });

  it("does not force the logged user as implicit assignee for non-admin dashboard metrics", async () => {
    await ShowDashboardService({
      userId: 7,
      profile: "user",
      period: "today"
    });

    expect(ticketFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          userId: 7
        })
      })
    );
  });

  it("still applies the assignee filter when it is explicitly requested", async () => {
    await ShowDashboardService({
      userId: 7,
      profile: "user",
      period: "today",
      assigneeId: 9
    });

    const firstCallArgs = ticketFindAllMock.mock.calls[0][0];
    expect(hasAssigneeScope(firstCallArgs.where, 9)).toBe(true);
  });

  it("does not restrict non-admin dashboard data to unassigned queues when the user has no queue bindings", async () => {
    showUserServiceMock.mockResolvedValueOnce({
      id: 7,
      queues: []
    });

    await ShowDashboardService({
      userId: 7,
      profile: "user",
      period: "today"
    });

    const firstCallArgs = ticketFindAllMock.mock.calls[0][0];
    expect(hasQueueNullScope(firstCallArgs.where)).toBe(false);
  });

  it("builds the today timeline from hourly grouped rows", async () => {
    const result = await ShowDashboardService({
      userId: 7,
      profile: "admin",
      period: "today"
    });

    expect(result.charts.ticketsTimeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "10:00",
          count: 1
        })
      ])
    );

    expect(ticketFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.arrayContaining([
          expect.arrayContaining([expect.anything(), "bucketHour"]),
          expect.arrayContaining([expect.anything(), "count"])
        ])
      })
    );
  });
});