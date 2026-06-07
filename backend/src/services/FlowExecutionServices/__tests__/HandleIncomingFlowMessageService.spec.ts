jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

jest.mock("../../../models/Flow", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../../models/FlowExecution", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../../TicketServices/ShowTicketService", () => jest.fn());
jest.mock("../ExecuteFlowService", () => jest.fn());

import Contact from "../../../models/Contact";
import Flow from "../../../models/Flow";
import FlowExecution from "../../../models/FlowExecution";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import ExecuteFlowService from "../ExecuteFlowService";
import HandleIncomingFlowMessageService from "../HandleIncomingFlowMessageService";

const contactFindByPkMock = Contact.findByPk as jest.Mock;
const flowFindAllMock = Flow.findAll as jest.Mock;
const flowExecutionFindOneMock = FlowExecution.findOne as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const executeFlowServiceMock = ExecuteFlowService as jest.Mock;

describe("HandleIncomingFlowMessageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    flowExecutionFindOneMock.mockResolvedValue(null);
    contactFindByPkMock.mockResolvedValue({
      id: 12,
      tags: []
    });
    executeFlowServiceMock.mockResolvedValue({ id: 1 });
  });

  it("starts a matching flow only when the ticket whatsappId matches", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 100,
      queueId: 9,
      whatsappId: 35,
      tags: []
    });
    flowFindAllMock.mockResolvedValue([
      {
        id: 1,
        whatsappId: 99,
        triggers: [{ id: 11, type: "always", value: null }]
      },
      {
        id: 2,
        whatsappId: 35,
        triggers: [{ id: 12, type: "always", value: null }]
      }
    ]);

    const result = await HandleIncomingFlowMessageService({
      ticketId: 100,
      contactId: 12,
      messageBody: "hello"
    });

    expect(flowFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "published",
          isActive: true,
          whatsappId: 35
        })
      })
    );
    expect(executeFlowServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 2,
        queueId: 9,
        ticketId: 100,
        contactId: 12
      })
    );
    expect(result).toEqual({ handled: true, flowId: 2, action: "started" });
  });

  it("does not auto-start flows without whatsappId", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 100,
      queueId: 9,
      whatsappId: 35,
      tags: []
    });
    flowFindAllMock.mockResolvedValue([
      {
        id: 3,
        whatsappId: null,
        triggers: [{ id: 13, type: "keyword", value: "hello" }]
      }
    ]);

    const result = await HandleIncomingFlowMessageService({
      ticketId: 100,
      contactId: 12,
      messageBody: "hello world"
    });

    expect(executeFlowServiceMock).not.toHaveBeenCalled();
    expect(result).toEqual({ handled: false });
  });

  it("keeps queue trigger behavior after whatsapp filtering", async () => {
    showTicketServiceMock.mockResolvedValue({
      id: 100,
      queueId: 9,
      whatsappId: 35,
      tags: []
    });
    flowFindAllMock.mockResolvedValue([
      {
        id: 4,
        whatsappId: 35,
        triggers: [{ id: 14, type: "queue", value: "9" }]
      }
    ]);

    const result = await HandleIncomingFlowMessageService({
      ticketId: 100,
      contactId: 12,
      messageBody: "irrelevant"
    });

    expect(executeFlowServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 4,
        queueId: 9
      })
    );
    expect(result).toEqual({ handled: true, flowId: 4, action: "started" });
  });
});