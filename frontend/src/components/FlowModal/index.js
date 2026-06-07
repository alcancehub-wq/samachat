import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import useWhatsApps from "../../hooks/useWhatsApps";

const FlowSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(120, "Too Long!").required("Required"),
  whatsappId: Yup.string().required("Required")
});

const formatWhatsappOption = whatsapp => {
  const name = whatsapp?.name || `#${whatsapp?.id}`;
  const linkedUser = Array.isArray(whatsapp?.users) && whatsapp.users.length > 0
    ? whatsapp.users[0]?.name
    : null;
  const phoneNumber = whatsapp?.phoneNumber || null;

  return [
    name,
    linkedUser ? `${i18n.t("flowModal.form.whatsappUserLabel")}: ${linkedUser}` : null,
    phoneNumber
  ]
    .filter(Boolean)
    .join(" — ");
};

const FlowModal = ({ open, onClose, flowId, onSaved }) => {
  const isMounted = useRef(true);
  const { loading: loadingWhatsApps, whatsApps } = useWhatsApps();

  const initialState = {
    name: "",
    description: "",
    isActive: true,
    whatsappId: ""
  };

  const [flow, setFlow] = useState(initialState);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchFlow = async () => {
      if (!open) {
        return;
      }

      if (!flowId) {
        setFlow({ ...initialState });
        return;
      }

      try {
        const { data } = await api.get(`/flows/${flowId}`);

        if (isMounted.current) {
          setFlow({
            name: data.name || "",
            description: data.description || "",
            isActive: data.isActive !== undefined ? data.isActive : true,
            whatsappId: data.whatsappId ? String(data.whatsappId) : ""
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchFlow();
  }, [flowId, open]);

  const handleClose = () => {
    onClose();
    setFlow(initialState);
  };

  const handleSaveFlow = async values => {
    try {
      const payload = {
        ...values,
        whatsappId: values.whatsappId ? Number(values.whatsappId) : null
      };

      let savedFlow;

      if (flowId) {
        const { data } = await api.put(`/flows/${flowId}`, payload);
        savedFlow = data;
      } else {
        const { data } = await api.post("/flows", payload);
        savedFlow = data;
      }

      if (savedFlow?.id) {
        const { data } = await api.get(`/flows/${savedFlow.id}`);
        onSaved?.(data);
      }

      toast.success(i18n.t("flowModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {flowId
          ? `${i18n.t("flowModal.title.edit")}`
          : `${i18n.t("flowModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={flow}
        enableReinitialize
        validationSchema={FlowSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveFlow(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ touched, errors, isSubmitting, values, setFieldValue }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("flowModal.form.name")}
                name="name"
                fullWidth
                autoFocus
                variant="outlined"
                margin="dense"
                error={touched.name && Boolean(errors.name)}
                helperText={touched.name && errors.name ? errors.name : ""}
              />
              <Field
                as={TextField}
                label={i18n.t("flowModal.form.description")}
                name="description"
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                rows={3}
              />
              <FormControl
                variant="outlined"
                margin="dense"
                fullWidth
                error={touched.whatsappId && Boolean(errors.whatsappId)}
              >
                <InputLabel>{i18n.t("flowModal.form.whatsappId")}</InputLabel>
                <Field
                  as={Select}
                  name="whatsappId"
                  value={values.whatsappId}
                  label={i18n.t("flowModal.form.whatsappId")}
                  disabled={loadingWhatsApps}
                >
                  <MenuItem value="">
                    {loadingWhatsApps
                      ? i18n.t("flowModal.form.whatsappLoading")
                      : i18n.t("flowModal.form.whatsappPlaceholder")}
                  </MenuItem>
                  {whatsApps.map(whatsapp => (
                    <MenuItem key={whatsapp.id} value={String(whatsapp.id)}>
                      {formatWhatsappOption(whatsapp)}
                    </MenuItem>
                  ))}
                </Field>
                <FormHelperText>
                  {touched.whatsappId && errors.whatsappId
                    ? errors.whatsappId
                    : i18n.t("flowModal.form.whatsappHelper")}
                </FormHelperText>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={Boolean(values.isActive)}
                    onChange={event => setFieldValue("isActive", event.target.checked)}
                  />
                }
                label={i18n.t("flowModal.form.isActive")}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="secondary" variant="outlined">
                {i18n.t("flowModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {flowId
                  ? `${i18n.t("flowModal.buttons.okEdit")}`
                  : `${i18n.t("flowModal.buttons.okAdd")}`}
                {isSubmitting && <CircularProgress size={20} color="inherit" style={{ marginLeft: 8 }} />}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default FlowModal;
