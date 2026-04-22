import React, { useEffect, useMemo, useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const escapeRegExp = value => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const DialogPreviewModal = ({ open, onClose, dialogId }) => {
  const [dialog, setDialog] = useState(null);
  const [values, setValues] = useState({});

  useEffect(() => {
    const fetchDialog = async () => {
      if (!dialogId || !open) {
        setDialog(null);
        setValues({});
        return;
      }

      try {
        const { data } = await api.get(`/dialogs/${dialogId}`);
        setDialog(data);
        const initialValues = {};
        (data.variables || []).forEach(variable => {
          if (variable.key) {
            initialValues[variable.key] = variable.example || "";
          }
        });
        setValues(initialValues);
      } catch (err) {
        toastError(err);
      }
    };

    fetchDialog();
  }, [dialogId, open]);

  const previewContent = useMemo(() => {
    if (!dialog) {
      return "";
    }

    let content = dialog.content || "";
    const variables = dialog.variables || [];

    variables.forEach(variable => {
      if (!variable.key) {
        return;
      }

      const value = values[variable.key] || variable.example || "";
      const pattern = new RegExp(`{{\\s*${escapeRegExp(variable.key)}\\s*}}`, "g");
      content = content.replace(pattern, value);
    });

    return content;
  }, [dialog, values]);

  const handleVariableChange = (key, value) => {
    setValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{i18n.t("dialogPreview.title")}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>
          {i18n.t("dialogPreview.variables")}
        </Typography>
        {dialog && dialog.variables && dialog.variables.length > 0 ? (
          dialog.variables.map(variable => (
            <TextField
              key={variable.key}
              label={variable.label || variable.key}
              value={values[variable.key] || ""}
              onChange={event => handleVariableChange(variable.key, event.target.value)}
              variant="outlined"
              margin="dense"
              fullWidth
            />
          ))
        ) : (
          <Typography color="textSecondary">
            {i18n.t("dialogPreview.noVariables")}
          </Typography>
        )}
        <Typography variant="subtitle1" gutterBottom style={{ marginTop: 16 }}>
          {i18n.t("dialogPreview.preview")}
        </Typography>
        <Paper variant="outlined" style={{ padding: 12, whiteSpace: "pre-wrap" }}>
          {previewContent || "-"}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="outlined">
          {i18n.t("dialogPreview.buttons.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogPreviewModal;
