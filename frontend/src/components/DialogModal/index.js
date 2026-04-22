import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, FieldArray, Field } from "formik";
import { toast } from "react-toastify";

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

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const DialogSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(80, "Too Long!").required("Required"),
  content: Yup.string().min(2, "Too Short!").required("Required")
});

const DialogModal = ({ open, onClose, dialogId }) => {
  const isMounted = useRef(true);

  const initialState = {
    name: "",
    description: "",
    content: "",
    isActive: true,
    variables: []
  };

  const [dialog, setDialog] = useState(initialState);

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
            variables: data.variables || []
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
  };

  const handleSaveDialog = async values => {
    const payload = {
      name: values.name,
      description: values.description,
      content: values.content,
      isActive: values.isActive,
      variables: values.variables
    };

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
              <Typography variant="subtitle1" gutterBottom style={{ marginTop: 12 }}>
                {i18n.t("dialogModal.form.variables")}
              </Typography>
              <FieldArray name="variables">
                {({ push, remove }) => (
                  <>
                    {values.variables && values.variables.length > 0 ? (
                      values.variables.map((variable, index) => (
                        <div
                          key={`${index}-variable`}
                          style={{ display: "flex", gap: 8, marginBottom: 8 }}
                        >
                          <Field
                            as={TextField}
                            label={i18n.t("dialogModal.form.variableKey")}
                            name={`variables[${index}].key`}
                            variant="outlined"
                            margin="dense"
                            style={{ flex: 1 }}
                          />
                          <Field
                            as={TextField}
                            label={i18n.t("dialogModal.form.variableLabel")}
                            name={`variables[${index}].label`}
                            variant="outlined"
                            margin="dense"
                            style={{ flex: 1 }}
                          />
                          <Field
                            as={TextField}
                            label={i18n.t("dialogModal.form.variableExample")}
                            name={`variables[${index}].example`}
                            variant="outlined"
                            margin="dense"
                            style={{ flex: 1 }}
                          />
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => remove(index)}
                            style={{ height: 40, marginTop: 8 }}
                          >
                            {i18n.t("dialogModal.form.removeVariable")}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <Typography color="textSecondary">
                        {i18n.t("dialogModal.form.noVariables")}
                      </Typography>
                    )}
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => push({ key: "", label: "", example: "" })}
                      style={{ marginTop: 8 }}
                    >
                      {i18n.t("dialogModal.form.addVariable")}
                    </Button>
                  </>
                )}
              </FieldArray>
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
