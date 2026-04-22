import React, { useEffect, useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from "@material-ui/core";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import TagSelect from "../TagSelect";

const TicketTagsModal = ({ open, onClose, ticketId, initialTagIds = [] }) => {
  const [selectedTagIds, setSelectedTagIds] = useState(initialTagIds);

  useEffect(() => {
    setSelectedTagIds(initialTagIds || []);
  }, [initialTagIds, open]);

  const handleSave = async () => {
    try {
      await api.put(`/tickets/${ticketId}`, {
        tagIds: selectedTagIds
      });
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{i18n.t("ticketTagsModal.title")}</DialogTitle>
      <DialogContent dividers>
        <TagSelect
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
          label={i18n.t("ticketTagsModal.inputLabel")}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="outlined">
          {i18n.t("ticketTagsModal.buttons.cancel")}
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          {i18n.t("ticketTagsModal.buttons.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketTagsModal;
