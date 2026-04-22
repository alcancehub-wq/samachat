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
      tagIds: [],
      fields: []
    },
    contactIds: []
  };

  const [list, setList] = useState(initialState);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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
            filters: data.filters || { tagIds: [], fields: [] },
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
      filters: values.isDynamic ? values.filters : undefined,
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
                <InputLabel>{i18n.t("contactListModal.form.type")}</InputLabel>
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
                                <InputLabel>
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

export default ContactListModal;
