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
  FormControlLabel,
  TextField
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const FlowSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(120, "Too Long!").required("Required")
});

const FlowModal = ({ open, onClose, flowId }) => {
  const isMounted = useRef(true);

  const initialState = {
    name: "",
    description: "",
    isActive: true
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
            isActive: data.isActive !== undefined ? data.isActive : true
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
      if (flowId) {
        await api.put(`/flows/${flowId}`, values);
      } else {
        await api.post("/flows", values);
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
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default FlowModal;
