import React, { useEffect, useReducer, useState } from "react";

import openSocket from "../../services/socket-io";

import {
  Button,
  IconButton,
  makeStyles,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment
} from "@material-ui/core";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { DeleteOutline, Edit, Visibility, PlayArrow } from "@material-ui/icons";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import SearchIcon from "@material-ui/icons/Search";
import IntegrationModal from "../../components/IntegrationModal";
import WebhookModal from "../../components/WebhookModal";
import WebhookLogsModal from "../../components/WebhookLogsModal";
import buildMenuListPageStyles from "../../styles/menuListPageStyles";

const useStyles = makeStyles(theme => ({
  ...buildMenuListPageStyles(theme),
  spacer: {
    marginTop: theme.spacing(3)
  },
  urlCell: {
    maxWidth: 260,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  eventsCell: {
    maxWidth: 240,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  embeddedRoot: {
    display: "flex",
    flexDirection: "column"
  }
}));

const integrationReducer = (state, action) => {
  if (action.type === "LOAD") {
    const integrations = action.payload;
    const newItems = [];

    integrations.forEach(integration => {
      const index = state.findIndex(item => item.id === integration.id);
      if (index !== -1) {
        state[index] = integration;
      } else {
        newItems.push(integration);
      }
    });

    return [...state, ...newItems];
  }

  if (action.type === "UPDATE") {
    const integration = action.payload;
    const index = state.findIndex(item => item.id === integration.id);

    if (index !== -1) {
      state[index] = integration;
      return [...state];
    }

    return [integration, ...state];
  }

  if (action.type === "DELETE") {
    const integrationId = action.payload;
    const index = state.findIndex(item => item.id === integrationId);
    if (index !== -1) {
      state.splice(index, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const webhookReducer = (state, action) => {
  if (action.type === "LOAD") {
    const webhooks = action.payload;
    const newItems = [];

    webhooks.forEach(webhook => {
      const index = state.findIndex(item => item.id === webhook.id);
      if (index !== -1) {
        state[index] = webhook;
      } else {
        newItems.push(webhook);
      }
    });

    return [...state, ...newItems];
  }

  if (action.type === "UPDATE") {
    const webhook = action.payload;
    const index = state.findIndex(item => item.id === webhook.id);

    if (index !== -1) {
      state[index] = webhook;
      return [...state];
    }

    return [webhook, ...state];
  }

  if (action.type === "DELETE") {
    const webhookId = action.payload;
    const index = state.findIndex(item => item.id === webhookId);
    if (index !== -1) {
      state.splice(index, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Integrations = ({ embedded = false }) => {
  const classes = useStyles();

  const [integrations, dispatchIntegrations] = useReducer(integrationReducer, []);
  const [webhooks, dispatchWebhooks] = useReducer(webhookReducer, []);

  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);

  const [integrationSearch, setIntegrationSearch] = useState("");
  const [webhookSearch, setWebhookSearch] = useState("");

  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [confirmIntegrationOpen, setConfirmIntegrationOpen] = useState(false);
  const [confirmWebhookOpen, setConfirmWebhookOpen] = useState(false);

  useEffect(() => {
    dispatchIntegrations({ type: "RESET" });
  }, [integrationSearch]);

  useEffect(() => {
    dispatchWebhooks({ type: "RESET" });
  }, [webhookSearch]);

  useEffect(() => {
    (async () => {
      setLoadingIntegrations(true);
      try {
        const { data } = await api.get("/integrations", {
          params: { searchParam: integrationSearch }
        });
        dispatchIntegrations({ type: "LOAD", payload: data });
        setLoadingIntegrations(false);
      } catch (err) {
        toastError(err);
        setLoadingIntegrations(false);
      }
    })();
  }, [integrationSearch]);

  useEffect(() => {
    (async () => {
      setLoadingWebhooks(true);
      try {
        const { data } = await api.get("/webhooks", {
          params: { searchParam: webhookSearch }
        });
        dispatchWebhooks({ type: "LOAD", payload: data });
        setLoadingWebhooks(false);
      } catch (err) {
        toastError(err);
        setLoadingWebhooks(false);
      }
    })();
  }, [webhookSearch]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("integration", data => {
      if (data.action === "update" || data.action === "create") {
        dispatchIntegrations({ type: "UPDATE", payload: data.integration });
      }

      if (data.action === "delete") {
        dispatchIntegrations({ type: "DELETE", payload: +data.integrationId });
      }
    });

    socket.on("webhook", data => {
      if (data.action === "update" || data.action === "create") {
        dispatchWebhooks({ type: "UPDATE", payload: data.webhook });
      }

      if (data.action === "delete") {
        dispatchWebhooks({ type: "DELETE", payload: +data.webhookId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenIntegrationModal = () => {
    setIntegrationModalOpen(true);
    setSelectedIntegration(null);
  };

  const handleCloseIntegrationModal = () => {
    setIntegrationModalOpen(false);
    setSelectedIntegration(null);
  };

  const handleOpenWebhookModal = () => {
    setWebhookModalOpen(true);
    setSelectedWebhook(null);
  };

  const handleCloseWebhookModal = () => {
    setWebhookModalOpen(false);
    setSelectedWebhook(null);
  };

  const handleEditIntegration = integration => {
    setSelectedIntegration(integration);
    setIntegrationModalOpen(true);
  };

  const handleEditWebhook = webhook => {
    setSelectedWebhook(webhook);
    setWebhookModalOpen(true);
  };

  const handleOpenLogs = webhook => {
    setSelectedWebhook(webhook);
    setLogsModalOpen(true);
  };

  const handleCloseLogs = () => {
    setLogsModalOpen(false);
    setSelectedWebhook(null);
  };

  const handleDeleteIntegration = async integrationId => {
    try {
      await api.delete(`/integrations/${integrationId}`);
      toast.success(i18n.t("integrations.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedIntegration(null);
  };

  const handleDeleteWebhook = async webhookId => {
    try {
      await api.delete(`/webhooks/${webhookId}`);
      toast.success(i18n.t("webhooks.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedWebhook(null);
  };

  const handleTestWebhook = async webhookId => {
    try {
      await api.post(`/webhooks/${webhookId}/test`);
      toast.success(i18n.t("webhooks.toasts.tested"));
    } catch (err) {
      toastError(err);
    }
  };

  const renderEvents = events => {
    if (!events || events.length === 0) {
      return "-";
    }

    return events
      .map(eventName => i18n.t(`webhookEvents.${eventName}`, eventName))
      .join(", ");
  };

  const content = (
    <>
      <ConfirmationModal
        title={
          selectedIntegration &&
          `${i18n.t("integrations.confirmationModal.deleteTitle")} ${selectedIntegration.name}?`
        }
        open={confirmIntegrationOpen}
        onClose={() => setConfirmIntegrationOpen(false)}
        onConfirm={() => handleDeleteIntegration(selectedIntegration.id)}
      >
        {i18n.t("integrations.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ConfirmationModal
        title={
          selectedWebhook &&
          `${i18n.t("webhooks.confirmationModal.deleteTitle")} ${selectedWebhook.name}?`
        }
        open={confirmWebhookOpen}
        onClose={() => setConfirmWebhookOpen(false)}
        onConfirm={() => handleDeleteWebhook(selectedWebhook.id)}
      >
        {i18n.t("webhooks.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <IntegrationModal
        open={integrationModalOpen}
        onClose={handleCloseIntegrationModal}
        integrationId={selectedIntegration?.id}
      />
      <WebhookModal
        open={webhookModalOpen}
        onClose={handleCloseWebhookModal}
        webhookId={selectedWebhook?.id}
      />
      <WebhookLogsModal
        open={logsModalOpen}
        onClose={handleCloseLogs}
        webhookId={selectedWebhook?.id}
      />
      {!embedded && (
        <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("integrations.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("integrations.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            className={classes.searchField}
            placeholder={i18n.t("integrations.searchPlaceholder")}
            type="search"
            value={integrationSearch}
            onChange={event => setIntegrationSearch(event.target.value.toLowerCase())}
            InputProps={{
              classes: { root: classes.searchInputRoot },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
          <Button variant="contained" color="primary" className={classes.actionButton} onClick={handleOpenIntegrationModal}>
            {i18n.t("integrations.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
        </MainHeader>
      )}
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("integrations.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("integrations.table.type")}</TableCell>
              <TableCell align="center">{i18n.t("integrations.table.status")}</TableCell>
              <TableCell align="center">{i18n.t("integrations.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {integrations.map(integration => (
                <TableRow key={integration.id}>
                  <TableCell align="center">{integration.name}</TableCell>
                  <TableCell align="center">
                    {i18n.t(`integrationModal.type.${integration.type || "custom"}`)}
                  </TableCell>
                  <TableCell align="center">
                    {integration.isActive
                      ? i18n.t("integrations.table.active")
                      : i18n.t("integrations.table.inactive")}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEditIntegration(integration)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedIntegration(integration);
                        setConfirmIntegrationOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loadingIntegrations && <TableRowSkeleton columns={4} />}
            </>
          </TableBody>
        </Table>
      </Paper>

      <div className={classes.spacer} />

      {!embedded && (
        <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("webhooks.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("webhooks.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            className={classes.searchField}
            placeholder={i18n.t("webhooks.searchPlaceholder")}
            type="search"
            value={webhookSearch}
            onChange={event => setWebhookSearch(event.target.value.toLowerCase())}
            InputProps={{
              classes: { root: classes.searchInputRoot },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
          <Button variant="contained" color="primary" className={classes.actionButton} onClick={handleOpenWebhookModal}>
            {i18n.t("webhooks.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
        </MainHeader>
      )}
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("webhooks.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("webhooks.table.url")}</TableCell>
              <TableCell align="center">{i18n.t("webhooks.table.events")}</TableCell>
              <TableCell align="center">{i18n.t("webhooks.table.status")}</TableCell>
              <TableCell align="center">{i18n.t("webhooks.table.lastTestAt")}</TableCell>
              <TableCell align="center">{i18n.t("webhooks.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {webhooks.map(webhook => (
                <TableRow key={webhook.id}>
                  <TableCell align="center">{webhook.name}</TableCell>
                  <TableCell align="center" className={classes.urlCell}>
                    {webhook.url}
                  </TableCell>
                  <TableCell align="center" className={classes.eventsCell}>
                    {renderEvents(webhook.events)}
                  </TableCell>
                  <TableCell align="center">
                    {webhook.isActive
                      ? i18n.t("webhooks.table.active")
                      : i18n.t("webhooks.table.inactive")}
                  </TableCell>
                  <TableCell align="center">
                    {webhook.lastTestAt
                      ? new Date(webhook.lastTestAt).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEditWebhook(webhook)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleTestWebhook(webhook.id)}>
                      <PlayArrow />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenLogs(webhook)}>
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedWebhook(webhook);
                        setConfirmWebhookOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loadingWebhooks && <TableRowSkeleton columns={6} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </>
  );

  if (embedded) {
    return <div className={classes.embeddedRoot}>{content}</div>;
  }

  return <MainContainer>{content}</MainContainer>;
};

export default Integrations;
