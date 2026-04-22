import React, { useEffect, useReducer, useState } from "react";
import { useHistory } from "react-router-dom";
import openSocket from "../../services/socket-io";

import {
  Button,
  Chip,
  IconButton,
  InputAdornment,
  makeStyles,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@material-ui/core";

import {
  DeleteOutline,
  Edit,
  Launch,
  Publish,
  Search
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import FlowModal from "../../components/FlowModal";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const reducer = (state, action) => {
  if (action.type === "LOAD_FLOWS") {
    return action.payload;
  }

  if (action.type === "UPDATE_FLOW") {
    const flow = action.payload;
    const flowIndex = state.findIndex(item => item.id === flow.id);

    if (flowIndex !== -1) {
      state[flowIndex] = flow;
      return [...state];
    }

    return [flow, ...state];
  }

  if (action.type === "DELETE_FLOW") {
    const flowId = action.payload;
    const flowIndex = state.findIndex(item => item.id === flowId);
    if (flowIndex !== -1) {
      state.splice(flowIndex, 1);
    }
    return [...state];
  }

  return state;
};

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5)
  },
  headerSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.9rem"
  },
  tableActions: {
    whiteSpace: "nowrap"
  },
  statusChip: {
    textTransform: "capitalize"
  }
}));

const Flows = () => {
  const classes = useStyles();
  const history = useHistory();

  const [flows, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");

  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingFlow, setDeletingFlow] = useState(null);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchFlows = async () => {
        try {
          const { data } = await api.get("/flows", {
            params: { searchParam }
          });
          dispatch({ type: "LOAD_FLOWS", payload: data || [] });
          setLoading(false);
        } catch (err) {
          toastError(err);
          setLoading(false);
        }
      };

      fetchFlows();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("flow", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_FLOW", payload: data.flow });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_FLOW", payload: +data.flowId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenFlowModal = () => {
    setSelectedFlow(null);
    setFlowModalOpen(true);
  };

  const handleCloseFlowModal = () => {
    setSelectedFlow(null);
    setFlowModalOpen(false);
  };

  const handleEditFlow = flow => {
    setSelectedFlow(flow);
    setFlowModalOpen(true);
  };

  const handleDeleteFlow = async flowId => {
    try {
      await api.delete(`/flows/${flowId}`);
      toast.success(i18n.t("flows.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }

    setDeletingFlow(null);
  };

  const handlePublishFlow = async flow => {
    try {
      if (flow.status === "published") {
        await api.put(`/flows/${flow.id}/unpublish`);
        toast.success(i18n.t("flows.toasts.unpublished"));
      } else {
        await api.put(`/flows/${flow.id}/publish`);
        toast.success(i18n.t("flows.toasts.published"));
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenBuilder = flowId => {
    history.push(`/flowbuilder/${flowId}`);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingFlow &&
          `${i18n.t("flows.confirmationModal.deleteTitle")} ${deletingFlow.name}?`
        }
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={() => handleDeleteFlow(deletingFlow.id)}
      >
        {i18n.t("flows.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <FlowModal
        open={flowModalOpen}
        onClose={handleCloseFlowModal}
        flowId={selectedFlow?.id}
      />
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("flows.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("flows.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("flows.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
          <Button variant="contained" color="primary" onClick={handleOpenFlowModal}>
            {i18n.t("flows.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{i18n.t("flows.table.name")}</TableCell>
              <TableCell>{i18n.t("flows.table.status")}</TableCell>
              <TableCell>{i18n.t("flows.table.active")}</TableCell>
              <TableCell>{i18n.t("flows.table.updatedAt")}</TableCell>
              <TableCell align="center">{i18n.t("flows.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowSkeleton columns={5} />
            ) : (
              flows.map(flow => (
                <TableRow key={flow.id}>
                  <TableCell>{flow.name}</TableCell>
                  <TableCell>
                    <Chip
                      className={classes.statusChip}
                      color={flow.status === "published" ? "primary" : "default"}
                      label={
                        flow.status === "published"
                          ? i18n.t("flows.status.published")
                          : i18n.t("flows.status.draft")
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      className={classes.statusChip}
                      color={flow.isActive ? "primary" : "default"}
                      label={
                        flow.isActive
                          ? i18n.t("flows.status.active")
                          : i18n.t("flows.status.inactive")
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {flow.updatedAt ? new Date(flow.updatedAt).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell align="center" className={classes.tableActions}>
                    <IconButton size="small" onClick={() => handlePublishFlow(flow)}>
                      <Publish />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEditFlow(flow)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenBuilder(flow.id)}>
                      <Launch />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingFlow(flow);
                        setConfirmOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Flows;
