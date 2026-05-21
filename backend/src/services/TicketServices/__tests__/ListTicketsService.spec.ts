import { Op } from "sequelize";

import Ticket from "../../../models/Ticket";
import GetUserScopedWhatsappId from "../../../helpers/GetUserScopedWhatsappId";
import ListTicketsService from "../ListTicketsService";

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

jest.mock("../../../helpers/GetUserScopedWhatsappId", () => ({
  __esModule: true,
  default: jest.fn()
}));

const ticketFindAndCountAllMock = (Ticket as unknown as {
  findAndCountAll: jest.Mock;
}).findAndCountAll;

const getUserScopedWhatsappIdMock = GetUserScopedWhatsappId as jest.Mock;

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

const queueVisibilityMatcher = (queueIds: number[]) =>
  expect.objectContaining({
    queueId: {
      [Op.or]: [queueIds, null]
    }
  });

describe("ListTicketsService visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ticketFindAndCountAllMock.mockResolvedValue({ count: 0, rows: [] });
    getUserScopedWhatsappIdMock.mockResolvedValue(null);
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
        expect.objectContaining({ userId: "21" }),
        queueVisibilityMatcher([6])
      ])
    );
    expect(visibilityBranches[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: null }),
        queueVisibilityMatcher([6])
      ])
    );
  });

  it("keeps pending tickets owner-only when the non-admin user has no shared scope", async () => {
    await ListTicketsService({
      userId: "21",
      profile: "user",
      status: "pending",
      queueIds: []
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
    expect(conditions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: null })
      ])
    );
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

    expect(visibilityBranches[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "21" })
      ])
    );
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
        queueVisibilityMatcher([6])
      ])
    );
  });

  it("shares only unassigned pending tickets by scoped whatsapp for non-admin users", async () => {
    getUserScopedWhatsappIdMock.mockResolvedValue(38);

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
    expect(visibilityBranches[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "21" }),
        expect.objectContaining({ whatsappId: 38 })
      ])
    );
    expect(visibilityBranches[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: null }),
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
        queueVisibilityMatcher([6])
      ])
    );
    expect(conditions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: "1" })])
    );
  });
});