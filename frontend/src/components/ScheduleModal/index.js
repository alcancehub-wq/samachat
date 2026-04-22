import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";

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
  TextField
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const ScheduleSchema = Yup.object().shape({
  body: Yup.string().min(2, "Too Short!").max(1000, "Too Long!").required("Required"),
  scheduledAt: Yup.string().required("Required")
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

const ScheduleModal = ({ open, onClose, scheduleId }) => {
  const isMounted = useRef(true);

  const initialState = {
    body: "",
    status: "pending",
    scheduledAt: "",
    assigneeId: "",
    ticketId: "",
    contactId: ""
  };

  const [schedule, setSchedule] = useState(initialState);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        let pageNumber = 1;
        let hasMore = true;
        const allUsers = [];

        while (hasMore) {
          const { data } = await api.get("/users", {
            params: { searchParam: "", pageNumber }
          });

          allUsers.push(...(data.users || []));
          hasMore = Boolean(data.hasMore);
          pageNumber += 1;

          if (!data.hasMore) {
            break;
          }
        }

        if (isMounted.current) {
          setUsers(allUsers);
        }
      } catch (err) {
        toastError(err);
      }
    };

    if (open) {
      loadUsers();
    }
  }, [open]);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!open) {
        return;
      }

      if (!scheduleId) {
        setSchedule({ ...initialState });
        return;
      }

      try {
        const { data } = await api.get(`/schedules/${scheduleId}`);

        if (isMounted.current) {
          setSchedule({
            body: data.body || "",
            status: data.status || "pending",
            scheduledAt: toInputDateTime(data.scheduledAt),
            assigneeId: data.assigneeId || "",
            ticketId: data.ticketId || "",
            contactId: data.contactId || ""
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchSchedule();
  }, [scheduleId, open]);

  const handleClose = () => {
    onClose();
    setSchedule(initialState);
  };

  const normalizeId = value => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSaveSchedule = async values => {
    const payload = {
      body: values.body,
      status: values.status,
      scheduledAt: values.scheduledAt,
      assigneeId: normalizeId(values.assigneeId),
      ticketId: normalizeId(values.ticketId),
      contactId: normalizeId(values.contactId)
    };

    try {
      if (scheduleId) {
        await api.put(`/schedules/${scheduleId}`, payload);
      } else {
        await api.post("/schedules", payload);
      }

      toast.success(i18n.t("scheduleModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {scheduleId
          ? `${i18n.t("scheduleModal.title.edit")}`
          : `${i18n.t("scheduleModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={schedule}
        enableReinitialize
        validationSchema={ScheduleSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveSchedule(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("scheduleModal.form.body")}
                name="body"
                fullWidth
                autoFocus
                variant="outlined"
                margin="dense"
                multiline
                rows={3}
                error={touched.body && Boolean(errors.body)}
                helperText={touched.body && errors.body ? errors.body : ""}
              />
              <TextField
                label={i18n.t("scheduleModal.form.scheduledAt")}
                type="datetime-local"
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.scheduledAt || ""}
                onChange={event => setFieldValue("scheduledAt", event.target.value)}
                InputLabelProps={{ shrink: true }}
                error={touched.scheduledAt && Boolean(errors.scheduledAt)}
                helperText={
                  touched.scheduledAt && errors.scheduledAt ? errors.scheduledAt : ""
                }
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("scheduleModal.form.status")}</InputLabel>
                <Select
                  value={values.status}
                  onChange={event => setFieldValue("status", event.target.value)}
                  label={i18n.t("scheduleModal.form.status")}
                >
                  <MenuItem value="pending">
                    {i18n.t("schedules.status.pending")}
                  </MenuItem>
                  <MenuItem value="sent">
                    {i18n.t("schedules.status.sent")}
                  </MenuItem>
                  <MenuItem value="canceled">
                    {i18n.t("schedules.status.canceled")}
                  </MenuItem>
                  <MenuItem value="failed">
                    {i18n.t("schedules.status.failed")}
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("scheduleModal.form.assignee")}</InputLabel>
                <Select
                  value={values.assigneeId}
                  onChange={event => setFieldValue("assigneeId", event.target.value)}
                  label={i18n.t("scheduleModal.form.assignee")}
                >
                  <MenuItem value="">
                    {i18n.t("scheduleModal.form.assigneePlaceholder")}
                  </MenuItem>
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label={i18n.t("scheduleModal.form.ticketId")}
                type="number"
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.ticketId}
                onChange={event => setFieldValue("ticketId", event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={i18n.t("scheduleModal.form.contactId")}
                type="number"
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.contactId}
                onChange={event => setFieldValue("contactId", event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="secondary" variant="outlined">
                {i18n.t("scheduleModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {scheduleId
                  ? `${i18n.t("scheduleModal.buttons.okEdit")}`
                  : `${i18n.t("scheduleModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default ScheduleModal;
