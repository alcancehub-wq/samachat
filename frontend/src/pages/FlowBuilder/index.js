import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

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

const nodeTypes = [
  { value: "start", label: "flowBuilder.nodeTypes.start" },
  { value: "message", label: "flowBuilder.nodeTypes.message" },
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

const useStyles = makeStyles(theme => ({
  ...buildMenuListPageStyles(theme),
  pageBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: theme.spacing(1.25, 1, 0),
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1, 0.75, 0),
    },
  },
  actionRow: {
    gap: theme.spacing(1),
  },
  headerActionButton: {
    minHeight: 40,
    borderRadius: 4,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none !important",
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
      boxShadow: "none !important",
    },
  },
  surface: {
    padding: theme.spacing(2.5),
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
    backgroundColor: "#FFFFFF",
  },
  sectionSpacing: {
    marginTop: theme.spacing(2),
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
  sectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#111111",
    textTransform: "none",
  },
  sectionHint: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6,
  },
  stack: {
    display: "grid",
    gap: theme.spacing(1.5),
  },
  nodeCard: {
    padding: theme.spacing(1.75, 2),
    borderRadius: 12,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
  },
  nodeName: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6,
  },
  nodeHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
    },
  },
  rowActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  rowActionButton: {
    minWidth: "auto",
    padding: 0,
    fontWeight: 700,
    color: "#111111",
    "&:hover": {
      backgroundColor: "transparent",
      color: "#111111",
    },
  },
  rowDangerButton: {
    minWidth: "auto",
    padding: 0,
    fontWeight: 700,
    color: "#FF1919",
    "&:hover": {
      backgroundColor: "transparent",
      color: "#E11414",
    },
  },
  formRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.5),
    alignItems: "center",
    "& > *": {
      minWidth: 140,
      flex: "1 1 140px",
    },
  },
  compactAction: {
    minWidth: "auto",
    flex: "0 0 auto",
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  executionMeta: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginBottom: theme.spacing(1.5),
  },
  chipSuccess: {
    backgroundColor: "rgba(17, 17, 17, 0.08)",
    color: "#111111",
    fontWeight: 700,
  },
  chipError: {
    backgroundColor: "#FF1919",
    color: "#FFFFFF",
    fontWeight: 700,
  },
}));

