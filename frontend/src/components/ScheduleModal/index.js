import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";

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
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import MessageVariablesHelper from "../MessageVariablesHelper";
import { appendMessageVariable } from "../../utils/messageVariables";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import OfficialOutboundConfig from "../OfficialOutboundConfig";

const BRAZIL_SCHEDULE_OFFSET = "-03:00";
const ACTIVE_TICKET_STATUSES = ["open", "pending"];
const MIN_TICKET_SEARCH_LENGTH = 2;
const DATETIME_LOCAL_MINUTES = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATETIME_LOCAL_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const DATETIME_LOCAL_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}$/;
const DATETIME_HAS_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/i;

const buildTicketSearchOption = ticketLike => {
  if (!ticketLike) {
    return null;
  }

  if (ticketLike.contactName !== undefined || ticketLike.contactNumber !== undefined) {
    return ticketLike.id
      ? {
          id: ticketLike.id,
          status: ticketLike.status || "",
          contactId: ticketLike.contactId || null,
          contactName: ticketLike.contactName || "",
          contactNumber: ticketLike.contactNumber || ""
        }
      : null;
  }

  const contact = ticketLike.contact || {};

  if (!ticketLike.id) {
    return null;
  }

  return {
    id: ticketLike.id,
    status: ticketLike.status || "",
    contactId: ticketLike.contactId || contact.id || null,
    contactName: contact.name || "",
    contactNumber: contact.number || ""
  };
};

const mergeTicketSearchOptions = (...collections) => {
  const optionsMap = new Map();

  collections.flat().forEach(item => {
    const option = buildTicketSearchOption(item);

    if (!option?.id || optionsMap.has(option.id)) {
      return;
    }

    optionsMap.set(option.id, option);
  });

  return Array.from(optionsMap.values());
};

