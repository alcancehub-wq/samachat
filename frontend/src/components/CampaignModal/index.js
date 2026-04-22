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
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import TagSelect from "../TagSelect";
import DialogSelect from "../DialogSelect";
import ContactListSelect from "../ContactListSelect";

const CampaignSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(80, "Too Long!").required("Required")
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

const CampaignModal = ({ open, onClose, campaignId }) => {
  const isMounted = useRef(true);

  const initialState = {
    name: "",
    description: "",
    dialogId: null,
    contactListId: null,
    tagIds: [],
    status: "draft",
    scheduledAt: ""
  };

  const [campaign, setCampaign] = useState(initialState);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) {
        setCampaign(initialState);
        return;
      }

      try {
        const { data } = await api.get(`/campaigns/${campaignId}`);
        if (isMounted.current) {
          setCampaign({
            name: data.name || "",
            description: data.description || "",
            dialogId: data.dialogId || null,
            contactListId: data.contactListId || null,
            tagIds: data.tagIds || [],
            status: data.status || "draft",
            scheduledAt: toInputDateTime(data.scheduledAt)
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchCampaign();
  }, [campaignId, open]);

  const handleClose = () => {
    onClose();
    setCampaign(initialState);
  };

  const handleSaveCampaign = async values => {
    const payload = {
      name: values.name,
      description: values.description,
      dialogId: values.dialogId,
      contactListId: values.contactListId,
      tagIds: values.tagIds,
      status: values.status,
      scheduledAt: values.scheduledAt || null
    };

    try {
      if (campaignId) {
        await api.put(`/campaigns/${campaignId}`, payload);
      } else {
        await api.post("/campaigns", payload);
      }
      toast.success(i18n.t("campaignModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {campaignId
          ? `${i18n.t("campaignModal.title.edit")}`
          : `${i18n.t("campaignModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={campaign}
        enableReinitialize
        validationSchema={CampaignSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveCampaign(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("campaignModal.form.name")}
                name="name"
                fullWidth
                autoFocus
                error={touched.name && Boolean(errors.name)}
                helperText={
                  touched.name && errors.name
                    ? errors.name
                    : i18n.t("campaignModal.form.nameHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <Field
                as={TextField}
                label={i18n.t("campaignModal.form.description")}
                name="description"
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                rows={3}
              />
              <DialogSelect
                selectedDialogId={values.dialogId}
                onChange={id => setFieldValue("dialogId", id)}
              />
              <ContactListSelect
                selectedListId={values.contactListId}
                onChange={id => setFieldValue("contactListId", id)}
              />
              <Typography variant="subtitle1" gutterBottom style={{ marginTop: 12 }}>
                {i18n.t("campaignModal.form.tags")}
              </Typography>
              <TagSelect
                selectedTagIds={values.tagIds || []}
                onChange={ids => setFieldValue("tagIds", ids)}
                label={i18n.t("campaignModal.form.tagsPlaceholder")}
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("campaignModal.form.status")}</InputLabel>
                <Select
                  value={values.status}
                  onChange={event => setFieldValue("status", event.target.value)}
                  label={i18n.t("campaignModal.form.status")}
                >
                  <MenuItem value="draft">
                    {i18n.t("campaignModal.status.draft")}
                  </MenuItem>
                  <MenuItem value="scheduled">
                    {i18n.t("campaignModal.status.scheduled")}
                  </MenuItem>
                  <MenuItem value="paused">
                    {i18n.t("campaignModal.status.paused")}
                  </MenuItem>
                  <MenuItem value="completed">
                    {i18n.t("campaignModal.status.completed")}
                  </MenuItem>
                  <MenuItem value="canceled">
                    {i18n.t("campaignModal.status.canceled")}
                  </MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={i18n.t("campaignModal.form.scheduledAt")}
                type="datetime-local"
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.scheduledAt || ""}
                onChange={event => setFieldValue("scheduledAt", event.target.value)}
                InputLabelProps={{
                  shrink: true
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="secondary" variant="outlined">
                {i18n.t("campaignModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {campaignId
                  ? `${i18n.t("campaignModal.buttons.okEdit")}`
                  : `${i18n.t("campaignModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CampaignModal;
