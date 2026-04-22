import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import IntegrationSelect from "../IntegrationSelect";

const WebhookSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(80, "Too Long!").required("Required"),
  url: Yup.string().url("Invalid URL").required("Required")
});

const WebhookModal = ({ open, onClose, webhookId }) => {
  const isMounted = useRef(true);

  const initialState = {
    name: "",
    url: "",
    method: "POST",
    events: [],
    integrationId: null,
    isActive: true,
    secret: ""
  };

  const [webhook, setWebhook] = useState(initialState);
  const [eventOptions, setEventOptions] = useState([]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await api.get("/webhooks/events");
        setEventOptions(data || []);
      } catch (err) {
        toastError(err);
      }
    };

    if (open) {
      fetchEvents();
    }
  }, [open]);

  useEffect(() => {
    const fetchWebhook = async () => {
      if (!webhookId) {
        setWebhook(initialState);
        return;
      }

      try {
        const { data } = await api.get(`/webhooks/${webhookId}`);
        if (isMounted.current) {
          setWebhook({
            name: data.name || "",
            url: data.url || "",
            method: data.method || "POST",
            events: data.events || [],
            integrationId: data.integrationId || null,
            isActive: data.isActive !== false,
            secret: data.secret || ""
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchWebhook();
  }, [webhookId, open]);

  const handleClose = () => {
    onClose();
    setWebhook(initialState);
  };

  const handleSaveWebhook = async values => {
    const payload = {
      name: values.name,
      url: values.url,
      method: values.method,
      events: values.events,
      integrationId: values.integrationId,
      isActive: values.isActive
    };

    try {
      if (webhookId) {
        await api.put(`/webhooks/${webhookId}`, payload);
      } else {
        await api.post("/webhooks", payload);
      }
      toast.success(i18n.t("webhookModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const renderEventLabel = eventName => {
    return i18n.t(`webhookEvents.${eventName}`, eventName);
  };


  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {webhookId
          ? `${i18n.t("webhookModal.title.edit")}`
          : `${i18n.t("webhookModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={webhook}
        enableReinitialize
        validationSchema={WebhookSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveWebhook(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("webhookModal.form.name")}
                name="name"
                fullWidth
                autoFocus
                error={touched.name && Boolean(errors.name)}
                helperText={
                  touched.name && errors.name
                    ? errors.name
                    : i18n.t("webhookModal.form.nameHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <Field
                as={TextField}
                label={i18n.t("webhookModal.form.url")}
                name="url"
                fullWidth
                error={touched.url && Boolean(errors.url)}
                helperText={
                  touched.url && errors.url
                    ? errors.url
                    : i18n.t("webhookModal.form.urlHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("webhookModal.form.method")}</InputLabel>
                <Select
                  value={values.method}
                  onChange={event => setFieldValue("method", event.target.value)}
                  label={i18n.t("webhookModal.form.method")}
                >
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                </Select>
              </FormControl>
              <IntegrationSelect
                selectedIntegrationId={values.integrationId}
                onChange={id => setFieldValue("integrationId", id)}
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("webhookModal.form.events")}</InputLabel>
                <Select
                  multiple
                  value={values.events || []}
                  onChange={event => setFieldValue("events", event.target.value)}
                  label={i18n.t("webhookModal.form.events")}
                  renderValue={selected =>
                    (selected || []).map(renderEventLabel).join(", ")
                  }
                >
                  {eventOptions.map(eventName => (
                    <MenuItem key={eventName} value={eventName}>
                      <Checkbox checked={values.events?.includes(eventName)} />
                      <ListItemText primary={renderEventLabel(eventName)} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                    ? i18n.t("webhookModal.form.active")
                    : i18n.t("webhookModal.form.inactive")
                }
                style={{ marginTop: 8 }}
              />
              {values.secret ? (
                <>
                  <Typography variant="subtitle1" gutterBottom style={{ marginTop: 12 }}>
                    {i18n.t("webhookModal.form.secret")}
                  </Typography>
                  <TextField
                    value={values.secret}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="secondary" variant="outlined">
                {i18n.t("webhookModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {webhookId
                  ? `${i18n.t("webhookModal.buttons.okEdit")}`
                  : `${i18n.t("webhookModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default WebhookModal;
