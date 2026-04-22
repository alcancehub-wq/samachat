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
import TagSelect from "../TagSelect";
import ContactListSelect from "../ContactListSelect";

const InformativeSchema = Yup.object().shape({
  title: Yup.string().min(2, "Too Short!").max(120, "Too Long!").required("Required"),
  content: Yup.string().required("Required")
});

const toInputDateTime = value => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = number => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const InformativeModal = ({ open, onClose, informativeId }) => {
  const isMounted = useRef(true);

  const initialState = {
    title: "",
    content: "",
    isActive: true,
    audience: "all",
    contactListId: null,
    tagIds: [],
    startsAt: "",
    endsAt: ""
  };

  const [informative, setInformative] = useState(initialState);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchInformative = async () => {
      if (!informativeId) {
        setInformative(initialState);
        return;
      }

      try {
        const { data } = await api.get(`/informatives/${informativeId}`);
        if (isMounted.current) {
          setInformative({
            title: data.title || "",
            content: data.content || "",
            isActive: data.isActive !== false,
            audience: data.audience || "all",
            contactListId: data.contactListId || null,
            tagIds: data.tagIds || [],
            startsAt: toInputDateTime(data.startsAt),
            endsAt: toInputDateTime(data.endsAt)
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchInformative();
  }, [informativeId, open]);

  const handleClose = () => {
    onClose();
    setInformative(initialState);
  };

  const handleSaveInformative = async values => {
    const payload = {
      title: values.title,
      content: values.content,
      isActive: values.isActive,
      audience: values.audience,
      contactListId:
        values.audience === "contactList" ? values.contactListId : null,
      tagIds: values.audience === "tags" ? values.tagIds : [],
      startsAt: values.startsAt || null,
      endsAt: values.endsAt || null
    };

    try {
      if (informativeId) {
        await api.put(`/informatives/${informativeId}`, payload);
      } else {
        await api.post("/informatives", payload);
      }
      toast.success(i18n.t("informativeModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {informativeId
          ? `${i18n.t("informativeModal.title.edit")}`
          : `${i18n.t("informativeModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={informative}
        enableReinitialize
        validationSchema={InformativeSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveInformative(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("informativeModal.form.title")}
                name="title"
                fullWidth
                autoFocus
                error={touched.title && Boolean(errors.title)}
                helperText={
                  touched.title && errors.title
                    ? errors.title
                    : i18n.t("informativeModal.form.titleHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <Field
                as={TextField}
                label={i18n.t("informativeModal.form.content")}
                name="content"
                fullWidth
                error={touched.content && Boolean(errors.content)}
                helperText={
                  touched.content && errors.content
                    ? errors.content
                    : i18n.t("informativeModal.form.contentHelper")
                }
                variant="outlined"
                margin="dense"
                multiline
                rows={5}
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
                    ? i18n.t("informativeModal.form.active")
                    : i18n.t("informativeModal.form.inactive")
                }
                style={{ marginTop: 8 }}
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("informativeModal.form.audience")}</InputLabel>
                <Select
                  value={values.audience}
                  onChange={event =>
                    setFieldValue("audience", event.target.value)
                  }
                  label={i18n.t("informativeModal.form.audience")}
                >
                  <MenuItem value="all">
                    {i18n.t("informativeModal.audience.all")}
                  </MenuItem>
                  <MenuItem value="contactList">
                    {i18n.t("informativeModal.audience.contactList")}
                  </MenuItem>
                  <MenuItem value="tags">
                    {i18n.t("informativeModal.audience.tags")}
                  </MenuItem>
                </Select>
              </FormControl>
              {values.audience === "contactList" && (
                <ContactListSelect
                  selectedListId={values.contactListId}
                  onChange={id => setFieldValue("contactListId", id)}
                  label={i18n.t("informativeModal.form.list")}
                />
              )}
              {values.audience === "tags" && (
                <>
                  <Typography variant="subtitle1" gutterBottom style={{ marginTop: 12 }}>
                    {i18n.t("informativeModal.form.tags")}
                  </Typography>
                  <TagSelect
                    selectedTagIds={values.tagIds || []}
                    onChange={ids => setFieldValue("tagIds", ids)}
                    label={i18n.t("informativeModal.form.tagsPlaceholder")}
                  />
                </>
              )}
              <TextField
                label={i18n.t("informativeModal.form.startsAt")}
                type="datetime-local"
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.startsAt || ""}
                onChange={event => setFieldValue("startsAt", event.target.value)}
                InputLabelProps={{
                  shrink: true
                }}
              />
              <TextField
                label={i18n.t("informativeModal.form.endsAt")}
                type="datetime-local"
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.endsAt || ""}
                onChange={event => setFieldValue("endsAt", event.target.value)}
                InputLabelProps={{
                  shrink: true
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="secondary" variant="outlined">
                {i18n.t("informativeModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {informativeId
                  ? `${i18n.t("informativeModal.buttons.okEdit")}`
                  : `${i18n.t("informativeModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default InformativeModal;
