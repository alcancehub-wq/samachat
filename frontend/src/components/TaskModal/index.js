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
  TextField
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const TaskSchema = Yup.object().shape({
  title: Yup.string().min(2, "Too Short!").max(120, "Too Long!").required("Required")
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

const TaskModal = ({ open, onClose, taskId, initialValues }) => {
  const isMounted = useRef(true);

  const initialState = {
    title: "",
    description: "",
    status: "open",
    priority: "medium",
    dueAt: "",
    assigneeId: "",
    ticketId: "",
    contactId: ""
  };

  const [task, setTask] = useState(initialState);
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
    const fetchTask = async () => {
      if (!open) {
        return;
      }

      if (!taskId) {
        setTask({ ...initialState, ...(initialValues || {}) });
        return;
      }

      try {
        const { data } = await api.get(`/tasks/${taskId}`);

        if (isMounted.current) {
          setTask({
            title: data.title || "",
            description: data.description || "",
            status: data.status || "open",
            priority: data.priority || "medium",
            dueAt: toInputDateTime(data.dueAt),
            assigneeId: data.assigneeId || "",
            ticketId: data.ticketId || "",
            contactId: data.contactId || ""
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchTask();
  }, [taskId, open, initialValues]);

  const handleClose = () => {
    onClose();
    setTask(initialState);
  };

  const normalizeId = value => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSaveTask = async values => {
    const payload = {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      dueAt: values.dueAt || null,
      assigneeId: normalizeId(values.assigneeId),
      ticketId: normalizeId(values.ticketId),
      contactId: normalizeId(values.contactId)
    };

    try {
      if (taskId) {
        await api.put(`/tasks/${taskId}`, payload);
      } else {
        await api.post("/tasks", payload);
      }

      toast.success(i18n.t("taskModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {taskId
          ? `${i18n.t("taskModal.title.edit")}`
          : `${i18n.t("taskModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={task}
        enableReinitialize
        validationSchema={TaskSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveTask(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("taskModal.form.title")}
                name="title"
                fullWidth
                autoFocus
                variant="outlined"
                margin="dense"
                error={touched.title && Boolean(errors.title)}
                helperText={touched.title && errors.title ? errors.title : ""}
              />
              <Field
                as={TextField}
                label={i18n.t("taskModal.form.description")}
                name="description"
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                rows={3}
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("taskModal.form.status")}</InputLabel>
                <Select
                  value={values.status}
                  onChange={event => setFieldValue("status", event.target.value)}
                  label={i18n.t("taskModal.form.status")}
                >
                  <MenuItem value="open">
                    {i18n.t("tasks.status.open")}
                  </MenuItem>
                  <MenuItem value="completed">
                    {i18n.t("tasks.status.completed")}
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("taskModal.form.priority")}</InputLabel>
                <Select
                  value={values.priority}
                  onChange={event => setFieldValue("priority", event.target.value)}
                  label={i18n.t("taskModal.form.priority")}
                >
                  <MenuItem value="low">
                    {i18n.t("tasks.priority.low")}
                  </MenuItem>
                  <MenuItem value="medium">
                    {i18n.t("tasks.priority.medium")}
                  </MenuItem>
                  <MenuItem value="high">
                    {i18n.t("tasks.priority.high")}
                  </MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={i18n.t("taskModal.form.dueAt")}
                type="datetime-local"
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.dueAt || ""}
                onChange={event => setFieldValue("dueAt", event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{i18n.t("taskModal.form.assignee")}</InputLabel>
                <Select
                  value={values.assigneeId}
                  onChange={event => setFieldValue("assigneeId", event.target.value)}
                  label={i18n.t("taskModal.form.assignee")}
                >
                  <MenuItem value="">
                    {i18n.t("taskModal.form.assigneePlaceholder")}
                  </MenuItem>
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label={i18n.t("taskModal.form.ticketId")}
                type="number"
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.ticketId}
                onChange={event => setFieldValue("ticketId", event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={i18n.t("taskModal.form.contactId")}
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
                {i18n.t("taskModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {taskId
                  ? `${i18n.t("taskModal.buttons.okEdit")}`
                  : `${i18n.t("taskModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default TaskModal;
