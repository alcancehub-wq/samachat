import React, { useEffect, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const ColumnSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(60, "Too Long!").required("Required"),
  key: Yup.string().max(40, "Too Long!")
});

const KanbanColumnModal = ({ open, onClose, column }) => {
  const initialState = {
    name: "",
    key: "",
    isActive: true
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (!column) {
      setFormData(initialState);
      return;
    }

    setFormData({
      name: column.name || "",
      key: column.key || "",
      isActive: column.isActive !== false
    });
  }, [column, open]);

  const handleClose = () => {
    onClose();
    setFormData(initialState);
  };

  const handleSave = async values => {
    const payload = {
      name: values.name,
      key: values.key || undefined,
      isActive: values.isActive
    };

    try {
      if (column?.id) {
        await api.put(`/kanban/columns/${column.id}`, payload);
      } else {
        await api.post("/kanban/columns", payload);
      }
      toast.success(i18n.t("kanban.columnModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {column?.id
          ? `${i18n.t("kanban.columnModal.title.edit")}`
          : `${i18n.t("kanban.columnModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={formData}
        enableReinitialize
        validationSchema={ColumnSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSave(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("kanban.columnModal.form.name")}
                name="name"
                fullWidth
                autoFocus
                error={touched.name && Boolean(errors.name)}
                helperText={
                  touched.name && errors.name
                    ? errors.name
                    : i18n.t("kanban.columnModal.form.nameHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <Field
                as={TextField}
                label={i18n.t("kanban.columnModal.form.key")}
                name="key"
                fullWidth
                error={touched.key && Boolean(errors.key)}
                helperText={
                  touched.key && errors.key
                    ? errors.key
                    : i18n.t("kanban.columnModal.form.keyHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={values.isActive}
                    onChange={event =>
                      setFieldValue("isActive", event.target.checked)
                    }
                    color="primary"
                  />
                }
                label={
                  values.isActive
                    ? i18n.t("kanban.columnModal.form.active")
                    : i18n.t("kanban.columnModal.form.inactive")
                }
                style={{ marginTop: 8 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="secondary" variant="outlined">
                {i18n.t("kanban.columnModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {column?.id
                  ? `${i18n.t("kanban.columnModal.buttons.okEdit")}`
                  : `${i18n.t("kanban.columnModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default KanbanColumnModal;
