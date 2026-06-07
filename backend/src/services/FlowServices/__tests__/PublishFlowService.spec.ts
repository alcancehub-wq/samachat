jest.mock("../../../models/Flow", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

jest.mock("../../../models/FlowNode", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../../models/FlowEdge", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

import Flow from "../../../models/Flow";
import FlowNode from "../../../models/FlowNode";
import FlowEdge from "../../../models/FlowEdge";
import PublishFlowService from "../PublishFlowService";

const flowFindByPkMock = Flow.findByPk as jest.Mock;
const flowNodeFindAllMock = FlowNode.findAll as jest.Mock;
const flowEdgeFindAllMock = FlowEdge.findAll as jest.Mock;

describe("PublishFlowService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks publish when the flow has no whatsappId", async () => {
    flowFindByPkMock.mockResolvedValue({
      id: 88,
      whatsappId: null,
      update: jest.fn(),
      reload: jest.fn()
    });

    await expect(
      PublishFlowService({ flowId: "88", status: "published" })
    ).rejects.toMatchObject({
      message: "ERR_FLOW_WHATSAPP_REQUIRED"
    });

    expect(flowNodeFindAllMock).not.toHaveBeenCalled();
    expect(flowEdgeFindAllMock).not.toHaveBeenCalled();
  });
});