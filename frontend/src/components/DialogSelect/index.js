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

const DialogSelect = ({ selectedDialogId, onChange, label }) => {
  const [dialogs, setDialogs] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/dialogs");
        setDialogs(data);
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
      <InputLabel>{label || i18n.t("campaignModal.form.dialog")}</InputLabel>
      <Select
        value={selectedDialogId || ""}
        onChange={handleChange}
        label={label || i18n.t("campaignModal.form.dialog")}
        displayEmpty
      >
        <MenuItem value="">
          {i18n.t("campaignModal.form.dialogPlaceholder")}
        </MenuItem>
        {dialogs.map(dialog => (
          <MenuItem key={dialog.id} value={dialog.id}>
            {dialog.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default DialogSelect;
