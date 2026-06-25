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
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Popover,
  Typography,
  IconButton
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";

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


const getDatePart = value => {
  if (!value || !value.includes("T")) {
    return "";
  }

  return value.split("T")[0];
};

const getTimePart = value => {
  if (!value || !value.includes("T")) {
    return "";
  }

  return value.split("T")[1] || "";
};

const joinDateTimeParts = (datePart, timePart) => {
  if (!datePart) {
    return "";
  }

  return datePart + "T" + (timePart || "00:00");
};

const toPayloadDateTime = value => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};


const padDateNumber = value => String(value).padStart(2, "0");

const getTodayInputDate = () => {
  const today = new Date();
  return today.getFullYear() + "-" + padDateNumber(today.getMonth() + 1) + "-" + padDateNumber(today.getDate());
};

const formatDateLabel = value => {
  const datePart = getDatePart(value);
  if (!datePart) {
    return "";
  }

  const [year, month, day] = datePart.split("-");
  return day + "/" + month + "/" + year;
};

const parseCalendarMonth = value => {
  const datePart = getDatePart(value);
  if (!datePart) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const [year, month] = datePart.split("-").map(Number);
  return new Date(year, month - 1, 1);
};

const buildCalendarDays = monthDate => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push({
      day,
      value: year + "-" + padDateNumber(month + 1) + "-" + padDateNumber(day)
    });
  }

  return days;
};

const monthNames = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
];

const dayNames = ["D", "S", "T", "Q", "Q", "S", "S"];

