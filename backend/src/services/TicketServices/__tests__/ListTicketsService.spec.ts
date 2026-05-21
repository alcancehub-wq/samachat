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

const extractConditions = (whereCondition: Record<PropertyKey, unknown>): unknown[] => {
  const andConditions = whereCondition?.[Op.and as unknown as keyof typeof whereCondition];

  if (!Array.isArray(andConditions)) {
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

describe("ListTicketsService visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ticketFindAndCountAllMock.mockResolvedValue({ count: 0, rows: [] });
    getUserScopedWhatsappIdMock.mockResolvedValue(null);
  });

  it("shares pending tickets by selected queue for non-admin users", async () => {
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
        expect.objectContaining({ status: "pending" }),
        expect.objectContaining({
          queueId: {
            [Op.or]: [[6], null]
          }
        })
      ])
    );
    expect(conditions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: "21" })])
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
        expect.objectContaining({
          queueId: {
            [Op.or]: [[6], null]
          }
        })
      ])
    );
  });

  it("blocks pending sharing when the non-admin user has no queue or whatsapp scope", async () => {
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
        expect.objectContaining({ id: -1 }),
        expect.objectContaining({ status: "pending" })
      ])
    );
    expect(conditions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: "21" })])
    );
  });

  it("allows pending sharing by scoped whatsapp even without queue ids", async () => {
    getUserScopedWhatsappIdMock.mockResolvedValue(38);

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
        expect.objectContaining({ whatsappId: 38 }),
        expect.objectContaining({ status: "pending" })
      ])
    );
    expect(conditions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: "21" })])
    );
  });
});