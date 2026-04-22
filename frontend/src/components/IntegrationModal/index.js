import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const IntegrationSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(80, "Too Long!").required("Required")
});

const IntegrationModal = ({ open, onClose, integrationId }) => {
  const isMounted = useRef(true);

  const initialState = {
    name: "",
    type: "custom",
    description: "",
    isActive: true,
    apiKey: ""
  };

  const [integration, setIntegration] = useState(initialState);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchIntegration = async () => {
      if (!integrationId) {
        setIntegration(initialState);
        return;
      }

      try {
        const { data } = await api.get(`/integrations/${integrationId}`);
        if (isMounted.current) {
          setIntegration({
            name: data.name || "",
            type: data.type || "custom",
            description: data.description || "",
            isActive: data.isActive !== false,
            apiKey: data.apiKey || ""
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchIntegration();
  }, [integrationId, open]);

  const handleClose = () => {
    onClose();
    setIntegration(initialState);
  };

  const handleSaveIntegration = async values => {
    const payload = {
      name: values.name,
      type: values.type,
      description: values.description,
      isActive: values.isActive
    };

    try {
      if (integrationId) {
        await api.put(`/integrations/${integrationId}`, payload);
      } else {
        await api.post("/integrations", payload);
      }
      toast.success(i18n.t("integrationModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {integrationId
          ? `${i18n.t("integrationModal.title.edit")}`
          : `${i18n.t("integrationModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={integration}
        enableReinitialize
        validationSchema={IntegrationSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveIntegration(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("integrationModal.form.name")}
                name="name"
                fullWidth
                autoFocus
                error={touched.name && Boolean(errors.name)}
                helperText={
                  touched.name && errors.name
                    ? errors.name
                    : i18n.t("integrationModal.form.nameHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("integrationModal.form.type")}</InputLabel>
                <Select
                  value={values.type}
                  onChange={event => setFieldValue("type", event.target.value)}
                  label={i18n.t("integrationModal.form.type")}
                >
                  <MenuItem value="custom">
                    {i18n.t("integrationModal.type.custom")}
                  </MenuItem>
                  <MenuItem value="crm">
                    {i18n.t("integrationModal.type.crm")}
                  </MenuItem>
                  <MenuItem value="make">
                    {i18n.t("integrationModal.type.make")}
                  </MenuItem>
                </Select>
              </FormControl>
              <Field
                as={TextField}
                label={i18n.t("integrationModal.form.description")}
                name="description"
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                rows={3}
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
                    ? i18n.t("integrationModal.form.active")
                    : i18n.t("integrationModal.form.inactive")
                }
                style={{ marginTop: 8 }}
              />
              {values.apiKey ? (
                <>
                  <Typography variant="subtitle1" gutterBottom style={{ marginTop: 12 }}>
                    {i18n.t("integrationModal.form.apiKey")}
                  </Typography>
                  <TextField
                    value={values.apiKey}
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
                {i18n.t("integrationModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {integrationId
                  ? `${i18n.t("integrationModal.buttons.okEdit")}`
                  : `${i18n.t("integrationModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default IntegrationModal;
