import { Op } from "sequelize";

import Ticket from "../../../models/Ticket";
import ListTicketsService from "../ListTicketsService";
import ShowUserService from "../../UserServices/ShowUserService";

jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: {
    findAndCountAll: jest.fn()
  }
}));

jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: "Contact"
}));

jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: "Message"
}));

jest.mock("../../../models/Queue", () => ({
  __esModule: true,
  default: "Queue"
}));

jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: "Whatsapp"
}));

jest.mock("../../../models/Tag", () => ({
  __esModule: true,
  default: "Tag"
}));

jest.mock("../../../models/User", () => ({
  __esModule: true,
  default: "User"
}));

jest.mock("../../UserServices/ShowUserService", () => ({
  __esModule: true,
  default: jest.fn()
}));

const ticketFindAndCountAllMock = (Ticket as unknown as {
  findAndCountAll: jest.Mock;
}).findAndCountAll;

const showUserServiceMock = ShowUserService as jest.Mock;

const getOperatorConditions = (
  whereCondition: Record<PropertyKey, unknown>,
  operator: symbol
): unknown[] => {
  const operatorConditions = whereCondition?.[
    operator as unknown as keyof typeof whereCondition
  ];

  return Array.isArray(operatorConditions) ? operatorConditions : [];
};

const extractConditions = (whereCondition: Record<PropertyKey, unknown>): unknown[] => {
  const andConditions = getOperatorConditions(whereCondition, Op.and);

  if (!andConditions.length) {
    return [whereCondition];
  }

  return andConditions.reduce<unknown[]>((accumulator, condition: unknown) => {
    if (condition && typeof condition === "object") {
      return accumulator.concat(
        extractConditions(condition as Record<PropertyKey, unknown>)
      );
    }

    return accumulator.concat(condition);
  }, []);
};

const extractVisibilityBranches = (
  whereCondition: Record<PropertyKey, unknown>
): unknown[][] => {
  const visibilityCondition = extractConditions(whereCondition).find(condition => {
    if (!condition || typeof condition !== "object") {
      return false;
    }

    return getOperatorConditions(
      condition as Record<PropertyKey, unknown>,
      Op.or
    ).length > 0;
  });

  if (!visibilityCondition || typeof visibilityCondition !== "object") {
    return [];
  }

  return getOperatorConditions(
    visibilityCondition as Record<PropertyKey, unknown>,
    Op.or
  ).map(condition => {
    if (condition && typeof condition === "object") {
      return extractConditions(condition as Record<PropertyKey, unknown>);
    }

    return [condition];
  });
};

const adminQueueVisibilityMatcher = (queueIds: number[]) =>
  expect.objectContaining({
    queueId: {
      [Op.or]: [queueIds, null]
    }
  });

const authorizedQueueVisibilityMatcher = (queueIds: number[]) =>
  expect.objectContaining({
    queueId: {
      [Op.in]: queueIds
    }
  });

const expectNoUserIdNullBranch = (branches: unknown[][]) => {
  expect(branches.some(branch =>
    branch.some(condition =>
      condition &&
      typeof condition === "object" &&
      "userId" in (condition as Record<PropertyKey, unknown>) &&
      (condition as Record<PropertyKey, unknown>).userId === null
    ) &&
    !branch.some(condition =>
      condition &&
      typeof condition === "object" &&
      "queueId" in (condition as Record<PropertyKey, unknown>)
    )
  )).toBe(false);
};

