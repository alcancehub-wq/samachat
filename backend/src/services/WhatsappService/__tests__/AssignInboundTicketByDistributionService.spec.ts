import sequelize from "../../../database";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import Whatsapp from "../../../models/Whatsapp";
import WhatsappDistributionUser from "../../../models/WhatsappDistributionUser";
import WhatsappSharingSetting from "../../../models/WhatsappSharingSetting";

import AssignInboundTicketByDistributionService from "../AssignInboundTicketByDistributionService";

jest.mock("../../../database", () => ({
  __esModule: true,
  default: {
    transaction: jest.fn()
  }
}));

jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock("../../../models/User", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

jest.mock("../../../models/WhatsappDistributionUser", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../../models/WhatsappSharingSetting", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

const transactionMock = {
  LOCK: {
    UPDATE: "UPDATE"
  }
};

const sequelizeTransactionMock = sequelize.transaction as jest.Mock;
const ticketFindByPkMock = Ticket.findByPk as jest.Mock;
const ticketUpdateMock = Ticket.update as jest.Mock;
const userFindAllMock = User.findAll as jest.Mock;
const whatsappFindByPkMock = Whatsapp.findByPk as jest.Mock;
const distributionFindAllMock = WhatsappDistributionUser.findAll as jest.Mock;
const sharingFindOneMock = WhatsappSharingSetting.findOne as jest.Mock;

const whatsappId = 501;
const ticketId = 801;
const queueId = 701;

const sharingUpdateMock = jest.fn();

const configureBase = ({
  mode = "round_robin",
  lastAssignedUserId = null,
  ticketUserId = null
}: {
  mode?: "random" | "round_robin";
  lastAssignedUserId?: number | null;
  ticketUserId?: number | null;
} = {}) => {
  sequelizeTransactionMock.mockImplementation(async callback =>
    callback(transactionMock)
  );

  whatsappFindByPkMock.mockResolvedValue({
    id: whatsappId,
    providerType: "web"
  });

  sharingFindOneMock.mockResolvedValue({
    distributionMode: mode,
    lastAssignedUserId,
    update: sharingUpdateMock
  });

  ticketFindByPkMock.mockResolvedValue({
    id: ticketId,
    userId: ticketUserId,
    queueId,
    whatsappId
  });

  distributionFindAllMock.mockResolvedValue([
    { userId: 101 },
    { userId: 102 },
    { userId: 103 }
  ]);

  userFindAllMock.mockResolvedValue([
    { id: 101 },
    { id: 102 },
    { id: 103 }
  ]);

  ticketUpdateMock.mockResolvedValue([1]);
  sharingUpdateMock.mockResolvedValue(undefined);
};

describe("AssignInboundTicketByDistributionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("assigns the first eligible user when round robin has no pointer", async () => {
    configureBase({
      mode: "round_robin"
    });

    const result = await AssignInboundTicketByDistributionService({
      ticketId,
      whatsappId
    });

    expect(result).toEqual({
      userId: 101,
      mode: "round_robin"
    });

    expect(ticketUpdateMock).toHaveBeenCalledWith(
      {
        userId: 101
      },
      expect.objectContaining({
        where: {
          id: ticketId,
          userId: null
        }
      })
    );

    expect(sharingUpdateMock).toHaveBeenCalledWith(
      {
        lastAssignedUserId: 101
      },
      expect.any(Object)
    );
  });

  it("advances round robin after the last assigned eligible user", async () => {
    configureBase({
      mode: "round_robin",
      lastAssignedUserId: 101
    });

    const result = await AssignInboundTicketByDistributionService({
      ticketId,
      whatsappId
    });

    expect(result?.userId).toBe(102);
  });

  it("wraps round robin back to the first eligible user", async () => {
    configureBase({
      mode: "round_robin",
      lastAssignedUserId: 103
    });

    const result = await AssignInboundTicketByDistributionService({
      ticketId,
      whatsappId
    });

    expect(result?.userId).toBe(101);
  });

  it("uses Math.random for random distribution", async () => {
    configureBase({
      mode: "random"
    });

    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

    const result = await AssignInboundTicketByDistributionService({
      ticketId,
      whatsappId
    });

    expect(result).toEqual({
      userId: 102,
      mode: "random"
    });

    expect(sharingUpdateMock).not.toHaveBeenCalled();

    randomSpy.mockRestore();
  });

  it("does not redistribute a ticket that already has an owner", async () => {
    configureBase({
      ticketUserId: 999
    });

    const result = await AssignInboundTicketByDistributionService({
      ticketId,
      whatsappId
    });

    expect(result).toBeNull();
    expect(ticketUpdateMock).not.toHaveBeenCalled();
  });

  it("does nothing when no eligible distribution user exists", async () => {
    configureBase();

    userFindAllMock.mockResolvedValue([]);

    const result = await AssignInboundTicketByDistributionService({
      ticketId,
      whatsappId
    });

    expect(result).toBeNull();
    expect(ticketUpdateMock).not.toHaveBeenCalled();
  });

  it("does nothing for an official connection", async () => {
    configureBase();

    whatsappFindByPkMock.mockResolvedValue({
      id: whatsappId,
      providerType: "official"
    });

    const result = await AssignInboundTicketByDistributionService({
      ticketId,
      whatsappId
    });

    expect(result).toBeNull();
    expect(sharingFindOneMock).not.toHaveBeenCalled();
    expect(ticketUpdateMock).not.toHaveBeenCalled();
  });

  it("does not advance round robin if concurrent assignment already won", async () => {
    configureBase({
      mode: "round_robin"
    });

    ticketUpdateMock.mockResolvedValue([0]);

    const result = await AssignInboundTicketByDistributionService({
      ticketId,
      whatsappId
    });

    expect(result).toBeNull();
    expect(sharingUpdateMock).not.toHaveBeenCalled();
  });
});
