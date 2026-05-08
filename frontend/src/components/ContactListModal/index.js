import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, FieldArray, Field } from "formik";
import { toast } from "react-toastify";

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
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import TagSelect from "../TagSelect";
import ContactSelect from "../ContactSelect";

const ContactListSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(80, "Too Long!").required("Required")
});

const ContactListModal = ({ open, onClose, listId }) => {
  const isMounted = useRef(true);

  const initialState = {
    name: "",
    description: "",
    isDynamic: false,
    isActive: true,
    filters: {
      userId: "",
      excludedContactIds: [],
      tagIds: [],
      fields: []
    },
    contactIds: []
  };

  const [list, setList] = useState(initialState);
  const [users, setUsers] = useState([]);
  const [previewContacts, setPreviewContacts] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

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
    const fetchList = async () => {
      if (!listId) {
        setList(initialState);
        return;
      }

      try {
        const { data } = await api.get(`/contactLists/${listId}`);
        if (isMounted.current) {
          setList({
            name: data.name || "",
            description: data.description || "",
            isDynamic: !!data.isDynamic,
            isActive: data.isActive !== false,
            filters: {
              userId:
                data.filters?.userId === null || data.filters?.userId === undefined
                  ? ""
                  : data.filters.userId,
              excludedContactIds: data.filters?.excludedContactIds || [],
              tagIds: data.filters?.tagIds || [],
              fields: data.filters?.fields || []
            },
            contactIds: data.contacts ? data.contacts.map(contact => contact.id) : []
          });
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchList();
  }, [listId, open]);

  const handleClose = () => {
    onClose();
    setList(initialState);
  };

  const handleSaveList = async values => {
    const payload = {
      name: values.name,
      description: values.description,
      isDynamic: values.isDynamic,
      isActive: values.isActive,
      filters: values.isDynamic
        ? {
            ...values.filters,
            excludedContactIds: (values.filters.excludedContactIds || []).map(Number),
            userId: values.filters.userId ? Number(values.filters.userId) : null
          }
        : undefined,
      contactIds: values.isDynamic ? [] : values.contactIds
    };

    try {
      if (listId) {
        await api.put(`/contactLists/${listId}`, payload);
      } else {
        await api.post("/contactLists", payload);
      }
      toast.success(i18n.t("contactListModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {listId
          ? `${i18n.t("contactListModal.title.edit")}`
          : `${i18n.t("contactListModal.title.add")}`}
      </DialogTitle>
      <Formik
        initialValues={list}
        enableReinitialize
        validationSchema={ContactListSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveList(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, touched, errors, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Field
                as={TextField}
                label={i18n.t("contactListModal.form.name")}
                name="name"
                fullWidth
                autoFocus
                error={touched.name && Boolean(errors.name)}
                helperText={
                  touched.name && errors.name
                    ? errors.name
                    : i18n.t("contactListModal.form.nameHelper")
                }
                variant="outlined"
                margin="dense"
              />
              <Field
                as={TextField}
                label={i18n.t("contactListModal.form.description")}
                name="description"
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                rows={3}
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel shrink>{i18n.t("contactListModal.form.type")}</InputLabel>
                <Select
                  value={values.isDynamic ? "dynamic" : "manual"}
                  onChange={event =>
                    setFieldValue("isDynamic", event.target.value === "dynamic")
                  }
                  label={i18n.t("contactListModal.form.type")}
                >
                  <MenuItem value="manual">
                    {i18n.t("contactListModal.form.manual")}
                  </MenuItem>
                  <MenuItem value="dynamic">
                    {i18n.t("contactListModal.form.dynamic")}
                  </MenuItem>
                </Select>
              </FormControl>

              {values.isDynamic ? (
                <>
                  <FormControl fullWidth margin="dense" variant="outlined">
                    <InputLabel shrink>{i18n.t("contactListModal.form.assignee")}</InputLabel>
                    <Select
                      value={values.filters.userId || ""}
                      onChange={event =>
                        setFieldValue("filters.userId", event.target.value)
                      }
                      label={i18n.t("contactListModal.form.assignee")}
                    >
                      <MenuItem value="">
                        {i18n.t("contactListModal.form.assigneeAll")}
                      </MenuItem>
                      {users.map(user => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="subtitle1" gutterBottom>
                    {i18n.t("contactListModal.form.tags")}
                  </Typography>
                  <TagSelect
                    selectedTagIds={values.filters.tagIds || []}
                    onChange={ids => setFieldValue("filters.tagIds", ids)}
                    label={i18n.t("contactListModal.form.tagsPlaceholder")}
                  />
                  <Typography variant="subtitle1" gutterBottom style={{ marginTop: 12 }}>
                    {i18n.t("contactListModal.form.fields")}
                  </Typography>
                  <FieldArray name="filters.fields">
                    {({ push, remove }) => (
                      <>
                        {values.filters.fields && values.filters.fields.length > 0 ? (
                          values.filters.fields.map((field, index) => (
                            <div
                              key={`${index}-field`}
                              style={{ display: "flex", gap: 8, marginBottom: 8 }}
                            >
                              <Field
                                as={TextField}
                                label={i18n.t("contactListModal.form.fieldName")}
                                name={`filters.fields[${index}].name`}
                                variant="outlined"
                                margin="dense"
                                style={{ flex: 1 }}
                              />
                              <FormControl
                                variant="outlined"
                                margin="dense"
                                style={{ minWidth: 140 }}
                              >
                                <InputLabel shrink>
                                  {i18n.t("contactListModal.form.fieldOperator")}
                                </InputLabel>
                                <Select
                                  value={field.operator || "equals"}
                                  onChange={event =>
                                    setFieldValue(
                                      `filters.fields[${index}].operator`,
                                      event.target.value
                                    )
                                  }
                                  label={i18n.t("contactListModal.form.fieldOperator")}
                                >
                                  <MenuItem value="equals">
                                    {i18n.t("contactListModal.form.operatorEquals")}
                                  </MenuItem>
                                  <MenuItem value="contains">
                                    {i18n.t("contactListModal.form.operatorContains")}
                                  </MenuItem>
                                </Select>
                              </FormControl>
                              <Field
                                as={TextField}
                                label={i18n.t("contactListModal.form.fieldValue")}
                                name={`filters.fields[${index}].value`}
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
                                {i18n.t("contactListModal.form.removeField")}
                              </Button>
                            </div>
                          ))
                        ) : (
                          <Typography color="textSecondary">
                            {i18n.t("contactListModal.form.noFields")}
                          </Typography>
                        )}
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={() =>
                            push({ name: "", operator: "equals", value: "" })
                          }
                          style={{ marginTop: 8 }}
                        >
                          {i18n.t("contactListModal.form.addField")}
                        </Button>
                      </>
                    )}
                  </FieldArray>
                  <DynamicContactsPreview
                    open={open}
                    filters={values.filters}
                    previewContacts={previewContacts}
                    previewLoading={previewLoading}
                    onPreviewChange={setPreviewContacts}
                    onLoadingChange={setPreviewLoading}
                    onToggleExcludedContact={contactId => {
                      const excludedContactIds = values.filters.excludedContactIds || [];
                      const nextExcludedIds = excludedContactIds.includes(contactId)
                        ? excludedContactIds.filter(id => id !== contactId)
                        : [...excludedContactIds, contactId];

                      setFieldValue("filters.excludedContactIds", nextExcludedIds);
                    }}
                  />
                </>
              ) : (
                <>
                  <Typography variant="subtitle1" gutterBottom style={{ marginTop: 12 }}>
                    {i18n.t("contactListModal.form.contacts")}
                  </Typography>
                  <ContactSelect
                    selectedContactIds={values.contactIds || []}
                    onChange={ids => setFieldValue("contactIds", ids)}
                  />
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="secondary" variant="outlined">
                {i18n.t("contactListModal.buttons.cancel")}
              </Button>
              <Button type="submit" color="primary" variant="contained" disabled={isSubmitting}>
                {listId
                  ? `${i18n.t("contactListModal.buttons.okEdit")}`
                  : `${i18n.t("contactListModal.buttons.okAdd")}`}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

const DynamicContactsPreview = ({
  open,
  filters,
  previewContacts,
  previewLoading,
  onPreviewChange,
  onLoadingChange,
  onToggleExcludedContact
}) => {
  useEffect(() => {
    const loadPreviewContacts = async () => {
      if (!open) {
        return;
      }

      onLoadingChange(true);

      try {
        const { data } = await api.post("/contactLists/preview/contacts", {
          filters: {
            ...filters,
            userId: filters.userId ? Number(filters.userId) : null,
            excludedContactIds: filters.excludedContactIds || [],
            tagIds: filters.tagIds || [],
            fields: filters.fields || []
          }
        });

        onPreviewChange(data.contacts || []);
      } catch (err) {
        toastError(err);
      } finally {
        onLoadingChange(false);
      }
    };

    loadPreviewContacts();
  }, [
    open,
    filters.userId,
    JSON.stringify(filters.tagIds || []),
    JSON.stringify(filters.fields || []),
    JSON.stringify(filters.excludedContactIds || []),
    onLoadingChange,
    onPreviewChange
  ]);

  return (
    <>
      <Typography variant="subtitle1" gutterBottom style={{ marginTop: 16 }}>
        {i18n.t("contactListModal.form.previewContacts")}
      </Typography>
      <Typography color="textSecondary" style={{ marginBottom: 8 }}>
        {i18n.t("contactListModal.form.previewContactsHint", {
          count: previewContacts.length
        })}
      </Typography>
      {previewLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <CircularProgress size={18} />
          <Typography color="textSecondary">
            {i18n.t("contactListModal.form.previewLoading")}
          </Typography>
        </div>
      ) : previewContacts.length > 0 ? (
        <List
          dense
          style={{
            maxHeight: 220,
            overflowY: "auto",
            border: "1px solid rgba(0, 0, 0, 0.12)",
            borderRadius: 8,
            marginBottom: 8
          }}
        >
          {previewContacts.map(contact => {
            const excludedContactIds = filters.excludedContactIds || [];
            const isIncluded = !excludedContactIds.includes(contact.id);

            return (
              <ListItem key={contact.id} divider dense>
                <FormControlLabel
                  control={
                    <Checkbox
                      color="primary"
                      checked={isIncluded}
                      onChange={() => onToggleExcludedContact(contact.id)}
                    />
                  }
                  label={
                    <ListItemText
                      primary={contact.name || contact.number}
                      secondary={contact.number || ""}
                    />
                  }
                />
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography color="textSecondary" style={{ marginBottom: 8 }}>
          {i18n.t("contactListModal.form.previewEmpty")}
        </Typography>
      )}
    </>
  );
};

export default ContactListModal;
