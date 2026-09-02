import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position
} from "react-flow-renderer";
import "react-flow-renderer/dist/style.css";

import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import PageBackButton from "../../components/PageBackButton";
import Title from "../../components/Title";
import buildMenuListPageStyles from "../../styles/menuListPageStyles";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { getBackendUrl } from "../../config";
import OfficialOutboundConfig from "../../components/OfficialOutboundConfig";

const nodeTypes = [
  { value: "start", label: "flowBuilder.nodeTypes.start" },
  { value: "message", label: "flowBuilder.nodeTypes.message" },
  { value: "media", label: "flowBuilder.nodeTypes.media" },
  { value: "decision", label: "flowBuilder.nodeTypes.decision" },
  { value: "queue", label: "flowBuilder.nodeTypes.queue" },
  { value: "handoff", label: "flowBuilder.nodeTypes.handoff" },
  { value: "end", label: "flowBuilder.nodeTypes.end" }
];

const edgeConditions = [
  { value: "always", label: "flowBuilder.edgeConditions.always" },
  { value: "keyword", label: "flowBuilder.edgeConditions.keyword" },
  { value: "tag", label: "flowBuilder.edgeConditions.tag" },
  { value: "queue", label: "flowBuilder.edgeConditions.queue" }
];

const triggerTypes = [
  { value: "always", label: "flowBuilder.triggerTypes.always" },
  { value: "keyword", label: "flowBuilder.triggerTypes.keyword" },
  { value: "tag", label: "flowBuilder.triggerTypes.tag" },
  { value: "queue", label: "flowBuilder.triggerTypes.queue" }
];

const nodeAccentMap = {
  start: { color: "#0EA5E9", tint: "rgba(14, 165, 233, 0.14)" },
  message: { color: "#06B6D4", tint: "rgba(6, 182, 212, 0.14)" },
  media: { color: "#F97316", tint: "rgba(249, 115, 22, 0.14)" },
  decision: { color: "#A855F7", tint: "rgba(168, 85, 247, 0.14)" },
  queue: { color: "#84CC16", tint: "rgba(132, 204, 22, 0.16)" },
  handoff: { color: "#7C3AED", tint: "rgba(124, 58, 237, 0.16)" },
  end: { color: "#EC4899", tint: "rgba(236, 72, 153, 0.16)" }
};

const buildNodeData = (type, currentData = {}) => {
  switch (type) {
    case "message":
      return {
        text: currentData.text || "",
        outboundMode: currentData.outboundMode || "STANDARD",
        ownerQueueId: currentData.ownerQueueId || "",
        deliveryWhatsappId: currentData.deliveryWhatsappId || "",
        templateName: currentData.templateName || "",
        templateLanguage: currentData.templateLanguage || "",
        templateComponents: currentData.templateComponents || []
      };
    case "media":
      return {
        caption: currentData.caption || "",
        fileName: currentData.fileName || "",
        originalName: currentData.originalName || "",
        mimetype: currentData.mimetype || "",
        publicUrl: currentData.publicUrl || ""
      };
    case "decision":
      return { hint: currentData.hint || "" };
    case "queue":
    case "handoff":
      return { queueId: currentData.queueId || "" };
    default:
      return {};
  }
};

const buildNodeDraft = (type, position = { x: 120, y: 120 }) => ({
  type,
  name: "",
  data: buildNodeData(type),
  positionX: position.x,
  positionY: position.y
});

const buildNextNodePosition = existingNodes => {
  if (existingNodes.length === 0) {
    return { x: 120, y: 120 };
  }

  const index = existingNodes.length;
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 120 + column * 280,
    y: 120 + row * 180
  };
};

const FlowCanvasNode = ({ data, selected }) => {
  const [isFocused, setIsFocused] = useState(false);
  const palette = nodeAccentMap[data.type] || nodeAccentMap.message;
  const canReceive = data.type !== "start";
  const canSend = data.type !== "end";

  const handleKeyDown = event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      data.onSelect?.();
      return;
    }

    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      data.onEdit?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={data.ariaLabel}
      onFocus={() => {
        setIsFocused(true);
        data.onSelect?.();
      }}
      onBlur={() => setIsFocused(false)}
      onDoubleClick={() => data.onEdit?.()}
      onKeyDown={handleKeyDown}
      style={{
        width: 240,
        borderRadius: 18,
        border: `1px solid ${(selected || isFocused) ? palette.color : "rgba(15, 23, 42, 0.12)"}`,
        boxShadow: (selected || isFocused)
          ? `0 18px 34px ${palette.tint}`
          : "0 16px 32px rgba(15, 23, 42, 0.10)",
        background: "#FFFFFF",
        overflow: "hidden",
        cursor: "pointer",
        outline: "none"
      }}
    >
      {canReceive && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: 14,
            height: 14,
            border: 0,
            background: palette.color,
            left: -7
          }}
        />
      )}
      <div
        style={{
          padding: "12px 14px 13px",
          borderBottom: `1px solid ${palette.tint}`,
          background: `linear-gradient(135deg, ${palette.tint} 0%, rgba(255,255,255,0.96) 82%)`
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 24,
              padding: "0 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.82)",
              color: palette.color,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.4
            }}
          >
            {data.title}
          </span>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: palette.color,
              flex: "0 0 auto"
            }}
          />
        </div>
        <div
          style={{
            marginTop: 10,
            color: "#0F172A",
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.3,
            wordBreak: "break-word"
          }}
        >
          {data.name || data.title}
        </div>
      </div>
      <div
        style={{
          padding: "12px 14px 14px",
          color: "#475569",
          fontSize: 12,
          lineHeight: 1.55,
          minHeight: 76,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        }}
      >
        {data.summary}
      </div>
      {canSend && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: 14,
            height: 14,
            border: 0,
            background: palette.color,
            right: -7
          }}
        />
      )}
    </div>
  );
};

