import AppError from "../../errors/AppError";
import Flow from "../../models/Flow";
import FlowNode from "../../models/FlowNode";
import FlowEdge from "../../models/FlowEdge";
import FlowTrigger from "../../models/FlowTrigger";

interface FlowNodeData {
  id?: number;
  type: string;
  name?: string;
  data?: any;
  positionX?: number;
  positionY?: number;
}

interface FlowEdgeData {
  id?: number;
  sourceNodeId: number;
  targetNodeId: number;
  conditionType?: string;
  conditionValue?: any;
  priority?: number;
}

interface FlowTriggerData {
  id?: number;
  type: string;
  value?: any;
  isActive?: boolean;
}

interface Request {
  flowId: string | number;
  nodes?: FlowNodeData[];
  edges?: FlowEdgeData[];
  triggers?: FlowTriggerData[];
}

const normalizeJson = (value?: any): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
};

const SaveFlowGraphService = async ({
  flowId,
  nodes = [],
  edges = [],
  triggers = []
}: Request): Promise<void> => {
  const flow = await Flow.findByPk(flowId);

  if (!flow) {
    throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  }

  const existingNodes = await FlowNode.findAll({ where: { flowId } });
  const existingEdges = await FlowEdge.findAll({ where: { flowId } });
  const existingTriggers = await FlowTrigger.findAll({ where: { flowId } });

  const nodeMap = new Map<number, FlowNode>();
  existingNodes.forEach(node => nodeMap.set(node.id, node));

  const createdNodeMap = new Map<number, number>();

  const edgeMap = new Map<number, FlowEdge>();
  existingEdges.forEach(edge => edgeMap.set(edge.id, edge));

  const triggerMap = new Map<number, FlowTrigger>();
  existingTriggers.forEach(trigger => triggerMap.set(trigger.id, trigger));

  const incomingNodeIds = new Set<number>();
  const incomingEdgeIds = new Set<number>();
  const incomingTriggerIds = new Set<number>();

  for (const node of nodes) {
    const payload = {
      flowId: flow.id,
      type: node.type,
      name: node.name || null,
      data: normalizeJson(node.data),
      positionX: Number(node.positionX || 0),
      positionY: Number(node.positionY || 0)
    };

    if (node.id && node.id > 0 && nodeMap.has(node.id)) {
      const existing = nodeMap.get(node.id);
      if (existing) {
        await existing.update(payload);
        incomingNodeIds.add(existing.id);
      }
    } else {
      const created = await FlowNode.create(payload);
      incomingNodeIds.add(created.id);
      if (node.id && node.id < 0) {
        createdNodeMap.set(node.id, created.id);
      }
    }
  }

  for (const node of existingNodes) {
    if (!incomingNodeIds.has(node.id)) {
      await node.destroy();
    }
  }

  for (const edge of edges) {
    const mappedSourceId =
      edge.sourceNodeId && createdNodeMap.has(edge.sourceNodeId)
        ? createdNodeMap.get(edge.sourceNodeId)
        : edge.sourceNodeId;
    const mappedTargetId =
      edge.targetNodeId && createdNodeMap.has(edge.targetNodeId)
        ? createdNodeMap.get(edge.targetNodeId)
        : edge.targetNodeId;

    const payload = {
      flowId: flow.id,
      sourceNodeId: mappedSourceId,
      targetNodeId: mappedTargetId,
      conditionType: edge.conditionType || null,
      conditionValue: normalizeJson(edge.conditionValue),
      priority: Number(edge.priority || 0)
    };

    if (edge.id && edge.id > 0 && edgeMap.has(edge.id)) {
      const existing = edgeMap.get(edge.id);
      if (existing) {
        await existing.update(payload);
        incomingEdgeIds.add(existing.id);
      }
    } else {
      const created = await FlowEdge.create(payload);
      incomingEdgeIds.add(created.id);
    }
  }

  for (const edge of existingEdges) {
    if (!incomingEdgeIds.has(edge.id)) {
      await edge.destroy();
    }
  }

  for (const trigger of triggers) {
    const payload = {
      flowId: flow.id,
      type: trigger.type,
      value: normalizeJson(trigger.value),
      isActive: trigger.isActive !== undefined ? trigger.isActive : true
    };

    if (trigger.id && triggerMap.has(trigger.id)) {
      const existing = triggerMap.get(trigger.id);
      if (existing) {
        await existing.update(payload);
        incomingTriggerIds.add(existing.id);
      }
    } else {
      const created = await FlowTrigger.create(payload);
      incomingTriggerIds.add(created.id);
    }
  }

  for (const trigger of existingTriggers) {
    if (!incomingTriggerIds.has(trigger.id)) {
      await trigger.destroy();
    }
  }
};

export default SaveFlowGraphService;
