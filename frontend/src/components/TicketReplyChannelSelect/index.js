import React, { useEffect, useState } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  control: {
    minWidth: 150,
    marginLeft: "auto",
    [theme.breakpoints.down("sm")]: { minWidth: 120 }
  },
  select: { fontSize: "0.8rem" }
}));

const TicketReplyChannelSelect = ({ ticket, onUpdated }) => {
  const classes = useStyles();
  const [saving, setSaving] = useState(false);
  const [officialWhatsappId, setOfficialWhatsappId] = useState(ticket.replyDeliveryWhatsappId || null);
  const isOfficialAvailable = Boolean(officialWhatsappId);
  const value = ticket.replyOutboundMode === "OFFICIAL" ? "OFFICIAL" : "STANDARD";

  useEffect(() => {
    setOfficialWhatsappId(ticket.replyDeliveryWhatsappId || null);
    if (ticket.replyDeliveryWhatsappId || !ticket.id) return;
    api.get(`/tickets/${ticket.id}/reply-channel-connections`)
      .then(({ data }) => setOfficialWhatsappId(data.deliveryWhatsappIds?.[0] || null))
      .catch(() => setOfficialWhatsappId(null));
  }, [ticket.id, ticket.replyDeliveryWhatsappId]);

  const handleChange = async event => {
    const replyOutboundMode = event.target.value;
    setSaving(true);
    try {
      const { data } = await api.put(`/tickets/${ticket.id}/reply-channel`, {
        replyOutboundMode,
        replyDeliveryWhatsappId: replyOutboundMode === "OFFICIAL" ? officialWhatsappId : null
      });
      onUpdated(data);
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormControl variant="outlined" size="small" className={classes.control} disabled={saving}>
      <InputLabel>Enviar por</InputLabel>
      <Select value={value} onChange={handleChange} label="Enviar por" className={classes.select}>
        <MenuItem value="STANDARD">Minha conexão</MenuItem>
        {isOfficialAvailable && <MenuItem value="OFFICIAL">API Oficial</MenuItem>}
      </Select>
    </FormControl>
  );
};

export default TicketReplyChannelSelect;