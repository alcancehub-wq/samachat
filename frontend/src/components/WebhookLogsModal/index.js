import React, { useEffect, useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const formatDateTime = value => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

const WebhookLogsModal = ({ open, onClose, webhookId }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!open || !webhookId) {
        setLogs([]);
        return;
      }

      try {
        const { data } = await api.get(`/webhooks/${webhookId}/logs`);
        setLogs(data || []);
      } catch (err) {
        toastError(err);
      }
    };

    fetchLogs();
  }, [open, webhookId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{i18n.t("webhookLogs.title")}</DialogTitle>
      <DialogContent dividers>
        {logs.length === 0 ? (
          <Typography color="textSecondary">
            {i18n.t("webhookLogs.empty")}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t("webhookLogs.table.event")}</TableCell>
                <TableCell>{i18n.t("webhookLogs.table.status")}</TableCell>
                <TableCell>{i18n.t("webhookLogs.table.duration")}</TableCell>
                <TableCell>{i18n.t("webhookLogs.table.createdAt")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.event}</TableCell>
                  <TableCell>{log.statusCode || "-"}</TableCell>
                  <TableCell>
                    {log.durationMs ? `${log.durationMs}ms` : "-"}
                  </TableCell>
                  <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="outlined">
          {i18n.t("webhookLogs.buttons.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookLogsModal;
