import React, { useEffect, useState } from "react";
import { FormControl, IconButton, InputLabel, Menu, MenuItem, Select, Tooltip, useMediaQuery } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { SwapHoriz } from "@material-ui/icons";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  control: {
    minWidth: 136,
    flex: "none",
    [theme.breakpoints.down("sm")]: { minWidth: 116 }
  },
  select: {
    fontSize: "0.8rem",
    "& .MuiSelect-select": {
      paddingTop: 8,
      paddingBottom: 8,
      paddingRight: 25
    },
    "& .MuiSelect-iconOutlined": {
      right: 5
    }
  },
  mobileButton: {
    padding: 8,
    color: theme.palette.text.secondary
  }
}));

const TicketReplyChannelSelect = ({ ticket, onUpdated }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
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

  const handleMobileSelect = replyOutboundMode => {
    setMobileMenuAnchor(null);
    handleChange({ target: { value: replyOutboundMode } });
  };

  if (isMobile) {
    const currentLabel = value === "OFFICIAL" ? "API Oficial" : "Minha conex\u00e3o";

    return (
      <>
        <Tooltip title={`Enviar por: ${currentLabel}`}>
          <span>
            <IconButton
              size="small"
              className={classes.mobileButton}
              onClick={event => setMobileMenuAnchor(event.currentTarget)}
              disabled={saving}
              aria-label="Selecionar conex\u00e3o de envio"
            >
              <SwapHoriz />
            </IconButton>
          </span>
        </Tooltip>

        <Menu
          anchorEl={mobileMenuAnchor}
          keepMounted
          open={Boolean(mobileMenuAnchor)}
          onClose={() => setMobileMenuAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          getContentAnchorEl={null}
        >
          <MenuItem
            selected={value === "STANDARD"}
            onClick={() => handleMobileSelect("STANDARD")}
          >
            Minha conex\u00e3o
          </MenuItem>
          {isOfficialAvailable && (
            <MenuItem
              selected={value === "OFFICIAL"}
              onClick={() => handleMobileSelect("OFFICIAL")}
            >
              API Oficial
            </MenuItem>
          )}
        </Menu>
      </>
    );
  }

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