const redPickerButtonStyle = active => ({
  border: 0,
  borderRadius: 8,
  minWidth: 36,
  height: 36,
  cursor: "pointer",
  color: active ? "#fff" : "#111827",
  backgroundColor: active ? "#ff1f1f" : "transparent",
  fontWeight: active ? 800 : 500
});

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
  const [tickets, setTickets] = useState([]);
  const [ticketSearchParam, setTicketSearchParam] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dateAnchorEl, setDateAnchorEl] = useState(null);
  const [timeAnchorEl, setTimeAnchorEl] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

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
    const loadTickets = async () => {
      if (!open) {
        return;
      }

      try {
        const { data } = await api.get("/tickets", {
          params: {
            searchParam: ticketSearchParam,
            pageNumber: 1,
            status: ["open", "pending"]
          }
        });

        if (isMounted.current) {
          setTickets(data.tickets || []);
        }
      } catch (err) {
        toastError(err);
      }
    };

    loadTickets();
  }, [open, ticketSearchParam]);

  useEffect(() => {
    const fetchTask = async () => {
      if (!open) {
        return;
      }

      if (!taskId) {
        const nextTask = { ...initialState, ...(initialValues || {}) };
        setTask(nextTask);

        if (nextTask.ticketId) {
          try {
            const { data } = await api.get(`/tickets/${nextTask.ticketId}`);
            if (isMounted.current) {
              setSelectedTicket(data);
            }
          } catch (err) {
            setSelectedTicket(null);
          }
        } else {
          setSelectedTicket(null);
        }

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

          setSelectedTicket(data.ticket || null);
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
    setTickets([]);
    setTicketSearchParam("");
    setSelectedTicket(null);
  };

  const normalizeId = value => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const getTicketLabel = ticket => {
    if (!ticket) {
      return "";
    }

    const contactName = ticket.contact?.name || ticket.contact?.number || "Contato";
    const contactNumber = ticket.contact?.number ? ` - ${ticket.contact.number}` : "";
    const ticketIdLabel = ticket.id ? `#${ticket.id}` : "";
    const status = ticket.status ? ` - ${ticket.status}` : "";

    return `${contactName}${contactNumber} ${ticketIdLabel}${status}`.trim();
  };

  const handleSaveTask = async values => {
    const payload = {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      dueAt: toPayloadDateTime(values.dueAt),
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

      window.dispatchEvent(
        new CustomEvent("samachat:task-updated", {
          detail: {
            ticketId: payload.ticketId,
            contactId: payload.contactId
          }
        })
      );

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

              <div style={{ display: "flex", gap: 12, marginTop: 8, marginBottom: 4 }}>
                <TextField
                  label="Data de vencimento"
                  variant="outlined"
                  margin="dense"
                  value={formatDateLabel(values.dueAt)}
                  onClick={event => {
                    setCalendarMonth(parseCalendarMonth(values.dueAt));
                    setDateAnchorEl(event.currentTarget);
                  }}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ readOnly: true }}
                  style={{ flex: 1, cursor: "pointer" }}
                />

                <TextField
                  label="Hora"
                  variant="outlined"
                  margin="dense"
                  value={getTimePart(values.dueAt)}
                  onClick={event => setTimeAnchorEl(event.currentTarget)}
                  onChange={event => {
                    const nextTime = event.target.value;
                    if (/^\d{0,2}:?\d{0,2}$/.test(nextTime)) {
                      setFieldValue(
                        "dueAt",
                        joinDateTimeParts(getDatePart(values.dueAt) || getTodayInputDate(), nextTime)
                      );
                    }
                  }}
                  InputLabelProps={{ shrink: true }}
                  style={{ width: 150 }}
                />

                <Popover
                  open={Boolean(dateAnchorEl)}
                  anchorEl={dateAnchorEl}
                  onClose={() => setDateAnchorEl(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                >
                  <div style={{ width: 292, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <Typography style={{ fontWeight: 800, color: "#111827" }}>
                        {monthNames[calendarMonth.getMonth()]} de {calendarMonth.getFullYear()}
                      </Typography>
                      <div>
                        <IconButton
                          size="small"
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        >
                          ↑
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        >
                          ↓
                        </IconButton>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
                      {dayNames.map((dayName, index) => (
                        <div key={dayName + index} style={{ textAlign: "center", fontWeight: 700, fontSize: 13 }}>
                          {dayName}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                      {buildCalendarDays(calendarMonth).map((day, index) => {
                        const selected = day && getDatePart(values.dueAt) === day.value;

                        return day ? (
                          <button
                            key={day.value}
                            type="button"
                            style={redPickerButtonStyle(selected)}
                            onClick={() => {
                              setFieldValue(
                                "dueAt",
                                joinDateTimeParts(day.value, getTimePart(values.dueAt))
                              );
                              setDateAnchorEl(null);
                            }}
                          >
                            {day.day}
                          </button>
                        ) : (
                          <span key={"empty-" + index} />
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                      <Button
                        size="small"
                        style={{ color: "#ff1f1f", fontWeight: 700 }}
                        onClick={() => {
                          setFieldValue("dueAt", "");
                          setDateAnchorEl(null);
                        }}
                      >
                        Limpar
                      </Button>
                      <Button
                        size="small"
                        style={{ color: "#ff1f1f", fontWeight: 700 }}
                        onClick={() => {
                          setFieldValue(
                            "dueAt",
                            joinDateTimeParts(getTodayInputDate(), getTimePart(values.dueAt))
                          );
                          setCalendarMonth(parseCalendarMonth(getTodayInputDate() + "T00:00"));
                          setDateAnchorEl(null);
                        }}
                      >
                        Hoje
                      </Button>
                    </div>
                  </div>
                </Popover>

                <Popover
                  open={Boolean(timeAnchorEl)}
                  anchorEl={timeAnchorEl}
                  onClose={() => setTimeAnchorEl(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                >
                  <div style={{ display: "flex", gap: 8, padding: 10, maxHeight: 280 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 48px)", gap: 6 }}>
                      {Array.from({ length: 24 }, (_, hour) => padDateNumber(hour)).map(hour => {
                        const selectedHour = (getTimePart(values.dueAt) || "").split(":")[0] === hour;

                        return (
                          <button
                            key={hour}
                            type="button"
                            style={redPickerButtonStyle(selectedHour)}
                            onClick={() => {
                              const currentMinute = (getTimePart(values.dueAt) || "00:00").split(":")[1] || "00";
                              setFieldValue(
                                "dueAt",
                                joinDateTimeParts(getDatePart(values.dueAt) || getTodayInputDate(), hour + ":" + currentMinute)
                              );
                            }}
                          >
                            {hour}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ maxHeight: 260, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(2, 48px)", gap: 6 }}>
                      {Array.from({ length: 60 }, (_, minute) => padDateNumber(minute)).map(minute => {
                        const selectedMinute = (getTimePart(values.dueAt) || "").split(":")[1] === minute;

                        return (
                          <button
                            key={minute}
                            type="button"
                            style={redPickerButtonStyle(selectedMinute)}
                            onClick={() => {
                              const currentHour = (getTimePart(values.dueAt) || "00:00").split(":")[0] || "00";
                              setFieldValue(
                                "dueAt",
                                joinDateTimeParts(getDatePart(values.dueAt) || getTodayInputDate(), currentHour + ":" + minute)
                              );
                              setTimeAnchorEl(null);
                            }}
                          >
                            {minute}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Popover>
              </div>

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

              <Autocomplete
                options={tickets}
                value={selectedTicket}
                getOptionLabel={getTicketLabel}
                getOptionSelected={(option, value) => option.id === value.id}
                onInputChange={(event, newInputValue) => {
                  setTicketSearchParam(newInputValue);
                }}
                onChange={(event, newValue) => {
                  setSelectedTicket(newValue);
                  setFieldValue("ticketId", newValue?.id || "");
                  setFieldValue(
                    "contactId",
                    newValue?.contactId || newValue?.contact?.id || ""
                  );
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Cliente / atendimento"
                    fullWidth
                    variant="outlined"
                    margin="dense"
                  />
                )}
              />
              <FormHelperText>
                Pesquise em atendimentos abertos e pendentes visíveis para você.
              </FormHelperText>
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
