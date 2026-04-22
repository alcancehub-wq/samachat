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

const IntegrationSelect = ({ selectedIntegrationId, onChange, label }) => {
  const [integrations, setIntegrations] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/integrations");
        setIntegrations(data);
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
      <InputLabel>{label || i18n.t("webhookModal.form.integration")}</InputLabel>
      <Select
        value={selectedIntegrationId || ""}
        onChange={handleChange}
        label={label || i18n.t("webhookModal.form.integration")}
        displayEmpty
      >
        <MenuItem value="">
          {i18n.t("webhookModal.form.integrationPlaceholder")}
        </MenuItem>
        {integrations.map(integration => (
          <MenuItem key={integration.id} value={integration.id}>
            {integration.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default IntegrationSelect;
