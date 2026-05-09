import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";

import { getBackendUrl } from "../../config";
import { i18n } from "../../translate/i18n";
import MessageVariablesHelper from "../MessageVariablesHelper";
import {
  appendMessageVariable,
  buildDialogSystemVariables
} from "../../utils/messageVariables";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  mediaSection: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    backgroundColor: "#fafafa"
  },
  mediaActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  mediaFileName: {
    marginTop: theme.spacing(1),
    fontWeight: 600
  },
  mediaHelper: {
    marginTop: theme.spacing(0.75),
    color: theme.palette.text.secondary,
    lineHeight: 1.5
  },
  hiddenInput: {
    display: "none"
  }
}));

const DialogSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(80, "Too Long!").required("Required")
});

const DialogModal = ({ open, onClose, dialogId }) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const mediaInputRef = useRef(null);

  const initialState = {
    name: "",
    description: "",
    content: "",
    isActive: true,
    mediaFileName: "",
    mediaOriginalName: "",
    mediaMimeType: "",
    variables: buildDialogSystemVariables()
  };

  const [dialog, setDialog] = useState(initialState);
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);
  const [removeMedia, setRemoveMedia] = useState(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchDialog = async () => {
      if (!dialogId) {
        setDialog(initialState);
        return;
      }

      try {
        const { data } = await api.get(`/dialogs/${dialogId}`);
        if (isMounted.current) {
          setDialog({
            name: data.name || "",
            description: data.description || "",
            content: data.content || "",
            isActive: data.isActive !== false,
            mediaFileName: data.mediaFileName || "",
            mediaOriginalName: data.mediaOriginalName || "",
            mediaMimeType: data.mediaMimeType || "",
            variables: buildDialogSystemVariables()
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchDialog();
  }, [dialogId, open]);

  const handleClose = () => {
    onClose();
    setDialog(initialState);
    setSelectedMediaFile(null);
    setRemoveMedia(false);
  };

  const buildDialogMediaUrl = fileName => {
    if (!fileName) {
      return "";
    }

    return `${getBackendUrl()}/public/${fileName}`;
  };

  const handleSelectMedia = () => {
    mediaInputRef.current?.click();
  };

  const handleMediaChange = event => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedMediaFile(file);
    setRemoveMedia(false);
    event.target.value = "";
  };

  const handleRemoveMedia = setFieldValue => {
    setSelectedMediaFile(null);
    setRemoveMedia(true);
    setFieldValue("mediaFileName", "");
    setFieldValue("mediaOriginalName", "");
    setFieldValue("mediaMimeType", "");
  };

  const handleSaveDialog = async values => {
    const trimmedContent = (values.content || "").trim();
    const hasExistingMedia = Boolean(values.mediaFileName) && !removeMedia;

    if (!trimmedContent && !selectedMediaFile && !hasExistingMedia) {
      toast.error(i18n.t("backendErrors.ERR_DIALOG_CONTENT_OR_MEDIA_REQUIRED"));
      return;
    }

    const payload = new FormData();
    payload.append("name", values.name);
    payload.append("description", values.description || "");
    payload.append("content", values.content || "");
    payload.append("isActive", String(values.isActive));
    payload.append(
      "variables",
      JSON.stringify(buildDialogSystemVariables())
    );
    payload.append("removeMedia", String(removeMedia));

    if (selectedMediaFile) {
      payload.append("media", selectedMediaFile);
    }

    try {
      if (dialogId) {
        await api.put(`/dialogs/${dialogId}`, payload);
      } else {
        await api.post("/dialogs", payload);
      }
      toast.success(i18n.t("dialogModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {dialogId
          ? `${i18n.t("dialogModal.title.edit")}`
          : `${i18n.t("dialogModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={dialog}
        enableReinitialize
        validationSchema={DialogSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveDialog(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <input
                ref={mediaInputRef}
                type="file"
                onChange={handleMediaChange}
                className={classes.hiddenInput}
              />
              <Field
                as={TextField}
                label={i18n.t("dialogModal.form.name")}
                name="name"
                fullWidth
                autoFocus
                error={touched.name && Boolean(errors.name)}
                helperText={
                  touched.name && errors.name
                    ? errors.name
                    : i18n.t("dialogModal.form.nameHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <Field
                as={TextField}
                label={i18n.t("dialogModal.form.description")}
                name="description"
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                rows={2}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={values.isActive}
                    onChange={event => setFieldValue("isActive", event.target.checked)}
                    color="primary"
                  />
                }
                label={
                  values.isActive
                    ? i18n.t("dialogModal.form.active")
                    : i18n.t("dialogModal.form.inactive")
                }
                style={{ marginTop: 8 }}
              />
              <Field
                as={TextField}
                label={i18n.t("dialogModal.form.template")}
                name="content"
                fullWidth
                error={touched.content && Boolean(errors.content)}
                helperText={
                  touched.content && errors.content
                    ? errors.content
                    : i18n.t("dialogModal.form.templateHelper")
                }
                variant="outlined"
                margin="dense"
                multiline
                rows={6}
              />
              <div className={classes.mediaSection}>
                <Typography variant="subtitle2">
                  {i18n.t("dialogModal.form.media")}
                </Typography>
                <Typography variant="body2" className={classes.mediaHelper}>
                  {i18n.t("dialogModal.form.mediaHelper")}
                </Typography>
                <div className={classes.mediaActions}>
                  <Button variant="outlined" color="primary" onClick={handleSelectMedia}>
                    {selectedMediaFile || values.mediaFileName
                      ? i18n.t("dialogModal.form.mediaReplace")
                      : i18n.t("dialogModal.form.mediaUpload")}
                  </Button>
                  {(selectedMediaFile || values.mediaFileName) && (
                    <Button
                      variant="text"
                      color="secondary"
                      onClick={() => handleRemoveMedia(setFieldValue)}
                    >
                      {i18n.t("dialogModal.form.mediaRemove")}
                    </Button>
                  )}
                  {!selectedMediaFile && values.mediaFileName && !removeMedia && (
                    <Button
                      component="a"
                      href={buildDialogMediaUrl(values.mediaFileName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="text"
                      color="primary"
                    >
                      {i18n.t("dialogModal.form.mediaPreview")}
                    </Button>
                  )}
                </div>
                {(selectedMediaFile || (values.mediaFileName && !removeMedia)) && (
                  <Typography variant="body2" className={classes.mediaFileName}>
                    {selectedMediaFile?.name || values.mediaOriginalName || values.mediaFileName}
                  </Typography>
                )}
              </div>
              <MessageVariablesHelper
                onInsertVariable={token => {
                  setFieldValue(
                    "content",
                    appendMessageVariable(values.content, token)
                  );
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleClose}
                color="secondary"
                disabled={isSubmitting}
                variant="outlined"
              >
                {i18n.t("dialogModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {dialogId
                  ? `${i18n.t("dialogModal.buttons.okEdit")}`
                  : `${i18n.t("dialogModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default DialogModal;
