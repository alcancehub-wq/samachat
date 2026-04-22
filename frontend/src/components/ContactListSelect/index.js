import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select
} from "@material-ui/core";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

const ContactListSelect = ({ selectedListId, onChange, label }) => {
  const [lists, setLists] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/contactLists");
        setLists(data);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  const handleChange = event => {
    if (typeof onChange === "function") {
      onChange(event.target.value || null);
    }
  };

  return (
    <FormControl fullWidth margin="dense" variant="outlined">
      <InputLabel>{label || i18n.t("campaignModal.form.list")}</InputLabel>
      <Select
        value={selectedListId || ""}
        onChange={handleChange}
        label={label || i18n.t("campaignModal.form.list")}
        displayEmpty
      >
        <MenuItem value="">
          {i18n.t("campaignModal.form.listPlaceholder")}
        </MenuItem>
        {lists.map(list => (
          <MenuItem key={list.id} value={list.id}>
            {list.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ContactListSelect;