const useStyles = makeStyles(theme => ({
  ...buildMenuListPageStyles(theme),
  pageBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: theme.spacing(1.25, 1, 0),
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1, 0.75, 0)
    }
  },
  actionRow: {
    gap: theme.spacing(1)
  },
  headerActionButton: {
    minHeight: 40,
    borderRadius: 4,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none !important"
  },
  neutralButton: {
    minHeight: 40,
    borderRadius: 4,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none !important",
    backgroundColor: "#FFFFFF !important",
    border: "1px solid rgba(15, 23, 42, 0.12) !important",
    color: "#111111 !important",
    "&:hover": {
      backgroundColor: "#F9FAFB !important",
      borderColor: "rgba(15, 23, 42, 0.18) !important",
      boxShadow: "none !important"
    }
  },
  surface: {
    padding: theme.spacing(2.5),
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 18,
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)",
    backgroundColor: "#FFFFFF"
  },
  sectionSpacing: {
    marginTop: theme.spacing(2)
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "stretch"
    }
  },
  sectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#111111",
    textTransform: "none"
  },
  sectionHint: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6
  },
  builderGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: theme.spacing(2),
    alignItems: "start"
  },
  canvasShell: {
    display: "grid",
    gap: theme.spacing(2)
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: theme.spacing(1.25),
    marginTop: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr"
    }
  },
  statCard: {
    borderRadius: 16,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, #FFFFFF 100%)",
    padding: theme.spacing(1.5, 1.75),
    boxShadow: "none"
  },
  statValue: {
    color: "#111111",
    fontSize: "1.65rem",
    fontWeight: 700,
    lineHeight: 1.1
  },
  statLabel: {
    marginTop: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    fontSize: "0.8125rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.35
  },
  quickActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2)
  },
  quickActionButton: {
    minHeight: 38,
    borderRadius: 999,
    textTransform: "none",
    fontWeight: 700,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5)
  },
  canvasSurface: {
    padding: 0,
    overflow: "hidden"
  },
  canvasHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    padding: theme.spacing(2, 2.25),
    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
    background: "linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, rgba(255,255,255,0.96) 100%)",
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column"
    }
  },
  canvasWrapper: {
    position: "relative",
    height: "calc(100vh - 290px)",
    minHeight: 620,
    background: "radial-gradient(circle at top left, rgba(14, 165, 233, 0.08), transparent 30%), linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
    outline: "none",
    "&:focus-visible": {
      boxShadow: "inset 0 0 0 2px rgba(14, 165, 233, 0.45)"
    },
    "& .react-flow__attribution": {
      display: "none"
    },
    "& .react-flow__controls": {
      boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)",
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid rgba(15, 23, 42, 0.08)"
    },
    "& .react-flow__controls-button": {
      borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
      backgroundColor: "#FFFFFF"
    },
    "& .react-flow__edge-path": {
      strokeWidth: 2.25
    },
    "& .react-flow__edge-textbg": {
      fill: "rgba(255,255,255,0.92)"
    }
  },
  flowCanvas: {
    width: "100%",
    height: "100%"
  },
  canvasDock: {
    position: "absolute",
    left: "50%",
    bottom: theme.spacing(2),
    transform: "translateX(-50%)",
    zIndex: 8,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.25),
    borderRadius: 999,
    border: "1px solid rgba(15, 23, 42, 0.10)",
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
    [theme.breakpoints.down("sm")]: {
      width: "calc(100% - 24px)",
      justifyContent: "space-between",
      borderRadius: 18,
      padding: theme.spacing(1, 1)
    }
  },
  canvasDockButton: {
    minHeight: 38,
    borderRadius: 999,
    textTransform: "none",
    fontWeight: 700,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5)
  },
  canvasDockHint: {
    color: theme.palette.text.secondary,
    fontSize: "0.75rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
  },
  canvasFloatingInspector: {
    position: "absolute",
    top: theme.spacing(2),
    right: theme.spacing(2),
    zIndex: 8,
    width: 340,
    maxWidth: "calc(100% - 32px)",
    padding: theme.spacing(1.75, 2),
    borderRadius: 18,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 22px 50px rgba(15, 23, 42, 0.18)",
    [theme.breakpoints.down("sm")]: {
      width: "calc(100% - 24px)",
      top: theme.spacing(1.5),
      right: theme.spacing(1.5)
    }
  },
  canvasFloatingHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1.25)
  },
  canvasFloatingTitle: {
    color: "#0F172A",
    fontSize: "0.95rem",
    fontWeight: 700,
    lineHeight: 1.3
  },
  canvasFloatingSubtitle: {
    marginTop: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    fontSize: "0.8125rem",
    lineHeight: 1.55
  },
  canvasFloatingDivider: {
    margin: theme.spacing(1.5, 0),
    border: 0,
    borderTop: "1px solid rgba(15, 23, 42, 0.08)"
  },
  canvasContextMenu: {
    position: "absolute",
    zIndex: 10,
    width: 260,
    padding: theme.spacing(1),
    borderRadius: 18,
    border: "1px solid rgba(15, 23, 42, 0.10)",
    background: "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)"
  },
  canvasContextTitle: {
    padding: theme.spacing(0.5, 1, 0.75),
    color: "#0F172A",
    fontSize: "0.78rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.45
  },
  canvasContextButton: {
    width: "100%",
    justifyContent: "flex-start",
    borderRadius: 12,
    padding: theme.spacing(1, 1.25),
    color: "#0F172A",
    textTransform: "none",
    fontWeight: 600,
    "&:hover": {
      backgroundColor: "rgba(14, 165, 233, 0.08)"
    }
  },
  canvasContextDanger: {
    color: "#E11414",
    "&:hover": {
      backgroundColor: "rgba(225, 20, 20, 0.08)"
    }
  },
  canvasContextMeta: {
    display: "block",
    marginTop: theme.spacing(0.35),
    color: theme.palette.text.secondary,
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: 1.4,
    textAlign: "left"
  },
  sidebarColumn: {
    display: "grid",
    gap: theme.spacing(2)
  },
  helperCallout: {
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
    lineHeight: 1.5
  },
  inspectorEmpty: {
    minHeight: 140,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: theme.spacing(2),
    borderRadius: 16,
    border: "1px dashed rgba(15, 23, 42, 0.16)",
    background: "rgba(248, 250, 252, 0.72)"
  },
  formRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.5),
    alignItems: "center",
    "& > *": {
      minWidth: 140,
      flex: "1 1 140px"
    }
  },
  compactAction: {
    minWidth: "auto",
    flex: "0 0 auto",
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1)
  },
  rowActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  rowActionButton: {
    minWidth: "auto",
    padding: 0,
    fontWeight: 700,
    color: "#111111",
    "&:hover": {
      backgroundColor: "transparent",
      color: "#111111"
    }
  },
  rowDangerButton: {
    minWidth: "auto",
    padding: 0,
    fontWeight: 700,
    color: "#FF1919",
    "&:hover": {
      backgroundColor: "transparent",
      color: "#E11414"
    }
  },
  nodeName: {
    color: "#111111",
    fontSize: "1rem",
    fontWeight: 700,
    lineHeight: 1.45
  },
  nodeSummary: {
    marginTop: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  },
  detailChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5)
  },
  sideList: {
    display: "grid",
    gap: theme.spacing(1.25)
  },
  sideListItem: {
    padding: theme.spacing(1.35, 1.5),
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    cursor: "pointer",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
    boxShadow: "none",
    "&:hover": {
      transform: "translateY(-1px)",
      borderColor: "rgba(15, 23, 42, 0.16)",
      boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)"
    }
  },
  sideListItemActive: {
    borderColor: "#0EA5E9",
    boxShadow: "0 16px 26px rgba(14, 165, 233, 0.12)"
  },
  sideListMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1)
  },
  sideListBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 22,
    padding: "0 8px",
    borderRadius: 999,
    background: "rgba(15, 23, 42, 0.06)",
    color: "#0F172A",
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.35
  },
  nodeCard: {
    padding: theme.spacing(1.75, 2),
    borderRadius: 12,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)"
  },
  executionMeta: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginBottom: theme.spacing(1.5)
  },
  chipSuccess: {
    backgroundColor: "rgba(17, 17, 17, 0.08)",
    color: "#111111",
    fontWeight: 700
  },
  chipError: {
    backgroundColor: "#FF1919",
    color: "#FFFFFF",
    fontWeight: 700
  },
  assetMeta: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1.25),
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.custom.softBackground
  },
  previewButton: {
    marginTop: theme.spacing(1),
    textTransform: "none",
    fontWeight: 600
  }
}));

const createTempId = collection => Math.min(0, ...collection.map(item => item.id || 0)) - 1;

