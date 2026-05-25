import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@material-ui/core";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import MessageVariablesHelper from "../MessageVariablesHelper";
import { appendMessageVariable } from "../../utils/messageVariables";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const BRAZIL_SCHEDULE_OFFSET = "-03:00";
const DATETIME_LOCAL_MINUTES = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATETIME_LOCAL_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const DATETIME_LOCAL_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}$/;
const DATETIME_HAS_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/i;

const normalizeScheduledAtForApi = value => {
  if (!value) {
    return value;
  }

  const normalizedValue = String(value).trim();

  if (DATETIME_HAS_TIMEZONE.test(normalizedValue)) {
    return normalizedValue;
  }

  if (DATETIME_LOCAL_MINUTES.test(normalizedValue)) {
    return `${normalizedValue}:00${BRAZIL_SCHEDULE_OFFSET}`;
  }

  if (
    DATETIME_LOCAL_SECONDS.test(normalizedValue) ||
    DATETIME_LOCAL_MILLIS.test(normalizedValue)
  ) {
    return `${normalizedValue}${BRAZIL_SCHEDULE_OFFSET}`;
  }

  return normalizedValue;
};

const parseScheduledAtInput = value => {
  if (!value) {
    return null;
  }

  const parsed = new Date(normalizeScheduledAtForApi(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const ScheduleSchema = Yup.object().shape({
  body: Yup.string().min(2, "Too Short!").max(1000, "Too Long!").required("Required"),
  scheduledAt: Yup.string()
    .required("Required")
    .test(
      "future-schedule",
      i18n.t("backendErrors.ERR_SCHEDULE_DATE_MUST_BE_FUTURE"),
      value => {
        if (!value) {
          return true;
        }

        const scheduledAt = parseScheduledAtInput(value);

        if (!scheduledAt) {
          return false;
        }

        return scheduledAt.getTime() > Date.now();
      }
    ),
  recurringMonths: Yup.number()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) {
        return 0;
      }

      return value;
    })
    .integer("Required")
    .min(1, "Required")
    .max(24, "Required")
    .when("monthlyRecurring", {
      is: true,
      then: schema => schema.required("Required"),
      otherwise: schema => schema.notRequired()
    })
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

const getMinimumScheduledAtInputValue = () => {
  const nextMinute = new Date();
  nextMinute.setSeconds(0, 0);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);
  return toInputDateTime(nextMinute);
};

const ScheduleModal = ({
  open,
  onClose,
  scheduleId,
  initialValues,
  lockContextIds = false,
  hideStatusField = false
}) => {
  const isMounted = useRef(true);

  const initialState = {
    body: initialValues?.body || "",
    status: initialValues?.status || "pending",
    scheduledAt: initialValues?.scheduledAt || "",
    assigneeId:
      initialValues?.assigneeId === null || initialValues?.assigneeId === undefined
        ? ""
        : initialValues.assigneeId,
    ticketId:
      initialValues?.ticketId === null || initialValues?.ticketId === undefined
        ? ""
        : initialValues.ticketId,
    contactId:
      initialValues?.contactId === null || initialValues?.contactId === undefined
        ? ""
        : initialValues.contactId,
    monthlyRecurring: false,
    recurringMonths: "1"
  };

  const [schedule, setSchedule] = useState(initialState);
  const [users, setUsers] = useState([]);
  const minScheduledAt = getMinimumScheduledAtInputValue();

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
  }, [
    scheduleId,
    open,
    initialValues?.body,
    initialValues?.status,
    initialValues?.scheduledAt,
    initialValues?.assigneeId,
    initialValues?.ticketId,
    initialValues?.contactId
  ]);

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

  const buildRecurringDates = (scheduledAt, recurringMonths) => {
    const baseDate = new Date(scheduledAt);

    if (Number.isNaN(baseDate.getTime())) {
      return [];
    }

    return Array.from({ length: recurringMonths }, (_, index) => {
      const nextDate = new Date(baseDate);
      nextDate.setMonth(nextDate.getMonth() + index + 1);
      return toInputDateTime(nextDate);
    });
  };

  const handleSaveSchedule = async values => {
    const payload = {
      body: values.body,
      status: scheduleId ? values.status : "pending",
      scheduledAt: normalizeScheduledAtForApi(values.scheduledAt),
      assigneeId: normalizeId(values.assigneeId),
      ticketId: normalizeId(values.ticketId),
      contactId: normalizeId(values.contactId)
    };

    const shouldCreateRecurringSchedules =
      !scheduleId &&
      lockContextIds &&
      Boolean(values.monthlyRecurring) &&
      Number(values.recurringMonths) > 0;

    const recurringPayloads = shouldCreateRecurringSchedules
      ? buildRecurringDates(values.scheduledAt, Number(values.recurringMonths)).map(
          scheduledAt => ({
            ...payload,
            scheduledAt: normalizeScheduledAtForApi(scheduledAt)
          })
        )
      : [];

    try {
      if (scheduleId) {
        await api.put(`/schedules/${scheduleId}`, payload);
      } else {
        await api.post("/schedules", payload);

        for (const recurringPayload of recurringPayloads) {
          await api.post("/schedules", recurringPayload);
        }
      }

      toast.success(
        i18n.t(
          recurringPayloads.length > 0
            ? "scheduleModal.successMultiple"
            : "scheduleModal.success",
          { count: recurringPayloads.length + 1 }
        )
      );
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
              <MessageVariablesHelper
                onInsertVariable={token => {
                  setFieldValue("body", appendMessageVariable(values.body, token));
                }}
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
                inputProps={{ min: minScheduledAt }}
                error={touched.scheduledAt && Boolean(errors.scheduledAt)}
                helperText={
                  touched.scheduledAt && errors.scheduledAt ? errors.scheduledAt : ""
                }
              />
              {!hideStatusField && scheduleId && (
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
              )}
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
              {lockContextIds ? (
                <>
                  <TextField
                    label={i18n.t("scheduleModal.form.ticketContext")}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    value={
                      initialValues?.ticketLabel || initialValues?.contactName || ""
                    }
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label={i18n.t("scheduleModal.form.contactName")}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    value={initialValues?.contactName || ""}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ readOnly: true }}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label={i18n.t("scheduleModal.form.ticketId")}
                    type="number"
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    value={values.ticketId}
                    onChange={event => setFieldValue("ticketId", event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={lockContextIds}
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
                    disabled={lockContextIds}
                  />
                </>
              )}
              {!scheduleId && lockContextIds && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        color="primary"
                        checked={Boolean(values.monthlyRecurring)}
                        onChange={event => {
                          setFieldValue("monthlyRecurring", event.target.checked);

                          if (!event.target.checked) {
                            setFieldValue("recurringMonths", "1");
                          }
                        }}
                      />
                    }
                    label={i18n.t("scheduleModal.form.monthlyRecurring")}
                  />
                  {values.monthlyRecurring && (
                    <TextField
                      label={i18n.t("scheduleModal.form.recurringMonths")}
                      type="number"
                      fullWidth
                      variant="outlined"
                      margin="dense"
                      value={values.recurringMonths}
                      onChange={event => setFieldValue("recurringMonths", event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: 1, max: 24 }}
                      helperText={i18n.t("scheduleModal.form.recurringMonthsHelp")}
                    />
                  )}
                </>
              )}
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