const getTicketOptionLabel = option => {
  const normalizedOption = buildTicketSearchOption(option);

  if (!normalizedOption) {
    return "";
  }

  return normalizedOption.contactName ||
    normalizedOption.contactNumber ||
    `#${normalizedOption.id}`;
};

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
  body: Yup.string()
    .max(1000, "Mensagem muito longa.")
    .test("body-min", "Mensagem muito curta.", value => {
      if (!value || !value.trim()) {
        return true;
      }

      return value.trim().length >= 2;
    })
    .test(
      "body-or-media",
      i18n.t("backendErrors.ERR_SCHEDULE_BODY_OR_MEDIA_REQUIRED"),
      function validateBodyOrMedia(value) {
        if (this.parent.outboundMode === "OFFICIAL") {
          return true;
        }
        const hasBody = Boolean(value && value.trim());
        const hasMedia = Boolean(
          this.parent.mediaOriginalName && !this.parent.removeMedia
        );

        return hasBody || hasMedia;
      }
    ),
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
  deliveryWhatsappId: Yup.string().when("outboundMode", {
    is: "OFFICIAL",
    then: Yup.string().required("Selecione o número oficial."),
    otherwise: Yup.string()
  }),
  templateName: Yup.string().when("outboundMode", {
    is: "OFFICIAL",
    then: Yup.string().required("Selecione o modelo de mensagem."),
    otherwise: Yup.string()
  }),
  templateLanguage: Yup.string().when("outboundMode", {
    is: "OFFICIAL",
    then: Yup.string().required("Selecione o modelo de mensagem."),
    otherwise: Yup.string()
  }),
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
    }),
  ticketId: Yup.number()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) {
        return null;
      }

      return Number(originalValue);
    })
    .nullable()
    .required(i18n.t("scheduleModal.search.ticketRequired")),
  mediaOriginalName: Yup.string().nullable(),
  removeMedia: Yup.boolean()
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
  const fileInputRef = useRef(null);

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
    mediaOriginalName: initialValues?.mediaOriginalName || "",
    removeMedia: false,
    outboundMode: initialValues?.outboundMode || "STANDARD",
    ownerQueueId: initialValues?.ownerQueueId || "",
    deliveryWhatsappId: initialValues?.deliveryWhatsappId || "",
    templateName: initialValues?.templateName || "",
    templateLanguage: initialValues?.templateLanguage || "",
    templateComponents: initialValues?.templateComponents || "",
    monthlyRecurring: false,
    recurringMonths: "1"
  };

  const [schedule, setSchedule] = useState(initialState);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [ticketSearchInput, setTicketSearchInput] = useState("");
  const [ticketSearchLoading, setTicketSearchLoading] = useState(false);
  const [ticketSearchOptions, setTicketSearchOptions] = useState([]);
  const [selectedTicketOption, setSelectedTicketOption] = useState(null);
  const [users, setUsers] = useState([]);
  const minScheduledAt = getMinimumScheduledAtInputValue();

  const getTicketStatusLabel = status => {
    if (status === "open") {
      return i18n.t("scheduleModal.search.statusOpen");
    }

    if (status === "pending") {
      return i18n.t("scheduleModal.search.statusPending");
    }

    return status || "";
  };

  const getTicketOptionMeta = option => {
    const normalizedOption = buildTicketSearchOption(option);

    if (!normalizedOption) {
      return "";
    }

    return [
      normalizedOption.contactNumber,
      `#${normalizedOption.id}`,
      getTicketStatusLabel(normalizedOption.status)
    ]
      .filter(Boolean)
      .join(" • ");
  };

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
        setSelectedTicketOption(null);
        setTicketSearchInput("");
        setTicketSearchOptions([]);
        return;
      }

      try {
        const { data } = await api.get(`/schedules/${scheduleId}`);

        if (isMounted.current) {
          const resolvedTicketOption = buildTicketSearchOption({
            id: data.ticketId,
            status: data.ticket?.status,
            contactId: data.contactId,
            contact: data.contact
          });

          setSchedule({
            body: data.body || "",
            status: data.status || "pending",
            scheduledAt: toInputDateTime(data.scheduledAt),
            assigneeId: data.assigneeId || "",
            ticketId: data.ticketId || "",
            contactId: data.contactId || "",
            mediaOriginalName: data.mediaOriginalName || "",
            removeMedia: false
          });
          setSelectedTicketOption(resolvedTicketOption);
          setTicketSearchInput(
            resolvedTicketOption ? getTicketOptionLabel(resolvedTicketOption) : ""
          );
          setTicketSearchOptions(
            resolvedTicketOption ? [resolvedTicketOption] : []
          );
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
    initialValues?.contactId,
    initialValues?.mediaOriginalName
  ]);

  const handleClose = () => {
    onClose();
    setSchedule(initialState);
    setSelectedMedia(null);
    setTicketSearchInput("");
    setTicketSearchOptions([]);
    setSelectedTicketOption(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!open || lockContextIds) {
      return undefined;
    }

    const trimmedSearch = ticketSearchInput.trim();

    if (trimmedSearch.length < MIN_TICKET_SEARCH_LENGTH) {
      setTicketSearchLoading(false);
      setTicketSearchOptions(selectedTicketOption ? [selectedTicketOption] : []);
      return undefined;
    }

    let cancelled = false;
    setTicketSearchLoading(true);

    const delayDebounceFn = setTimeout(() => {
      const fetchTickets = async () => {
        try {
          const responses = await Promise.all(
            ACTIVE_TICKET_STATUSES.map(status =>
              api.get("/tickets", {
                params: {
                  searchParam: trimmedSearch,
                  status
                }
              })
            )
          );

          if (cancelled) {
            return;
          }

          const mergedOptions = mergeTicketSearchOptions(
            ...responses.map(response => response.data?.tickets || []),
            selectedTicketOption ? [selectedTicketOption] : []
          );

          setTicketSearchOptions(mergedOptions);
        } catch (err) {
          if (!cancelled) {
            setTicketSearchOptions(selectedTicketOption ? [selectedTicketOption] : []);
            toastError(err);
          }
        } finally {
          if (!cancelled) {
            setTicketSearchLoading(false);
          }
        }
      };

      fetchTickets();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [lockContextIds, open, selectedTicketOption, ticketSearchInput]);

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

  const appendSchedulePayloadToFormData = (formData, payload) => {
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      if (value === null) {
        formData.append(key, "");
        return;
      }

      formData.append(key, String(value));
    });
  };

  const sendScheduleRequest = async ({ method, url, payload, mediaFile }) => {
    if (!mediaFile) {
      if (method === "put") {
        return api.put(url, payload);
      }

      return api.post(url, payload);
    }

    const formData = new FormData();
    appendSchedulePayloadToFormData(formData, payload);
    formData.append("media", mediaFile);

    if (method === "put") {
      return api.put(url, formData);
    }

    return api.post(url, formData);
  };

  const handleSelectMedia = (event, setFieldValue) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    setSelectedMedia(file);
    setFieldValue("mediaOriginalName", file.name);
    setFieldValue("removeMedia", false);
  };

  const handleRemoveMedia = (values, setFieldValue) => {
    const hadExistingMedia = Boolean(schedule.mediaOriginalName);
    const isRemovingReplacement = Boolean(selectedMedia && hadExistingMedia);

    setSelectedMedia(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (isRemovingReplacement) {
      setFieldValue("mediaOriginalName", schedule.mediaOriginalName);
      setFieldValue("removeMedia", false);
      return;
    }

    setFieldValue("mediaOriginalName", "");
    setFieldValue("removeMedia", Boolean(values.mediaOriginalName));
  };

  const handleSaveSchedule = async values => {
    const payload = {
      body: values.outboundMode === "OFFICIAL" ? `Modelo oficial: ${values.templateName || ""}` : values.body,
      status: scheduleId ? values.status : "pending",
      scheduledAt: normalizeScheduledAtForApi(values.scheduledAt),
      assigneeId: normalizeId(values.assigneeId),
      ticketId: normalizeId(values.ticketId),
      contactId: normalizeId(values.contactId),
      removeMedia: Boolean(values.removeMedia),
      outboundMode: values.outboundMode,
      ownerQueueId: normalizeId(values.ownerQueueId),
      deliveryWhatsappId: normalizeId(values.deliveryWhatsappId),
      templateName: values.templateName || null,
      templateLanguage: values.templateLanguage || null,
      templateComponents: values.templateComponents || null
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
        await sendScheduleRequest({
          method: "put",
          url: `/schedules/${scheduleId}`,
          payload,
          mediaFile: selectedMedia
        });
      } else {
        await sendScheduleRequest({
          method: "post",
          url: "/schedules",
          payload,
          mediaFile: selectedMedia
        });

        for (const recurringPayload of recurringPayloads) {
          await sendScheduleRequest({
            method: "post",
            url: "/schedules",
            payload: recurringPayload,
            mediaFile: selectedMedia
          });
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
        {({ values, touched, errors, setFieldTouched, setFieldValue, isSubmitting }) => {
          const ticketSearchHelperText =
            touched.ticketId && errors.ticketId
              ? errors.ticketId
              : ticketSearchInput.trim().length >= MIN_TICKET_SEARCH_LENGTH &&
                !ticketSearchLoading &&
                ticketSearchOptions.length === 0
              ? i18n.t("scheduleModal.search.noOptions")
              : i18n.t("scheduleModal.search.helper");

          return (
          <Form>
            <DialogContent dividers>
              {values.outboundMode !== "OFFICIAL" && <Field
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
              />}
              {values.outboundMode !== "OFFICIAL" && <>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={event => handleSelectMedia(event, setFieldValue)}
              />
              <TextField
                label={i18n.t("scheduleModal.form.media")}
                fullWidth
                variant="outlined"
                margin="dense"
                value={values.removeMedia ? "" : values.mediaOriginalName || ""}
                InputLabelProps={{ shrink: true }}
                InputProps={{ readOnly: true }}
                helperText={
                  values.removeMedia
                    ? i18n.t("scheduleModal.form.mediaRemoved")
                    : i18n.t("scheduleModal.form.mediaHelp")
                }
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 8 }}>
                <Button
                  type="button"
                  color="primary"
                  variant="outlined"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  {values.mediaOriginalName && !values.removeMedia
                    ? i18n.t("scheduleModal.buttons.replaceMedia")
                    : i18n.t("scheduleModal.buttons.addMedia")}
                </Button>
                {values.mediaOriginalName && (
                  <Button
                    type="button"
                    color="secondary"
                    variant="outlined"
                    onClick={() => handleRemoveMedia(values, setFieldValue)}
                  >
                    {i18n.t("scheduleModal.buttons.removeMedia")}
                  </Button>
                )}
              </div>
              <MessageVariablesHelper
                onInsertVariable={token => {
                  setFieldValue("body", appendMessageVariable(values.body, token));
                }}
              />
              </>}
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
                  <Autocomplete
                    options={ticketSearchOptions}
                    value={selectedTicketOption}
                    inputValue={ticketSearchInput}
                    loading={ticketSearchLoading}
                    filterOptions={options => options}
                    noOptionsText={
                      ticketSearchInput.trim().length < MIN_TICKET_SEARCH_LENGTH
                        ? i18n.t("scheduleModal.search.typeToSearch")
                        : i18n.t("scheduleModal.search.noOptions")
                    }
                    loadingText={i18n.t("scheduleModal.search.loading")}
                    getOptionLabel={getTicketOptionLabel}
                    getOptionSelected={(option, value) => option.id === value.id}
                    onChange={(event, newValue) => {
                      const nextOption = buildTicketSearchOption(newValue);

                      setSelectedTicketOption(nextOption);
                      setTicketSearchInput(nextOption ? getTicketOptionLabel(nextOption) : "");
                      setTicketSearchOptions(
                        nextOption
                          ? mergeTicketSearchOptions(ticketSearchOptions, [nextOption])
                          : []
                      );
                      setFieldValue("ticketId", nextOption?.id || "");
                      setFieldValue("contactId", nextOption?.contactId || "");
                      setFieldTouched("ticketId", true, false);
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      setTicketSearchInput(newInputValue);

                      if (reason === "input") {
                        setSelectedTicketOption(null);
                        setFieldValue("ticketId", "");
                        setFieldValue("contactId", "");
                      }

                      if (reason === "clear") {
                        setSelectedTicketOption(null);
                        setTicketSearchOptions([]);
                        setFieldValue("ticketId", "");
                        setFieldValue("contactId", "");
                      }
                    }}
                    renderOption={option => (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2">
                          {getTicketOptionLabel(option)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {getTicketOptionMeta(option)}
                        </Typography>
                      </div>
                    )}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label={i18n.t("scheduleModal.form.ticketLookup")}
                        placeholder={i18n.t("scheduleModal.search.placeholder")}
                        fullWidth
                        variant="outlined"
                        margin="dense"
                        onBlur={() => setFieldTouched("ticketId", true, false)}
                        error={touched.ticketId && Boolean(errors.ticketId)}
                        helperText={ticketSearchHelperText}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {ticketSearchLoading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                  />
                  {selectedTicketOption && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 12,
                        borderRadius: 8,
                        border: "1px solid rgba(0, 0, 0, 0.12)",
                        backgroundColor: "rgba(0, 0, 0, 0.02)"
                      }}
                    >
                      <Typography variant="subtitle2">
                        {i18n.t("scheduleModal.search.selected")}
                      </Typography>
                      <Typography variant="body2">
                        {getTicketOptionLabel(selectedTicketOption)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {getTicketOptionMeta(selectedTicketOption)}
                      </Typography>
                    </div>
                  )}
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
              <OfficialOutboundConfig value={values} requireQueue={!values.ticketId} onChange={next => Object.entries(next).forEach(([key, fieldValue]) => setFieldValue(key, fieldValue))} />
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
          );
        }}
      </Formik>
    </Dialog>
  );
};

export default ScheduleModal;