const FlowBuilder = () => {
  const classes = useStyles();
  const { flowId } = useParams();

  const [flow, setFlow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [queues, setQueues] = useState([]);
  const [nodeDraft, setNodeDraft] = useState(null);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeEdgeId, setActiveEdgeId] = useState(null);
  const [canvasContextMenu, setCanvasContextMenu] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const canvasWrapperRef = useRef(null);

  useEffect(() => {
    const fetchFlow = async () => {
      try {
        const { data } = await api.get(`/flows/${flowId}`);
        setFlow(data);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setTriggers(data.triggers || []);
        setActiveNodeId(data.nodes?.[0]?.id || null);
        setActiveEdgeId(null);
      } catch (err) {
        toastError(err);
      }
    };

    const fetchQueues = async () => {
      try {
        const { data } = await api.get("/queue");
        setQueues(data || []);
      } catch (err) {
        toastError(err);
      }
    };

    fetchFlow();
    fetchQueues();
  }, [flowId]);

  const getNodeLabelByType = type => {
    const key = nodeTypes.find(item => item.value === type)?.label;
    return key ? i18n.t(key) : type;
  };

  const getDefaultNodeName = type => getNodeLabelByType(type);

  const queueOptions = useMemo(
    () => queues.map(queue => ({ value: queue.id, label: queue.name })),
    [queues]
  );

  const queueLabelMap = useMemo(
    () => new Map(queueOptions.map(queue => [String(queue.value), queue.label])),
    [queueOptions]
  );

  const getPublicAssetUrl = value => {
    if (!value) {
      return "";
    }

    if (String(value).startsWith("http")) {
      return value;
    }

    const backendUrl = getBackendUrl().replace(/\/+$/, "");
    const relativePath = String(value).startsWith("/public/")
      ? value
      : `/public/${value}`;
    return `${backendUrl}${relativePath}`;
  };

  const getNodeSummary = node => {
    const nodeData = node.data || {};

    if (node.type === "message") {
      return nodeData.text || i18n.t("flowBuilder.nodes.summaryEmpty");
    }

    if (node.type === "media") {
      return nodeData.originalName || i18n.t("flowBuilder.nodes.mediaNotSelected");
    }

    if (node.type === "decision") {
      return nodeData.hint || i18n.t("flowBuilder.nodes.summaryWaitInput");
    }

    if (node.type === "queue" || node.type === "handoff") {
      return nodeData.queueId
        ? queueLabelMap.get(String(nodeData.queueId)) || i18n.t("flowBuilder.nodes.queuePlaceholder")
        : i18n.t("flowBuilder.nodes.queuePlaceholder");
    }

    return i18n.t(`flowBuilder.nodes.typeHelp.${node.type}`);
  };

  const getEdgeSummary = edge => {
    const conditionLabel = i18n.t(
      edgeConditions.find(item => item.value === (edge.conditionType || "always"))?.label ||
        "flowBuilder.edgeConditions.always"
    );

    if (!edge.conditionValue) {
      return conditionLabel;
    }

    const readableValue =
      edge.conditionType === "queue"
        ? queueLabelMap.get(String(edge.conditionValue)) || edge.conditionValue
        : edge.conditionValue;

    return `${conditionLabel}: ${readableValue}`;
  };

  const openNodeModal = draft => {
    setNodeDraft(draft);
    setNodeModalOpen(true);
  };

  const closeCanvasContextMenu = () => {
    setCanvasContextMenu(null);
  };

  const getContextPosition = event => {
    const wrapperBounds = canvasWrapperRef.current?.getBoundingClientRect();

    if (!wrapperBounds || !reactFlowInstance?.project) {
      return buildNextNodePosition(nodes);
    }

    return reactFlowInstance.project({
      x: event.clientX - wrapperBounds.left,
      y: event.clientY - wrapperBounds.top
    });
  };

  const openCanvasContextMenu = (event, payload = {}) => {
    event.preventDefault();

    const wrapperBounds = canvasWrapperRef.current?.getBoundingClientRect();
    if (!wrapperBounds) {
      return;
    }

    setCanvasContextMenu({
      scope: payload.scope || "pane",
      nodeId: payload.nodeId || null,
      edgeId: payload.edgeId || null,
      position: payload.position || getContextPosition(event),
      mouseX: event.clientX - wrapperBounds.left,
      mouseY: event.clientY - wrapperBounds.top
    });
  };

  const handleAddNode = () => {
    closeCanvasContextMenu();
    openNodeModal(buildNodeDraft("message", buildNextNodePosition(nodes)));
  };

  const handleAddNodeOfType = type => {
    closeCanvasContextMenu();
    openNodeModal(buildNodeDraft(type, buildNextNodePosition(nodes)));
  };

  const handleEditNode = node => {
    closeCanvasContextMenu();
    openNodeModal({
      ...node,
      data: buildNodeData(node.type, node.data || {})
    });
  };

  const handleSaveNode = () => {
    if (!nodeDraft) {
      return;
    }

    if (nodeDraft.type === "message" && nodeDraft.data?.outboundMode === "OFFICIAL") {
      const { ownerQueueId, deliveryWhatsappId, templateName, templateLanguage } = nodeDraft.data;
      if (!ownerQueueId || !deliveryWhatsappId || !templateName || !templateLanguage) {
        toast.error("Selecione o setor, o número oficial e o modelo de mensagem.");
        return;
      }
    }

    if (
      nodeDraft.type === "start" &&
      nodes.some(node => node.type === "start" && node.id !== nodeDraft.id)
    ) {
      toast.error(i18n.t("flowBuilder.errors.singleStart"));
      return;
    }

    const nextNode = {
      ...nodeDraft,
      name: (nodeDraft.name || "").trim() || getDefaultNodeName(nodeDraft.type),
      data: buildNodeData(nodeDraft.type, nodeDraft.data || {})
    };

    if (nextNode.type === "media" && !nextNode.data.fileName) {
      toast.error(i18n.t("flowBuilder.errors.mediaRequired"));
      return;
    }

    if (nextNode.id) {
      setNodes(nodes.map(node => (node.id === nextNode.id ? nextNode : node)));
      setActiveNodeId(nextNode.id);
    } else {
      const tempId = createTempId(nodes);
      const createdNode = { ...nextNode, id: tempId };
      setNodes([...nodes, createdNode]);
      setActiveNodeId(tempId);
    }

    setActiveEdgeId(null);
    setNodeModalOpen(false);
  };

  const handleRemoveNode = nodeId => {
    closeCanvasContextMenu();
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    setEdges(prevEdges =>
      prevEdges.filter(
        edge => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId
      )
    );
    if (activeNodeId === nodeId) {
      setActiveNodeId(null);
    }
    if (
      edges.some(edge => edge.id === activeEdgeId && (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId))
    ) {
      setActiveEdgeId(null);
    }
  };

  const handleConnect = connection => {
    closeCanvasContextMenu();
    if (!connection.source || !connection.target) {
      return;
    }

    const sourceNodeId = Number(connection.source);
    const targetNodeId = Number(connection.target);

    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) {
      return;
    }

    const tempId = createTempId(edges);
    setEdges([
      ...edges,
      {
        id: tempId,
        sourceNodeId,
        targetNodeId,
        conditionType: "always",
        conditionValue: "",
        priority: 0
      }
    ]);
    setActiveNodeId(null);
    setActiveEdgeId(tempId);
  };

  const handleUpdateEdge = (edgeId, updates) => {
    setEdges(prevEdges =>
      prevEdges.map(edge => (edge.id === edgeId ? { ...edge, ...updates } : edge))
    );
  };

  const handleRemoveEdge = edgeId => {
    closeCanvasContextMenu();
    setEdges(prevEdges => prevEdges.filter(edge => edge.id !== edgeId));
    if (activeEdgeId === edgeId) {
      setActiveEdgeId(null);
    }
  };

  const handleAddTrigger = () => {
    const tempId = createTempId(triggers);
    setTriggers(prevTriggers => [
      ...prevTriggers,
      {
        id: tempId,
        type: "always",
        value: "",
        isActive: true
      }
    ]);
  };

  const handleUpdateTrigger = (triggerId, updates) => {
    setTriggers(prevTriggers =>
      prevTriggers.map(trigger =>
        trigger.id === triggerId ? { ...trigger, ...updates } : trigger
      )
    );
  };

  const handleRemoveTrigger = triggerId => {
    setTriggers(prevTriggers => prevTriggers.filter(trigger => trigger.id !== triggerId));
  };

  const handleSaveGraph = async () => {
    try {
      const payload = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          name: node.name,
          data: node.data,
          positionX: node.positionX,
          positionY: node.positionY
        })),
        edges: edges.map(edge => ({
          id: edge.id > 0 ? edge.id : undefined,
          sourceNodeId: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
          conditionType: edge.conditionType,
          conditionValue: edge.conditionValue,
          priority: edge.priority
        })),
        triggers: triggers.map(trigger => ({
          id: trigger.id > 0 ? trigger.id : undefined,
          type: trigger.type,
          value: trigger.value,
          isActive: trigger.isActive
        }))
      };

      const { data } = await api.put(`/flows/${flowId}/graph`, payload);
      setFlow(data);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setTriggers(data.triggers || []);
      setActiveNodeId(data.nodes?.[0]?.id || null);
      setActiveEdgeId(null);
      toast.success(i18n.t("flowBuilder.toasts.saved"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleUploadMedia = async event => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("media", file);

    setUploadingMedia(true);
    try {
      const { data } = await api.post("/flows/assets/upload", formData);
      setNodeDraft(prev => ({
        ...prev,
        data: {
          ...buildNodeData("media", prev?.data || {}),
          fileName: data.fileName,
          originalName: data.originalName,
          mimetype: data.mimetype,
          publicUrl: data.publicUrl
        }
      }));
      toast.success(i18n.t("flowBuilder.toasts.mediaUploaded"));
    } catch (err) {
      toastError(err);
    }
    setUploadingMedia(false);
    event.target.value = "";
  };

  const handleTestFlow = async () => {
    try {
      const { data } = await api.post(`/flows/${flowId}/test`, {
        input: "test",
        tags: [],
        queueId: null
      });

      toast.success(i18n.t("flowBuilder.toasts.tested"));
      setExecutionResult(data);
    } catch (err) {
      toastError(err);
    }
  };

  const handleExecuteFlow = async () => {
    try {
      const { data } = await api.post(`/flows/${flowId}/execute`, {
        input: "execute",
        tags: [],
        queueId: null
      });

      toast.success(i18n.t("flowBuilder.toasts.executed"));
      setExecutionResult(data);
    } catch (err) {
      toastError(err);
    }
  };

  const handleFitCanvas = () => {
    reactFlowInstance?.fitView?.({ padding: 0.16 });
  };

  const handleCanvasKeyDown = event => {
    const targetTag = event.target?.tagName?.toLowerCase();
    const isTypingTarget =
      targetTag === "input" ||
      targetTag === "textarea" ||
      targetTag === "select" ||
      event.target?.isContentEditable;

    if (nodeModalOpen || isTypingTarget) {
      return;
    }

    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === "s") {
      event.preventDefault();
      handleSaveGraph();
      return;
    }

    if (key === "n") {
      event.preventDefault();
      handleAddNode();
      return;
    }

    if (key === "f") {
      event.preventDefault();
      handleFitCanvas();
      return;
    }

    if (key === "escape") {
      event.preventDefault();
      setActiveNodeId(null);
      setActiveEdgeId(null);
      closeCanvasContextMenu();
    }
  };

  const handleNodeDragStop = (_, element) => {
    closeCanvasContextMenu();
    const nodeId = Number(element.id);
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              positionX: Math.round(element.position.x),
              positionY: Math.round(element.position.y)
            }
          : node
      )
    );
  };

  const handleElementClick = (_, element) => {
    closeCanvasContextMenu();
    if (element.source) {
      setActiveEdgeId(element.data?.edgeId || null);
      setActiveNodeId(null);
      return;
    }

    setActiveNodeId(Number(element.id));
    setActiveEdgeId(null);
  };

  const handleElementsRemove = removedElements => {
    closeCanvasContextMenu();
    const removedNodeIds = new Set();
    const removedEdgeIds = new Set();

    removedElements.forEach(element => {
      if (element.source) {
        if (element.data?.edgeId !== undefined) {
          removedEdgeIds.add(element.data.edgeId);
        }
      } else {
        removedNodeIds.add(Number(element.id));
      }
    });

    if (removedNodeIds.size > 0) {
      setNodes(prevNodes => prevNodes.filter(node => !removedNodeIds.has(node.id)));
      setEdges(prevEdges =>
        prevEdges.filter(
          edge =>
            !removedNodeIds.has(edge.sourceNodeId) &&
            !removedNodeIds.has(edge.targetNodeId) &&
            !removedEdgeIds.has(edge.id)
        )
      );
      if (activeNodeId && removedNodeIds.has(activeNodeId)) {
        setActiveNodeId(null);
      }
    }

    if (removedEdgeIds.size > 0) {
      setEdges(prevEdges => prevEdges.filter(edge => !removedEdgeIds.has(edge.id)));
      if (activeEdgeId && removedEdgeIds.has(activeEdgeId)) {
        setActiveEdgeId(null);
      }
    }
  };

  const flowElements = useMemo(
    () => [
      ...nodes.map(node => ({
        id: String(node.id),
        type: "flowNode",
        position: {
          x: Number(node.positionX || 0),
          y: Number(node.positionY || 0)
        },
        data: {
          type: node.type,
          title: getNodeLabelByType(node.type),
          name: node.name,
          summary: getNodeSummary(node),
          ariaLabel: `${getNodeLabelByType(node.type)}. ${node.name || getNodeLabelByType(node.type)}. ${getNodeSummary(node)}`,
          onSelect: () => {
            setActiveNodeId(node.id);
            setActiveEdgeId(null);
            closeCanvasContextMenu();
          },
          onEdit: () => handleEditNode(node)
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left
      })),
      ...edges.map(edge => ({
        id: `edge-${edge.id}`,
        source: String(edge.sourceNodeId),
        target: String(edge.targetNodeId),
        type: "smoothstep",
        label: getEdgeSummary(edge),
        data: { edgeId: edge.id },
        animated: edge.conditionType !== "always",
        arrowHeadType: "arrowclosed",
        style: {
          stroke: activeEdgeId === edge.id ? "#0EA5E9" : "#64748B"
        },
        labelStyle: {
          fill: "#0F172A",
          fontSize: 12,
          fontWeight: 700
        }
      }))
    ],
    [nodes, edges, activeEdgeId, queueLabelMap]
  );

  const reactFlowNodeTypes = useMemo(() => ({ flowNode: FlowCanvasNode }), []);

  const activeNode = useMemo(
    () => nodes.find(node => node.id === activeNodeId) || null,
    [nodes, activeNodeId]
  );

  const activeEdge = useMemo(
    () => edges.find(edge => edge.id === activeEdgeId) || null,
    [edges, activeEdgeId]
  );

  const handlePaneContextMenu = event => {
    setActiveNodeId(null);
    setActiveEdgeId(null);
    openCanvasContextMenu(event, {
      scope: "pane"
    });
  };

  const handleNodeContextMenu = (event, element) => {
    const nodeId = Number(element.id);
    setActiveNodeId(nodeId);
    setActiveEdgeId(null);
    openCanvasContextMenu(event, {
      scope: "node",
      nodeId
    });
  };

  const handleEdgeContextMenu = (event, element) => {
    const edgeId = element.data?.edgeId || null;
    setActiveEdgeId(edgeId);
    setActiveNodeId(null);
    openCanvasContextMenu(event, {
      scope: "edge",
      edgeId
    });
  };

  const handleAddNodeAtPosition = type => {
    const position = canvasContextMenu?.position || buildNextNodePosition(nodes);
    openNodeModal(buildNodeDraft(type, position));
    closeCanvasContextMenu();
  };

  const handleDuplicateNode = nodeId => {
    const sourceNode = nodes.find(node => node.id === nodeId);

    if (!sourceNode) {
      return;
    }

    if (sourceNode.type === "start") {
      toast.error(i18n.t("flowBuilder.errors.singleStart"));
      return;
    }

    const tempId = createTempId(nodes);
    const duplicatedNode = {
      ...sourceNode,
      id: tempId,
      name: sourceNode.name,
      data: buildNodeData(sourceNode.type, sourceNode.data || {}),
      positionX: Number(sourceNode.positionX || 0) + 56,
      positionY: Number(sourceNode.positionY || 0) + 56
    };

    setNodes(prevNodes => [...prevNodes, duplicatedNode]);
    setActiveNodeId(tempId);
    setActiveEdgeId(null);
    closeCanvasContextMenu();
  };

  const contextNode = useMemo(
    () => nodes.find(node => node.id === canvasContextMenu?.nodeId) || null,
    [nodes, canvasContextMenu]
  );

  const contextEdge = useMemo(
    () => edges.find(edge => edge.id === canvasContextMenu?.edgeId) || null,
    [edges, canvasContextMenu]
  );

  const activeNodeInbound = activeNode
    ? edges.filter(edge => edge.targetNodeId === activeNode.id).length
    : 0;
  const activeNodeOutbound = activeNode
    ? edges.filter(edge => edge.sourceNodeId === activeNode.id).length
    : 0;

  const executionLogs = executionResult?.logs || [];
  const draftNodeHelp = nodeDraft?.type
    ? i18n.t(`flowBuilder.nodes.typeHelp.${nodeDraft.type}`)
    : "";

  return (
    <MainContainer>
      <MainHeader>
        <div className={classes.headerTitle}>
          <PageBackButton fallbackTo="/flows" />
          <Title>{i18n.t("flowBuilder.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {flow?.name ? `${flow.name}` : ""}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper className={classes.actionRow}>
          <Button
            variant="outlined"
            onClick={handleAddNode}
            className={classes.neutralButton}
          >
            {i18n.t("flowBuilder.buttons.addNode")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveGraph}
            className={`${classes.actionButton} ${classes.headerActionButton}`}
          >
            {i18n.t("flowBuilder.buttons.save")}
          </Button>
          <Button
            variant="outlined"
            onClick={handleTestFlow}
            className={classes.neutralButton}
          >
            {i18n.t("flowBuilder.buttons.test")}
          </Button>
          <Button
            variant="outlined"
            onClick={handleExecuteFlow}
            className={classes.neutralButton}
          >
            {i18n.t("flowBuilder.buttons.execute")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <div className={classes.pageBody}>
        <div className={classes.builderGrid}>
          <div className={classes.canvasShell}>
            <Paper className={classes.surface} variant="outlined">
              <div className={classes.sectionHeader}>
                <div>
                  <Typography variant="subtitle1" className={classes.sectionTitle}>
                    {i18n.t("flowBuilder.guide.title")}
                  </Typography>
                  <Typography variant="body2" className={classes.sectionHint}>
                    {i18n.t("flowBuilder.guide.subtitle")}
                  </Typography>
                </div>
              </div>

              <div className={classes.statsRow}>
                <Paper className={classes.statCard} elevation={0}>
                  <Typography className={classes.statValue}>{nodes.length}</Typography>
                  <Typography className={classes.statLabel}>
                    {i18n.t("flowBuilder.stats.nodes")}
                  </Typography>
                </Paper>
                <Paper className={classes.statCard} elevation={0}>
                  <Typography className={classes.statValue}>{edges.length}</Typography>
                  <Typography className={classes.statLabel}>
                    {i18n.t("flowBuilder.stats.edges")}
                  </Typography>
                </Paper>
                <Paper className={classes.statCard} elevation={0}>
                  <Typography className={classes.statValue}>{triggers.length}</Typography>
                  <Typography className={classes.statLabel}>
                    {i18n.t("flowBuilder.stats.triggers")}
                  </Typography>
                </Paper>
              </div>

              <div className={classes.quickActions}>
                {nodeTypes.map(type => (
                  <Button
                    key={type.value}
                    variant="outlined"
                    size="small"
                    className={classes.quickActionButton}
                    onClick={() => handleAddNodeOfType(type.value)}
                    disabled={type.value === "start" && nodes.some(node => node.type === "start")}
                  >
                    {i18n.t(type.label)}
                  </Button>
                ))}
              </div>
            </Paper>

            <Paper className={`${classes.surface} ${classes.canvasSurface}`} variant="outlined">
              <div className={classes.canvasHeader}>
                <div>
                  <Typography variant="subtitle1" className={classes.sectionTitle}>
                    {i18n.t("flowBuilder.canvas.title")}
                  </Typography>
                  <Typography variant="body2" className={classes.sectionHint}>
                    {i18n.t("flowBuilder.canvas.subtitle")}
                  </Typography>
                </div>
                <Typography variant="body2" className={classes.helperCallout}>
                  {i18n.t("flowBuilder.canvas.helper")}
                </Typography>
              </div>
              <div
                className={classes.canvasWrapper}
                ref={canvasWrapperRef}
                tabIndex={0}
                onKeyDown={handleCanvasKeyDown}
                onMouseDown={() => canvasWrapperRef.current?.focus()}
                aria-label={i18n.t("flowBuilder.canvas.ariaLabel")}
              >
                {canvasContextMenu && (
                  <Paper
                    className={classes.canvasContextMenu}
                    style={{
                      left: Math.max(
                        12,
                        Math.min(
                          canvasContextMenu.mouseX,
                          (canvasWrapperRef.current?.clientWidth || 320) - 272
                        )
                      ),
                      top: Math.max(
                        12,
                        Math.min(
                          canvasContextMenu.mouseY,
                          (canvasWrapperRef.current?.clientHeight || 220) -
                            (canvasContextMenu.scope === "pane" ? 520 : 220)
                        )
                      )
                    }}
                    elevation={0}
                  >
                    <Typography className={classes.canvasContextTitle}>
                      {canvasContextMenu.scope === "pane"
                        ? i18n.t("flowBuilder.canvas.contextPane")
                        : canvasContextMenu.scope === "node"
                        ? i18n.t("flowBuilder.canvas.contextNode")
                        : i18n.t("flowBuilder.canvas.contextEdge")}
                    </Typography>

                    {canvasContextMenu.scope === "pane" &&
                      nodeTypes.map(type => (
                        <Button
                          key={type.value}
                          className={classes.canvasContextButton}
                          onClick={() => handleAddNodeAtPosition(type.value)}
                        >
                          <span>
                            {i18n.t(type.label)}
                            <span className={classes.canvasContextMeta}>
                              {i18n.t(`flowBuilder.nodes.typeHelp.${type.value}`)}
                            </span>
                          </span>
                        </Button>
                      ))}

                    {canvasContextMenu.scope === "node" && contextNode && (
                      <>
                        <Button
                          className={classes.canvasContextButton}
                          onClick={() => handleEditNode(contextNode)}
                        >
                          <span>
                            {i18n.t("flowBuilder.nodes.edit")}
                            <span className={classes.canvasContextMeta}>
                              {contextNode.name || getNodeLabelByType(contextNode.type)}
                            </span>
                          </span>
                        </Button>
                        <Button
                          className={classes.canvasContextButton}
                          onClick={() => handleDuplicateNode(contextNode.id)}
                        >
                          <span>
                            {i18n.t("flowBuilder.canvas.duplicateNode")}
                            <span className={classes.canvasContextMeta}>
                              {i18n.t("flowBuilder.canvas.duplicateNodeHint")}
                            </span>
                          </span>
                        </Button>
                        <Button
                          className={`${classes.canvasContextButton} ${classes.canvasContextDanger}`}
                          onClick={() => handleRemoveNode(contextNode.id)}
                        >
                          <span>
                            {i18n.t("flowBuilder.nodes.remove")}
                            <span className={classes.canvasContextMeta}>
                              {i18n.t("flowBuilder.canvas.removeNodeHint")}
                            </span>
                          </span>
                        </Button>
                      </>
                    )}

                    {canvasContextMenu.scope === "edge" && contextEdge && (
                      <>
                        <Button
                          className={classes.canvasContextButton}
                          onClick={() => {
                            setActiveEdgeId(contextEdge.id);
                            setActiveNodeId(null);
                            closeCanvasContextMenu();
                          }}
                        >
                          <span>
                            {i18n.t("flowBuilder.canvas.editEdge")}
                            <span className={classes.canvasContextMeta}>
                              {getEdgeSummary(contextEdge)}
                            </span>
                          </span>
                        </Button>
                        <Button
                          className={`${classes.canvasContextButton} ${classes.canvasContextDanger}`}
                          onClick={() => handleRemoveEdge(contextEdge.id)}
                        >
                          <span>
                            {i18n.t("flowBuilder.edges.remove")}
                            <span className={classes.canvasContextMeta}>
                              {i18n.t("flowBuilder.canvas.removeEdgeHint")}
                            </span>
                          </span>
                        </Button>
                      </>
                    )}
                  </Paper>
                )}

                {(activeNode || activeEdge) && (
                  <Paper className={classes.canvasFloatingInspector} elevation={0}>
                    <div className={classes.canvasFloatingHeader}>
                      <div>
                        <Typography className={classes.canvasFloatingTitle}>
                          {activeNode
                            ? i18n.t("flowBuilder.canvas.quickNodeTitle")
                            : i18n.t("flowBuilder.canvas.quickEdgeTitle")}
                        </Typography>
                        <Typography className={classes.canvasFloatingSubtitle}>
                          {i18n.t("flowBuilder.canvas.quickSelectedHint")}
                        </Typography>
                      </div>
                      <Button
                        size="small"
                        className={classes.rowActionButton}
                        onClick={() => {
                          setActiveNodeId(null);
                          setActiveEdgeId(null);
                          closeCanvasContextMenu();
                        }}
                      >
                        {i18n.t("flowBuilder.canvas.clearSelection")}
                      </Button>
                    </div>

                    {activeNode && (
                      <>
                        <Typography variant="subtitle2" className={classes.sectionTitle}>
                          {getNodeLabelByType(activeNode.type)}
                        </Typography>
                        <Typography className={classes.nodeName}>{activeNode.name || "-"}</Typography>
                        <Typography className={classes.nodeSummary}>{getNodeSummary(activeNode)}</Typography>
                        <div className={classes.detailChips}>
                          <Chip label={`${i18n.t("flowBuilder.edges.source")}: ${activeNodeOutbound}`} />
                          <Chip label={`${i18n.t("flowBuilder.edges.target")}: ${activeNodeInbound}`} />
                        </div>
                        <Typography className={classes.helperCallout}>
                          {i18n.t(`flowBuilder.nodes.typeHelp.${activeNode.type}`)}
                        </Typography>
                        <hr className={classes.canvasFloatingDivider} />
                        <div className={classes.rowActions}>
                          <Button
                            size="small"
                            className={classes.rowActionButton}
                            onClick={() => handleEditNode(activeNode)}
                          >
                            {i18n.t("flowBuilder.nodes.edit")}
                          </Button>
                          <Button
                            size="small"
                            className={classes.rowActionButton}
                            onClick={() => handleDuplicateNode(activeNode.id)}
                          >
                            {i18n.t("flowBuilder.canvas.duplicateNode")}
                          </Button>
                          <Button
                            size="small"
                            className={classes.rowDangerButton}
                            onClick={() => handleRemoveNode(activeNode.id)}
                          >
                            {i18n.t("flowBuilder.nodes.remove")}
                          </Button>
                        </div>
                      </>
                    )}

                    {activeEdge && (
                      <>
                        <Typography variant="subtitle2" className={classes.sectionTitle}>
                          {i18n.t("flowBuilder.edges.title")}
                        </Typography>
                        <Typography className={classes.nodeSummary}>
                          {(nodes.find(node => node.id === activeEdge.sourceNodeId)?.name ||
                            getNodeLabelByType(nodes.find(node => node.id === activeEdge.sourceNodeId)?.type || "message"))}
                          {" -> "}
                          {(nodes.find(node => node.id === activeEdge.targetNodeId)?.name ||
                            getNodeLabelByType(nodes.find(node => node.id === activeEdge.targetNodeId)?.type || "message"))}
                        </Typography>
                        <div className={classes.formRow} style={{ marginTop: 16 }}>
                          <FormControl variant="outlined" size="small">
                            <InputLabel>{i18n.t("flowBuilder.edges.source")}</InputLabel>
                            <Select
                              value={activeEdge.sourceNodeId}
                              onChange={event =>
                                handleUpdateEdge(activeEdge.id, {
                                  sourceNodeId: Number(event.target.value)
                                })
                              }
                              label={i18n.t("flowBuilder.edges.source")}
                            >
                              {nodes.map(node => (
                                <MenuItem key={node.id} value={node.id}>
                                  {node.name || getNodeLabelByType(node.type)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl variant="outlined" size="small">
                            <InputLabel>{i18n.t("flowBuilder.edges.target")}</InputLabel>
                            <Select
                              value={activeEdge.targetNodeId}
                              onChange={event =>
                                handleUpdateEdge(activeEdge.id, {
                                  targetNodeId: Number(event.target.value)
                                })
                              }
                              label={i18n.t("flowBuilder.edges.target")}
                            >
                              {nodes.map(node => (
                                <MenuItem key={node.id} value={node.id}>
                                  {node.name || getNodeLabelByType(node.type)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl variant="outlined" size="small">
                            <InputLabel>{i18n.t("flowBuilder.edges.condition")}</InputLabel>
                            <Select
                              value={activeEdge.conditionType || "always"}
                              onChange={event =>
                                handleUpdateEdge(activeEdge.id, {
                                  conditionType: event.target.value
                                })
                              }
                              label={i18n.t("flowBuilder.edges.condition")}
                            >
                              {edgeConditions.map(condition => (
                                <MenuItem key={condition.value} value={condition.value}>
                                  {i18n.t(condition.label)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {activeEdge.conditionType === "queue" ? (
                            <FormControl variant="outlined" size="small">
                              <InputLabel>{i18n.t("flowBuilder.edges.conditionValue")}</InputLabel>
                              <Select
                                value={activeEdge.conditionValue || ""}
                                onChange={event =>
                                  handleUpdateEdge(activeEdge.id, {
                                    conditionValue: event.target.value
                                  })
                                }
                                label={i18n.t("flowBuilder.edges.conditionValue")}
                              >
                                <MenuItem value="">
                                  {i18n.t("flowBuilder.edges.conditionPlaceholder")}
                                </MenuItem>
                                {queueOptions.map(queue => (
                                  <MenuItem key={queue.value} value={queue.value}>
                                    {queue.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <TextField
                              label={i18n.t("flowBuilder.edges.conditionValue")}
                              variant="outlined"
                              size="small"
                              value={activeEdge.conditionValue || ""}
                              onChange={event =>
                                handleUpdateEdge(activeEdge.id, {
                                  conditionValue: event.target.value
                                })
                              }
                            />
                          )}
                          <TextField
                            label={i18n.t("flowBuilder.edges.priority")}
                            type="number"
                            variant="outlined"
                            size="small"
                            value={activeEdge.priority || 0}
                            onChange={event =>
                              handleUpdateEdge(activeEdge.id, {
                                priority: Number(event.target.value)
                              })
                            }
                          />
                        </div>
                        <hr className={classes.canvasFloatingDivider} />
                        <div className={classes.rowActions}>
                          <Button
                            size="small"
                            className={classes.rowDangerButton}
                            onClick={() => handleRemoveEdge(activeEdge.id)}
                          >
                            {i18n.t("flowBuilder.edges.remove")}
                          </Button>
                        </div>
                      </>
                    )}
                  </Paper>
                )}

                <Paper className={classes.canvasDock} elevation={0}>
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.canvasDockButton}
                    onClick={handleAddNode}
                  >
                    {i18n.t("flowBuilder.buttons.addNode")}
                  </Button>
                  <Button
                    variant="outlined"
                    className={classes.canvasDockButton}
                    onClick={handleFitCanvas}
                  >
                    {i18n.t("flowBuilder.canvas.fitView")}
                  </Button>
                  <Button
                    variant="outlined"
                    className={classes.canvasDockButton}
                    onClick={handleSaveGraph}
                  >
                    {i18n.t("flowBuilder.buttons.save")}
                  </Button>
                  <Typography className={classes.canvasDockHint}>
                    {i18n.t("flowBuilder.canvas.shortcutsHint")}
                  </Typography>
                </Paper>

                <ReactFlow
                  className={classes.flowCanvas}
                  elements={flowElements}
                  nodeTypes={reactFlowNodeTypes}
                  onLoad={setReactFlowInstance}
                  onConnect={handleConnect}
                  onNodeDragStop={handleNodeDragStop}
                  onElementClick={handleElementClick}
                  onPaneContextMenu={handlePaneContextMenu}
                  onNodeContextMenu={handleNodeContextMenu}
                  onEdgeContextMenu={handleEdgeContextMenu}
                  onPaneClick={() => {
                    setActiveNodeId(null);
                    setActiveEdgeId(null);
                    closeCanvasContextMenu();
                  }}
                  onNodeDoubleClick={(_, element) => {
                    const node = nodes.find(item => item.id === Number(element.id));
                    if (node) {
                      handleEditNode(node);
                    }
                  }}
                  onElementsRemove={handleElementsRemove}
                  deleteKeyCode={46}
                  snapToGrid
                  snapGrid={[20, 20]}
                  selectNodesOnDrag={false}
                  fitView
                  defaultZoom={0.95}
                >
                  <MiniMap
                    nodeColor={node => nodeAccentMap[node.data?.type]?.color || "#64748B"}
                    nodeStrokeWidth={3}
                    maskColor="rgba(255,255,255,0.72)"
                  />
                  <Controls showInteractive={false} />
                  <Background color="#CBD5E1" gap={24} size={1} />
                </ReactFlow>
              </div>
            </Paper>
          </div>

          <div className={classes.sidebarColumn}>
            <Paper className={classes.surface} variant="outlined">
              <div className={classes.sectionHeader}>
                <div>
                  <Typography variant="subtitle1" className={classes.sectionTitle}>
                    {i18n.t("flowBuilder.inspector.title")}
                  </Typography>
                  <Typography variant="body2" className={classes.sectionHint}>
                    {i18n.t("flowBuilder.inspector.subtitle")}
                  </Typography>
                </div>
              </div>

              {!activeNode && !activeEdge && (
                <div className={classes.inspectorEmpty}>
                  <Typography variant="body2">{i18n.t("flowBuilder.inspector.empty")}</Typography>
                </div>
              )}

              {activeNode && (
                <>
                  <Typography variant="subtitle2" className={classes.sectionTitle}>
                    {getNodeLabelByType(activeNode.type)}
                  </Typography>
                  <Typography className={classes.nodeName}>{activeNode.name || "-"}</Typography>
                  <Typography className={classes.nodeSummary}>
                    {getNodeSummary(activeNode)}
                  </Typography>

                  <div className={classes.detailChips}>
                    <Chip label={`${i18n.t("flowBuilder.edges.source")}: ${activeNodeOutbound}`} />
                    <Chip label={`${i18n.t("flowBuilder.edges.target")}: ${activeNodeInbound}`} />
                  </div>

                  <Typography className={classes.helperCallout}>
                    {i18n.t(`flowBuilder.nodes.typeHelp.${activeNode.type}`)}
                  </Typography>

                  <div className={classes.rowActions} style={{ marginTop: 16 }}>
                    <Button
                      size="small"
                      className={classes.rowActionButton}
                      onClick={() => handleEditNode(activeNode)}
                    >
                      {i18n.t("flowBuilder.nodes.edit")}
                    </Button>
                    <Button
                      size="small"
                      className={classes.rowDangerButton}
                      onClick={() => handleRemoveNode(activeNode.id)}
                    >
                      {i18n.t("flowBuilder.nodes.remove")}
                    </Button>
                  </div>
                </>
              )}

              {activeEdge && (
                <>
                  <Typography variant="subtitle2" className={classes.sectionTitle}>
                    {i18n.t("flowBuilder.edges.title")}
                  </Typography>
                  <Typography className={classes.nodeSummary}>
                    {(nodes.find(node => node.id === activeEdge.sourceNodeId)?.name ||
                      getNodeLabelByType(nodes.find(node => node.id === activeEdge.sourceNodeId)?.type || "message"))}
                    {" -> "}
                    {(nodes.find(node => node.id === activeEdge.targetNodeId)?.name ||
                      getNodeLabelByType(nodes.find(node => node.id === activeEdge.targetNodeId)?.type || "message"))}
                  </Typography>
                  <div className={classes.formRow} style={{ marginTop: 16 }}>
                    <FormControl variant="outlined" size="small">
                      <InputLabel>{i18n.t("flowBuilder.edges.source")}</InputLabel>
                      <Select
                        value={activeEdge.sourceNodeId}
                        onChange={event =>
                          handleUpdateEdge(activeEdge.id, {
                            sourceNodeId: Number(event.target.value)
                          })
                        }
                        label={i18n.t("flowBuilder.edges.source")}
                      >
                        {nodes.map(node => (
                          <MenuItem key={node.id} value={node.id}>
                            {node.name || getNodeLabelByType(node.type)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small">
                      <InputLabel>{i18n.t("flowBuilder.edges.target")}</InputLabel>
                      <Select
                        value={activeEdge.targetNodeId}
                        onChange={event =>
                          handleUpdateEdge(activeEdge.id, {
                            targetNodeId: Number(event.target.value)
                          })
                        }
                        label={i18n.t("flowBuilder.edges.target")}
                      >
                        {nodes.map(node => (
                          <MenuItem key={node.id} value={node.id}>
                            {node.name || getNodeLabelByType(node.type)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small">
                      <InputLabel>{i18n.t("flowBuilder.edges.condition")}</InputLabel>
                      <Select
                        value={activeEdge.conditionType || "always"}
                        onChange={event =>
                          handleUpdateEdge(activeEdge.id, {
                            conditionType: event.target.value
                          })
                        }
                        label={i18n.t("flowBuilder.edges.condition")}
                      >
                        {edgeConditions.map(condition => (
                          <MenuItem key={condition.value} value={condition.value}>
                            {i18n.t(condition.label)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {activeEdge.conditionType === "queue" ? (
                      <FormControl variant="outlined" size="small">
                        <InputLabel>{i18n.t("flowBuilder.edges.conditionValue")}</InputLabel>
                        <Select
                          value={activeEdge.conditionValue || ""}
                          onChange={event =>
                            handleUpdateEdge(activeEdge.id, {
                              conditionValue: event.target.value
                            })
                          }
                          label={i18n.t("flowBuilder.edges.conditionValue")}
                        >
                          <MenuItem value="">
                            {i18n.t("flowBuilder.edges.conditionPlaceholder")}
                          </MenuItem>
                          {queueOptions.map(queue => (
                            <MenuItem key={queue.value} value={queue.value}>
                              {queue.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        label={i18n.t("flowBuilder.edges.conditionValue")}
                        variant="outlined"
                        size="small"
                        value={activeEdge.conditionValue || ""}
                        onChange={event =>
                          handleUpdateEdge(activeEdge.id, {
                            conditionValue: event.target.value
                          })
                        }
                      />
                    )}
                    <TextField
                      label={i18n.t("flowBuilder.edges.priority")}
                      type="number"
                      variant="outlined"
                      size="small"
                      value={activeEdge.priority || 0}
                      onChange={event =>
                        handleUpdateEdge(activeEdge.id, {
                          priority: Number(event.target.value)
                        })
                      }
                    />
                  </div>
                  <div className={classes.rowActions} style={{ marginTop: 16 }}>
                    <Button
                      size="small"
                      className={classes.rowDangerButton}
                      onClick={() => handleRemoveEdge(activeEdge.id)}
                    >
                      {i18n.t("flowBuilder.edges.remove")}
                    </Button>
                  </div>
                </>
              )}
            </Paper>

            <Paper className={classes.surface} variant="outlined">
              <div className={classes.sectionHeader}>
                <div>
                  <Typography variant="subtitle1" className={classes.sectionTitle}>
                    {i18n.t("flowBuilder.overview.title")}
                  </Typography>
                  <Typography variant="body2" className={classes.sectionHint}>
                    {i18n.t("flowBuilder.overview.subtitle")}
                  </Typography>
                </div>
              </div>
              {nodes.length === 0 ? (
                <Typography variant="body2">{i18n.t("flowBuilder.overview.empty")}</Typography>
              ) : (
                <div className={classes.sideList}>
                  {nodes.map(node => (
                    <Paper
                      key={node.id}
                      className={`${classes.sideListItem} ${
                        activeNodeId === node.id ? classes.sideListItemActive : ""
                      }`}
                      elevation={0}
                      onClick={() => {
                        setActiveNodeId(node.id);
                        setActiveEdgeId(null);
                      }}
                    >
                      <div className={classes.sideListMeta}>
                        <Typography variant="subtitle2">
                          {node.name || getNodeLabelByType(node.type)}
                        </Typography>
                        <span className={classes.sideListBadge}>{getNodeLabelByType(node.type)}</span>
                      </div>
                      <Typography className={classes.nodeSummary}>{getNodeSummary(node)}</Typography>
                    </Paper>
                  ))}
                </div>
              )}
            </Paper>

            <Paper className={classes.surface} variant="outlined">
              <div className={classes.sectionHeader}>
                <div>
                  <Typography variant="subtitle1" className={classes.sectionTitle}>
                    {i18n.t("flowBuilder.triggers.title")}
                  </Typography>
                  <Typography variant="body2" className={classes.sectionHint}>
                    Controle quando o fluxo deve iniciar e quais entradas ativam cada disparo.
                  </Typography>
                </div>
                <Button size="small" className={classes.rowActionButton} onClick={handleAddTrigger}>
                  {i18n.t("flowBuilder.triggers.add")}
                </Button>
              </div>
              {triggers.length === 0 && (
                <Typography variant="body2">
                  {i18n.t("flowBuilder.triggers.empty")}
                </Typography>
              )}
              <div style={{ display: "grid", gap: 12 }}>
                {triggers.map(trigger => (
                  <Paper key={trigger.id} className={classes.nodeCard}>
                    <div className={classes.formRow}>
                      <FormControl variant="outlined" size="small">
                        <InputLabel>{i18n.t("flowBuilder.triggers.type")}</InputLabel>
                        <Select
                          value={trigger.type || "always"}
                          onChange={event =>
                            handleUpdateTrigger(trigger.id, {
                              type: event.target.value
                            })
                          }
                          label={i18n.t("flowBuilder.triggers.type")}
                        >
                          {triggerTypes.map(item => (
                            <MenuItem key={item.value} value={item.value}>
                              {i18n.t(item.label)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {trigger.type === "queue" ? (
                        <FormControl variant="outlined" size="small">
                          <InputLabel>{i18n.t("flowBuilder.triggers.value")}</InputLabel>
                          <Select
                            value={trigger.value || ""}
                            onChange={event =>
                              handleUpdateTrigger(trigger.id, {
                                value: event.target.value
                              })
                            }
                            label={i18n.t("flowBuilder.triggers.value")}
                          >
                            <MenuItem value="">
                              {i18n.t("flowBuilder.triggers.valuePlaceholder")}
                            </MenuItem>
                            {queueOptions.map(queue => (
                              <MenuItem key={queue.value} value={queue.value}>
                                {queue.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          label={i18n.t("flowBuilder.triggers.value")}
                          variant="outlined"
                          size="small"
                          value={trigger.value || ""}
                          onChange={event =>
                            handleUpdateTrigger(trigger.id, {
                              value: event.target.value
                            })
                          }
                        />
                      )}
                      <FormControl variant="outlined" size="small">
                        <InputLabel>{i18n.t("flowBuilder.triggers.status")}</InputLabel>
                        <Select
                          value={trigger.isActive ? "active" : "inactive"}
                          onChange={event =>
                            handleUpdateTrigger(trigger.id, {
                              isActive: event.target.value === "active"
                            })
                          }
                          label={i18n.t("flowBuilder.triggers.status")}
                        >
                          <MenuItem value="active">
                            {i18n.t("flowBuilder.triggers.active")}
                          </MenuItem>
                          <MenuItem value="inactive">
                            {i18n.t("flowBuilder.triggers.inactive")}
                          </MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        className={classes.rowDangerButton}
                        onClick={() => handleRemoveTrigger(trigger.id)}
                      >
                        {i18n.t("flowBuilder.triggers.remove")}
                      </Button>
                    </div>
                  </Paper>
                ))}
              </div>
            </Paper>

            <Paper className={classes.surface} variant="outlined">
              <div className={classes.sectionHeader}>
                <div>
                  <Typography variant="subtitle1" className={classes.sectionTitle}>
                    {i18n.t("flowBuilder.execution.title")}
                  </Typography>
                  <Typography variant="body2" className={classes.sectionHint}>
                    Consulte o resultado mais recente para revisar status, identificador e eventos gerados.
                  </Typography>
                </div>
              </div>
              {!executionResult && (
                <Typography variant="body2">
                  {i18n.t("flowBuilder.execution.empty")}
                </Typography>
              )}
              {executionResult && (
                <>
                  <div className={classes.executionMeta}>
                    <Chip
                      label={`${i18n.t("flowBuilder.execution.status")}: ${executionResult.status || "-"}`}
                      className={
                        executionResult.status === "failed"
                          ? classes.chipError
                          : classes.chipSuccess
                      }
                    />
                    <Chip
                      label={`${i18n.t("flowBuilder.execution.id")}: ${executionResult.id}`}
                    />
                  </div>
                  {executionLogs.length === 0 ? (
                    <Typography variant="body2">
                      {i18n.t("flowBuilder.execution.noLogs")}
                    </Typography>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {executionLogs.map(log => (
                        <Paper key={log.id} className={classes.nodeCard}>
                          <Typography variant="subtitle2">{log.event}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {log.message || "-"}
                          </Typography>
                        </Paper>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Paper>
          </div>
        </div>
      </div>

      <Dialog open={nodeModalOpen} onClose={() => setNodeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{i18n.t("flowBuilder.nodes.modalTitle")}</DialogTitle>
        <DialogContent dividers>
          <FormControl variant="outlined" fullWidth margin="dense">
            <InputLabel>{i18n.t("flowBuilder.nodes.type")}</InputLabel>
            <Select
              value={nodeDraft?.type || "message"}
              onChange={event =>
                setNodeDraft(prev => ({
                  ...prev,
                  type: event.target.value,
                  data: buildNodeData(event.target.value, prev?.data || {})
                }))
              }
              label={i18n.t("flowBuilder.nodes.type")}
            >
              {nodeTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {i18n.t(type.label)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography className={classes.helperCallout}>{draftNodeHelp}</Typography>
          <TextField
            label={i18n.t("flowBuilder.nodes.name")}
            variant="outlined"
            fullWidth
            margin="dense"
            value={nodeDraft?.name || ""}
            onChange={event =>
              setNodeDraft(prev => ({
                ...prev,
                name: event.target.value
              }))
            }
          />
          {nodeDraft?.type === "message" && (
            <>
              {nodeDraft?.data?.outboundMode !== "OFFICIAL" && <TextField label={i18n.t("flowBuilder.nodes.message")} variant="outlined" fullWidth margin="dense" multiline rows={3} value={nodeDraft?.data?.text || ""} onChange={event => setNodeDraft(prev => ({ ...prev, data: { ...prev.data, text: event.target.value } }))} />}
              <OfficialOutboundConfig value={nodeDraft?.data || { outboundMode: "STANDARD" }} onChange={next => setNodeDraft(prev => ({ ...prev, data: next }))} />
            </>
          )}
          {nodeDraft?.type === "media" && (
            <>
              <Button
                variant="outlined"
                color="primary"
                component="label"
                disabled={uploadingMedia}
                className={classes.previewButton}
              >
                {uploadingMedia
                  ? i18n.t("flowBuilder.nodes.mediaUploading")
                  : i18n.t("flowBuilder.nodes.mediaUpload")}
                <input hidden type="file" onChange={handleUploadMedia} />
              </Button>
              <div className={classes.assetMeta}>
                <Typography variant="subtitle2">
                  {i18n.t("flowBuilder.nodes.mediaFile")}
                </Typography>
                <Typography variant="body2" className={classes.nodeSummary}>
                  {nodeDraft?.data?.originalName || i18n.t("flowBuilder.nodes.mediaNotSelected")}
                </Typography>
                {nodeDraft?.data?.fileName && (
                  <Button
                    variant="text"
                    color="primary"
                    href={getPublicAssetUrl(nodeDraft?.data?.publicUrl || nodeDraft?.data?.fileName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classes.previewButton}
                  >
                    {i18n.t("flowBuilder.nodes.mediaPreview")}
                  </Button>
                )}
              </div>
              <TextField
                label={i18n.t("flowBuilder.nodes.mediaCaption")}
                variant="outlined"
                fullWidth
                margin="dense"
                multiline
                rows={2}
                value={nodeDraft?.data?.caption || ""}
                onChange={event =>
                  setNodeDraft(prev => ({
                    ...prev,
                    data: {
                      ...buildNodeData("media", prev?.data || {}),
                      caption: event.target.value
                    }
                  }))
                }
              />
            </>
          )}
          {(nodeDraft?.type === "queue" || nodeDraft?.type === "handoff") && (
            <FormControl variant="outlined" fullWidth margin="dense">
              <InputLabel>{i18n.t("flowBuilder.nodes.queue")}</InputLabel>
              <Select
                value={nodeDraft?.data?.queueId || ""}
                onChange={event =>
                  setNodeDraft(prev => ({
                    ...prev,
                    data: { ...prev.data, queueId: event.target.value }
                  }))
                }
                label={i18n.t("flowBuilder.nodes.queue")}
              >
                <MenuItem value="">{i18n.t("flowBuilder.nodes.queuePlaceholder")}</MenuItem>
                {queueOptions.map(queue => (
                  <MenuItem key={queue.value} value={queue.value}>
                    {queue.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {nodeDraft?.type === "decision" && (
            <TextField
              label={i18n.t("flowBuilder.nodes.decisionHint")}
              variant="outlined"
              fullWidth
              margin="dense"
              value={nodeDraft?.data?.hint || ""}
              onChange={event =>
                setNodeDraft(prev => ({
                  ...prev,
                  data: { ...prev.data, hint: event.target.value }
                }))
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeModalOpen(false)} color="secondary" variant="outlined">
            {i18n.t("flowBuilder.nodes.cancel")}
          </Button>
          <Button onClick={handleSaveNode} color="primary" variant="contained">
            {i18n.t("flowBuilder.nodes.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default FlowBuilder;