describe("ListTicketsService visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ticketFindAndCountAllMock.mockResolvedValue({ count: 0, rows: [] });
    showUserServiceMock.mockResolvedValue({
      id: 21,
      whatsappId: null,
      whatsapp: null,
      queues: [{ id: 6 }]
    });
  });

  it("shows only own and unassigned pending tickets in authorized queues for non-admin users", async () => {
    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "pending",
      queueIds: [6]
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const conditions = extractConditions(whereCondition);
    const visibilityBranches = extractVisibilityBranches(whereCondition);

    expect(conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "pending" })
      ])
    );
    expect(visibilityBranches).toHaveLength(2);
    expect(visibilityBranches[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "21" })
      ])
    );
    expect(visibilityBranches[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: null }),
        authorizedQueueVisibilityMatcher([6])
      ])
    );
    expectNoUserIdNullBranch(visibilityBranches);
  });

  it("defaults pending shared scope to the user's real queues when the request omits queueIds", async () => {
    showUserServiceMock.mockResolvedValue({
      id: 21,
      whatsappId: null,
      whatsapp: null,
      queues: [{ id: 6 }, { id: 8 }]
    });

    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "pending",
      queueIds: []
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const visibilityBranches = extractVisibilityBranches(whereCondition);

    expect(visibilityBranches).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          expect.objectContaining({ userId: "21" })
        ]),
        expect.arrayContaining([
          expect.objectContaining({ userId: null }),
          authorizedQueueVisibilityMatcher([6, 8])
        ])
      ])
    );
  });

  it("ignores requested queues that are not authorized for the user", async () => {
    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "pending",
      queueIds: [4, 6, 99]
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const visibilityBranches = extractVisibilityBranches(whereCondition);

    expect(visibilityBranches[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: null }),
        authorizedQueueVisibilityMatcher([6])
      ])
    );
  });

  it("keeps pending tickets owner-only when the non-admin user has no shared queue or whatsapp scope", async () => {
    showUserServiceMock.mockResolvedValue({
      id: 21,
      whatsappId: null,
      whatsapp: null,
      queues: []
    });

    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "pending",
      queueIds: [6]
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const conditions = extractConditions(whereCondition);

    expect(conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "21" }),
        expect.objectContaining({ status: "pending" })
      ])
    );
    expect(extractVisibilityBranches(whereCondition)).toHaveLength(0);
  });

  it("does not share pending tickets assigned to another user", async () => {
    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "pending",
      queueIds: [6]
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const visibilityBranches = extractVisibilityBranches(whereCondition);

    expect(visibilityBranches[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: null })
      ])
    );
    expect(visibilityBranches[1]).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: "77" })])
    );
  });

  it("keeps open tickets owner-only for non-admin users", async () => {
    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "open",
      queueIds: [6]
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const conditions = extractConditions(whereCondition);

    expect(conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "21" }),
        expect.objectContaining({ status: "open" }),
        authorizedQueueVisibilityMatcher([6])
      ])
    );
    expect(conditions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: null })])
    );
  });

  it("keeps closed tickets owner-only for non-admin users", async () => {
    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "closed",
      queueIds: [6]
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const conditions = extractConditions(whereCondition);

    expect(conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "21" }),
        expect.objectContaining({ status: "closed" }),
        authorizedQueueVisibilityMatcher([6])
      ])
    );
    expect(conditions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: null })])
    );
  });

  it("shares only explicitly scoped queue-null pending tickets by whatsapp for non-admin users", async () => {
    showUserServiceMock.mockResolvedValue({
      id: 21,
      whatsappId: 38,
      whatsapp: { id: 38, name: "Inbox 38" },
      queues: []
    });

    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "pending",
      queueIds: []
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const conditions = extractConditions(whereCondition);
    const visibilityBranches = extractVisibilityBranches(whereCondition);

    expect(conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "pending" })
      ])
    );
    expect(visibilityBranches).toHaveLength(2);
    expect(visibilityBranches[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "21" }),
        expect.objectContaining({ whatsappId: 38 })
      ])
    );
    expect(visibilityBranches[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: null }),
        expect.objectContaining({ queueId: null }),
        expect.objectContaining({ whatsappId: 38 })
      ])
    );
  });

  it("keeps admin pending visibility broader than owner-only", async () => {
    await ListTicketsService({
      userId: "1",
      profile: "admin",
      status: "pending",
      queueIds: [6]
    });

    const whereCondition = ticketFindAndCountAllMock.mock.calls[0][0].where;
    const conditions = extractConditions(whereCondition);

    expect(conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "pending" }),
        adminQueueVisibilityMatcher([6])
      ])
    );
    expect(conditions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: "1" })])
    );
    expect(showUserServiceMock).not.toHaveBeenCalled();
  });
});