const FlowBuilder = () => {
  const classes = useStyles();
  const { flowId } = useParams();

  const [flow, setFlow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [queues, setQueues] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    const fetchFlow = async () => {
      try {
        const { data } = await api.get(`/flows/${flowId}`);
        setFlow(data);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setTriggers(data.triggers || []);
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

  const handleAddNode = () => {
    setSelectedNode({
      type: "message",
      name: "",
      data: { text: "" },
      positionX: 0,
      positionY: 0
    });
    setNodeModalOpen(true);
  };

  const handleEditNode = node => {
    setSelectedNode({ ...node });
    setNodeModalOpen(true);
  };

  const handleSaveNode = () => {
    if (!selectedNode) {
      return;
    }

    setNodes(prevNodes => {
      if (selectedNode.id) {
        return prevNodes.map(node =>
          node.id === selectedNode.id ? selectedNode : node
        );
      }

      const tempId = Math.min(0, ...prevNodes.map(node => node.id || 0)) - 1;
      return [...prevNodes, { ...selectedNode, id: tempId }];
    });

    setNodeModalOpen(false);
  };

  const handleRemoveNode = nodeId => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    setEdges(prevEdges =>
      prevEdges.filter(
        edge => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId
      )
    );
  };

  const handleAddEdge = () => {
    if (nodes.length < 2) {
      toast.error(i18n.t("flowBuilder.errors.needTwoNodes"));
      return;
    }

    const source = nodes[0];
    const target = nodes[1];

    const tempId = Math.min(0, ...edges.map(edge => edge.id || 0)) - 1;

    setEdges(prevEdges => [
      ...prevEdges,
      {
        id: tempId,
        sourceNodeId: source.id,
        targetNodeId: target.id,
        conditionType: "always",
        conditionValue: "",
        priority: 0
      }
    ]);
  };

  const handleUpdateEdge = (edgeId, updates) => {
    setEdges(prevEdges =>
      prevEdges.map(edge => (edge.id === edgeId ? { ...edge, ...updates } : edge))
    );
  };

  const handleRemoveEdge = edgeId => {
    setEdges(prevEdges => prevEdges.filter(edge => edge.id !== edgeId));
  };

  const handleAddTrigger = () => {
    const tempId = Math.min(0, ...triggers.map(trigger => trigger.id || 0)) - 1;
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
          id: node.id > 0 ? node.id : undefined,
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
      toast.success(i18n.t("flowBuilder.toasts.saved"));
    } catch (err) {
      toastError(err);
    }
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

  const getNodeLabel = node => {
    const key = nodeTypes.find(type => type.value === node.type)?.label;
    return key ? i18n.t(key) : node.type;
  };

  const queueOptions = useMemo(
    () => queues.map(queue => ({ value: queue.id, label: queue.name })),
    [queues]
  );

  const executionLogs = executionResult?.logs || [];

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
            variant="outlined"
            onClick={handleAddEdge}
            className={classes.neutralButton}
          >
            {i18n.t("flowBuilder.buttons.addEdge")}
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
        <Paper className={classes.mainPaper} variant="outlined">
          <Paper className={classes.surface} variant="outlined">
            <div className={classes.sectionHeader}>
              <div>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  {i18n.t("flowBuilder.nodes.title")}
                </Typography>
                <Typography variant="body2" className={classes.sectionHint}>
                  Estruture os passos principais do fluxo e revise a sequencia antes de salvar.
                </Typography>
              </div>
            </div>
            {nodes.length === 0 && (
              <Typography variant="body2">{i18n.t("flowBuilder.nodes.empty")}</Typography>
            )}
            <div className={classes.stack}>
              {nodes.map(node => (
                <Paper key={node.id} className={classes.nodeCard}>
                  <div className={classes.nodeHeader}>
                    <div>
                      <Typography variant="subtitle2">{getNodeLabel(node)}</Typography>
                      <Typography className={classes.nodeName}>
                        {node.name || "-"}
                      </Typography>
                    </div>
                    <div className={classes.rowActions}>
                      <Button size="small" className={classes.rowActionButton} onClick={() => handleEditNode(node)}>
                        {i18n.t("flowBuilder.nodes.edit")}
                      </Button>
                      <Button size="small" className={classes.rowDangerButton} onClick={() => handleRemoveNode(node.id)}>
                        {i18n.t("flowBuilder.nodes.remove")}
                      </Button>
                    </div>
                  </div>
                </Paper>
              ))}
            </div>
          </Paper>

        <Paper className={`${classes.surface} ${classes.sectionSpacing}`} variant="outlined">
          <div className={classes.sectionHeader}>
            <div>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {i18n.t("flowBuilder.edges.title")}
              </Typography>
              <Typography variant="body2" className={classes.sectionHint}>
                Defina as regras de transicao entre os nos e mantenha as prioridades consistentes.
              </Typography>
            </div>
          </div>
          {edges.length === 0 && (
            <Typography variant="body2">{i18n.t("flowBuilder.edges.empty")}</Typography>
          )}
          <div className={classes.stack}>
            {edges.map(edge => (
              <Paper key={edge.id} className={classes.nodeCard}>
                <div className={classes.formRow}>
              <FormControl variant="outlined" size="small">
                <InputLabel>{i18n.t("flowBuilder.edges.source")}</InputLabel>
                <Select
                  value={edge.sourceNodeId}
                  onChange={event =>
                    handleUpdateEdge(edge.id, {
                      sourceNodeId: Number(event.target.value)
                    })
                  }
                  label={i18n.t("flowBuilder.edges.source")}
                >
                  {nodes.map(node => (
                    <MenuItem key={node.id} value={node.id}>
                      {getNodeLabel(node)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="outlined" size="small">
                <InputLabel>{i18n.t("flowBuilder.edges.target")}</InputLabel>
                <Select
                  value={edge.targetNodeId}
                  onChange={event =>
                    handleUpdateEdge(edge.id, {
                      targetNodeId: Number(event.target.value)
                    })
                  }
                  label={i18n.t("flowBuilder.edges.target")}
                >
                  {nodes.map(node => (
                    <MenuItem key={node.id} value={node.id}>
                      {getNodeLabel(node)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="outlined" size="small">
                <InputLabel>{i18n.t("flowBuilder.edges.condition")}</InputLabel>
                <Select
                  value={edge.conditionType || "always"}
                  onChange={event =>
                    handleUpdateEdge(edge.id, {
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
              {edge.conditionType === "queue" ? (
                <FormControl variant="outlined" size="small">
                  <InputLabel>{i18n.t("flowBuilder.edges.conditionValue")}</InputLabel>
                  <Select
                    value={edge.conditionValue || ""}
                    onChange={event =>
                      handleUpdateEdge(edge.id, {
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
                  value={edge.conditionValue || ""}
                  onChange={event =>
                    handleUpdateEdge(edge.id, {
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
                value={edge.priority || 0}
                onChange={event =>
                  handleUpdateEdge(edge.id, {
                    priority: Number(event.target.value)
                  })
                }
              />
              <Button
                size="small"
                onClick={() => handleRemoveEdge(edge.id)}
                className={`${classes.rowDangerButton} ${classes.compactAction}`}
              >
                {i18n.t("flowBuilder.edges.remove")}
              </Button>
                </div>
              </Paper>
            ))}
          </div>
        </Paper>

        <Paper className={`${classes.surface} ${classes.sectionSpacing}`} variant="outlined">
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
          <div className={classes.stack}>
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
              <Button size="small" className={classes.rowDangerButton} onClick={() => handleRemoveTrigger(trigger.id)}>
                {i18n.t("flowBuilder.triggers.remove")}
              </Button>
            </div>
          </Paper>
        ))}
          </div>
        </Paper>

        <Paper className={`${classes.surface} ${classes.sectionSpacing}`} variant="outlined">
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
                  label={`${i18n.t("flowBuilder.execution.status")}: ${
                    executionResult.status || "-"
                  }`}
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
                <div className={classes.stack}>
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
        </Paper>
      </div>

      <Dialog open={nodeModalOpen} onClose={() => setNodeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{i18n.t("flowBuilder.nodes.modalTitle")}</DialogTitle>
        <DialogContent dividers>
          <FormControl variant="outlined" fullWidth margin="dense">
            <InputLabel>{i18n.t("flowBuilder.nodes.type")}</InputLabel>
            <Select
              value={selectedNode?.type || "message"}
              onChange={event =>
                setSelectedNode(prev => ({
                  ...prev,
                  type: event.target.value
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
          <TextField
            label={i18n.t("flowBuilder.nodes.name")}
            variant="outlined"
            fullWidth
            margin="dense"
            value={selectedNode?.name || ""}
            onChange={event =>
              setSelectedNode(prev => ({
                ...prev,
                name: event.target.value
              }))
            }
          />
          {selectedNode?.type === "message" && (
            <TextField
              label={i18n.t("flowBuilder.nodes.message")}
              variant="outlined"
              fullWidth
              margin="dense"
              multiline
              rows={3}
              value={selectedNode?.data?.text || ""}
              onChange={event =>
                setSelectedNode(prev => ({
                  ...prev,
                  data: { ...prev.data, text: event.target.value }
                }))
              }
            />
          )}
          {(selectedNode?.type === "queue" || selectedNode?.type === "handoff") && (
            <FormControl variant="outlined" fullWidth margin="dense">
              <InputLabel>{i18n.t("flowBuilder.nodes.queue")}</InputLabel>
              <Select
                value={selectedNode?.data?.queueId || ""}
                onChange={event =>
                  setSelectedNode(prev => ({
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
          {selectedNode?.type === "decision" && (
            <TextField
              label={i18n.t("flowBuilder.nodes.decisionHint")}
              variant="outlined"
              fullWidth
              margin="dense"
              value={selectedNode?.data?.hint || ""}
              onChange={event =>
                setSelectedNode(prev => ({
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
