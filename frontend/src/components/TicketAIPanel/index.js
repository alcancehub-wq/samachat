import React, { useContext, useEffect, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  TextField,
  Typography,
  makeStyles
} from "@material-ui/core";
import FileCopyOutlinedIcon from "@material-ui/icons/FileCopyOutlined";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
  card: {
    marginTop: theme.spacing(2)
  },
  actionRow: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginTop: theme.spacing(1)
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  output: {
    marginTop: theme.spacing(1)
  }
}));

const TicketAIPanel = ({ ticket }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [baseText, setBaseText] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [rewrite, setRewrite] = useState("");
  const [summary, setSummary] = useState("");
  const [classification, setClassification] = useState("");

  const [loading, setLoading] = useState({
    suggest: false,
    rewrite: false,
    summarize: false,
    classify: false
  });

  useEffect(() => {
    if (ticket?.lastMessage && !baseText) {
      setBaseText(ticket.lastMessage);
    }
  }, [ticket, baseText]);

  if (!user || user.profile?.toLowerCase() !== "admin") {
    return null;
  }

  const handleCopy = async text => {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(i18n.t("openai.ticket.copySuccess"));
    } catch (err) {
      toastError(err);
    }
  };

  const runAction = async action => {
    if (!baseText && action !== "summarize") {
      toast.error(i18n.t("openai.ticket.emptyText"));
      return;
    }

    setLoading(prev => ({ ...prev, [action]: true }));

    try {
      if (action === "summarize") {
        const { data } = await api.post("/openai/summarize", {
          ticketId: ticket?.id
        });
        setSummary(data?.content || "");
      }

      if (action === "suggest") {
        const { data } = await api.post("/openai/suggest", {
          ticketId: ticket?.id,
          contactId: ticket?.contactId,
          text: baseText
        });
        setSuggestion(data?.content || "");
      }

      if (action === "rewrite") {
        const { data } = await api.post("/openai/rewrite", {
          ticketId: ticket?.id,
          contactId: ticket?.contactId,
          text: baseText
        });
        setRewrite(data?.content || "");
      }

      if (action === "classify") {
        const { data } = await api.post("/openai/classify", {
          ticketId: ticket?.id,
          text: baseText
        });
        setClassification(data?.content || "");
      }
    } catch (err) {
      toastError(err);
    }

    setLoading(prev => ({ ...prev, [action]: false }));
  };

  return (
    <Card className={classes.card} variant="outlined">
      <CardContent>
        <div className={classes.header}>
          <Typography variant="subtitle1">
            {i18n.t("openai.ticket.title")}
          </Typography>
        </div>
        <TextField
          label={i18n.t("openai.ticket.baseText")}
          value={baseText}
          onChange={event => setBaseText(event.target.value)}
          fullWidth
          variant="outlined"
          margin="dense"
          multiline
          minRows={3}
        />
        <div className={classes.actionRow}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setBaseText(ticket?.lastMessage || "")}
          >
            {i18n.t("openai.ticket.useLastMessage")}
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => runAction("suggest")}
            disabled={loading.suggest}
          >
            {i18n.t("openai.ticket.suggest")}
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => runAction("rewrite")}
            disabled={loading.rewrite}
          >
            {i18n.t("openai.ticket.rewrite")}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => runAction("classify")}
            disabled={loading.classify}
          >
            {i18n.t("openai.ticket.classify")}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => runAction("summarize")}
            disabled={loading.summarize}
          >
            {i18n.t("openai.ticket.summarize")}
          </Button>
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <Typography variant="subtitle2">
          {i18n.t("openai.ticket.suggestion")}
        </Typography>
        <TextField
          className={classes.output}
          value={suggestion}
          fullWidth
          variant="outlined"
          margin="dense"
          multiline
          minRows={2}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <IconButton size="small" onClick={() => handleCopy(suggestion)}>
                <FileCopyOutlinedIcon fontSize="small" />
              </IconButton>
            )
          }}
        />
        <Typography variant="subtitle2">
          {i18n.t("openai.ticket.rewriteLabel")}
        </Typography>
        <TextField
          className={classes.output}
          value={rewrite}
          fullWidth
          variant="outlined"
          margin="dense"
          multiline
          minRows={2}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <IconButton size="small" onClick={() => handleCopy(rewrite)}>
                <FileCopyOutlinedIcon fontSize="small" />
              </IconButton>
            )
          }}
        />
        <Typography variant="subtitle2">
          {i18n.t("openai.ticket.summary")}
        </Typography>
        <TextField
          className={classes.output}
          value={summary}
          fullWidth
          variant="outlined"
          margin="dense"
          multiline
          minRows={2}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <IconButton size="small" onClick={() => handleCopy(summary)}>
                <FileCopyOutlinedIcon fontSize="small" />
              </IconButton>
            )
          }}
        />
        <Typography variant="subtitle2">
          {i18n.t("openai.ticket.classification")}
        </Typography>
        <TextField
          className={classes.output}
          value={classification}
          fullWidth
          variant="outlined"
          margin="dense"
          InputProps={{
            readOnly: true,
            endAdornment: (
              <IconButton size="small" onClick={() => handleCopy(classification)}>
                <FileCopyOutlinedIcon fontSize="small" />
              </IconButton>
            )
          }}
        />
      </CardContent>
    </Card>
  );
};

export default TicketAIPanel;
