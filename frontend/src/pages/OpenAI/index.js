import React, { useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  InputAdornment,
  Switch,
  TextField,
  Typography,
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from "@material-ui/core";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles(theme => ({
  card: {
    marginBottom: theme.spacing(2)
  },
  sectionTitle: {
    marginBottom: theme.spacing(1)
  },
  logsTable: {
    whiteSpace: "nowrap"
  },
  muted: {
    color: theme.palette.text.secondary
  },
  switchBase: {
    color: "rgba(15, 23, 42, 0.28)",
    "&$switchChecked": {
      color: "#FF1919",
      "& + $switchTrack": {
        backgroundColor: "rgba(255, 25, 25, 0.42)",
        opacity: 1,
      },
    },
  },
  switchChecked: {},
  switchTrack: {
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    opacity: 1,
  },
  embeddedRoot: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2)
  }
}));

const OpenAI = ({ embedded = false }) => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  const [settings, setSettings] = useState({
    apiKey: "",
    isActive: false,
    model: "gpt-4o-mini",
    temperature: 0.7,
    topP: 1,
    maxTokens: 400,
    presencePenalty: 0,
    frequencyPenalty: 0,
    systemPrompt: "",
    suggestionPrompt: "",
    rewritePrompt: "",
    summaryPrompt: "",
    classificationPrompt: "",
    autoReplyEnabled: false,
    autoReplyPrompt: "",
    maxRequestsPerDay: "",
    maxRequestsPerHour: ""
  });

  const [hasApiKey, setHasApiKey] = useState(false);
  const [clearApiKey, setClearApiKey] = useState(false);

  const [sandboxText, setSandboxText] = useState("");
  const [sandboxTicketId, setSandboxTicketId] = useState("");
  const [sandboxResult, setSandboxResult] = useState("");

  const [logs, setLogs] = useState([]);

  const hasValidKey = useMemo(() => {
    if (clearApiKey) {
      return false;
    }

    return Boolean(settings.apiKey || hasApiKey);
  }, [clearApiKey, settings.apiKey, hasApiKey]);

  const normalizedPayload = useMemo(() => {
    const payload = {
      isActive: settings.isActive,
      model: settings.model,
      temperature: Number(settings.temperature),
      topP: Number(settings.topP),
      maxTokens: Number(settings.maxTokens),
      presencePenalty: Number(settings.presencePenalty),
      frequencyPenalty: Number(settings.frequencyPenalty),
      systemPrompt: settings.systemPrompt || null,
      suggestionPrompt: settings.suggestionPrompt || null,
      rewritePrompt: settings.rewritePrompt || null,
      summaryPrompt: settings.summaryPrompt || null,
      classificationPrompt: settings.classificationPrompt || null,
      autoReplyEnabled: settings.autoReplyEnabled,
      autoReplyPrompt: settings.autoReplyPrompt || null,
      maxRequestsPerDay:
        settings.maxRequestsPerDay === "" ? null : Number(settings.maxRequestsPerDay),
      maxRequestsPerHour:
        settings.maxRequestsPerHour === "" ? null : Number(settings.maxRequestsPerHour)
    };

    if (clearApiKey) {
      payload.apiKey = null;
    } else if (settings.apiKey) {
      payload.apiKey = settings.apiKey;
    }

    return payload;
  }, [settings, clearApiKey]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/openai/settings");

      setSettings(prev => ({
        ...prev,
        isActive: Boolean(data.isActive),
        model: data.model || "gpt-4o-mini",
        temperature: data.temperature ?? 0.7,
        topP: data.topP ?? 1,
        maxTokens: data.maxTokens ?? 400,
        presencePenalty: data.presencePenalty ?? 0,
        frequencyPenalty: data.frequencyPenalty ?? 0,
        systemPrompt: data.systemPrompt || "",
        suggestionPrompt: data.suggestionPrompt || "",
        rewritePrompt: data.rewritePrompt || "",
        summaryPrompt: data.summaryPrompt || "",
        classificationPrompt: data.classificationPrompt || "",
        autoReplyEnabled: Boolean(data.autoReplyEnabled),
        autoReplyPrompt: data.autoReplyPrompt || "",
        maxRequestsPerDay: data.maxRequestsPerDay ?? "",
        maxRequestsPerHour: data.maxRequestsPerHour ?? ""
      }));

      setHasApiKey(Boolean(data.apiKey));
      setClearApiKey(false);
      setSettings(prev => ({ ...prev, apiKey: "" }));
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const loadLogs = async () => {
    setRefreshingLogs(true);
    try {
      const { data } = await api.get("/openai/logs", { params: { limit: 50 } });
      setLogs(data || []);
    } catch (err) {
      toastError(err);
    }
    setRefreshingLogs(false);
  };

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/openai/settings", normalizedPayload);
      toast.success(i18n.t("openai.settings.saved"));
      await loadSettings();
    } catch (err) {
      toastError(err);
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/openai/settings/test");
      toast.success(data?.message || i18n.t("openai.settings.testSuccess"));
    } catch (err) {
      toastError(err);
    }
    setTesting(false);
  };

  const handleSandboxAction = async action => {
    if (!sandboxText && action !== "summarize") {
      toast.error(i18n.t("openai.sandbox.emptyText"));
      return;
    }

    try {
      setSandboxResult("");
      const payload = { text: sandboxText };

      if (sandboxTicketId) {
        payload.ticketId = Number(sandboxTicketId);
      }

      const routeMap = {
        suggest: "/openai/suggest",
        rewrite: "/openai/rewrite",
        classify: "/openai/classify",
        summarize: "/openai/summarize"
      };

      if (action === "summarize") {
        if (!sandboxTicketId) {
          toast.error(i18n.t("openai.sandbox.ticketRequired"));
          return;
        }
        delete payload.text;
      }

      const { data } = await api.post(routeMap[action], payload);
      setSandboxResult(data?.content || "");
      await loadLogs();
    } catch (err) {
      toastError(err);
    }
  };

  const content = (
    <>
      {!embedded && (
        <MainHeader>
        <Title>{i18n.t("openai.title")}</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleTest}
            disabled={testing || loading || !settings.isActive || !hasValidKey}
          >
            {i18n.t("openai.settings.test")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {i18n.t("openai.settings.save")}
          </Button>
        </MainHeaderButtonsWrapper>
        </MainHeader>
      )}

      <Card className={classes.card} variant="outlined">
        <CardContent>
          <Typography variant="h6" className={classes.sectionTitle}>
            {i18n.t("openai.settings.title")}
          </Typography>
          <Typography variant="body2" className={classes.muted}>
            {i18n.t("openai.settings.subtitle")}
          </Typography>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.apiKey")}
                type="password"
                value={settings.apiKey}
                onChange={event =>
                  setSettings(prev => ({ ...prev, apiKey: event.target.value }))
                }
                placeholder={
                  hasApiKey ? i18n.t("openai.settings.apiKeyStored") : ""
                }
                helperText={
                  hasApiKey && !settings.apiKey
                    ? i18n.t("openai.settings.apiKeyStored")
                    : undefined
                }
                fullWidth
                variant="outlined"
                margin="dense"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={clearApiKey}
                    classes={{
                      switchBase: classes.switchBase,
                      checked: classes.switchChecked,
                      track: classes.switchTrack,
                    }}
                    onChange={event => setClearApiKey(event.target.checked)}
                  />
                }
                label={i18n.t("openai.settings.clearKey")}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.isActive}
                    classes={{
                      switchBase: classes.switchBase,
                      checked: classes.switchChecked,
                      track: classes.switchTrack,
                    }}
                    onChange={event =>
                      setSettings(prev => ({
                        ...prev,
                        isActive: event.target.checked
                      }))
                    }
                  />
                }
                label={i18n.t("openai.settings.active")}
              />
              <TextField
                label={i18n.t("openai.settings.model")}
                value={settings.model}
                onChange={event =>
                  setSettings(prev => ({ ...prev, model: event.target.value }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={i18n.t("openai.settings.temperature")}
                type="number"
                value={settings.temperature}
                onChange={event =>
                  setSettings(prev => ({ ...prev, temperature: event.target.value }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: 0, max: 2, step: 0.1 } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={i18n.t("openai.settings.topP")}
                type="number"
                value={settings.topP}
                onChange={event =>
                  setSettings(prev => ({ ...prev, topP: event.target.value }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: 0, max: 1, step: 0.05 } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={i18n.t("openai.settings.maxTokens")}
                type="number"
                value={settings.maxTokens}
                onChange={event =>
                  setSettings(prev => ({ ...prev, maxTokens: event.target.value }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: 16, max: 4000, step: 1 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.presencePenalty")}
                type="number"
                value={settings.presencePenalty}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    presencePenalty: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: -2, max: 2, step: 0.1 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.frequencyPenalty")}
                type="number"
                value={settings.frequencyPenalty}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    frequencyPenalty: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: -2, max: 2, step: 0.1 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.maxRequestsPerDay")}
                type="number"
                value={settings.maxRequestsPerDay}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    maxRequestsPerDay: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: 1, step: 1 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.maxRequestsPerHour")}
                type="number"
                value={settings.maxRequestsPerHour}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    maxRequestsPerHour: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: 1, step: 1 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={i18n.t("openai.settings.systemPrompt")}
                value={settings.systemPrompt}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    systemPrompt: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.suggestionPrompt")}
                value={settings.suggestionPrompt}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    suggestionPrompt: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.rewritePrompt")}
                value={settings.rewritePrompt}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    rewritePrompt: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.summaryPrompt")}
                value={settings.summaryPrompt}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    summaryPrompt: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={i18n.t("openai.settings.classificationPrompt")}
                value={settings.classificationPrompt}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    classificationPrompt: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoReplyEnabled}
                    classes={{
                      switchBase: classes.switchBase,
                      checked: classes.switchChecked,
                      track: classes.switchTrack,
                    }}
                    onChange={event =>
                      setSettings(prev => ({
                        ...prev,
                        autoReplyEnabled: event.target.checked
                      }))
                    }
                  />
                }
                label={i18n.t("openai.settings.autoReplyEnabled")}
              />
              <TextField
                label={i18n.t("openai.settings.autoReplyPrompt")}
                value={settings.autoReplyPrompt}
                onChange={event =>
                  setSettings(prev => ({
                    ...prev,
                    autoReplyPrompt: event.target.value
                  }))
                }
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                minRows={2}
                disabled={!settings.autoReplyEnabled}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card className={classes.card} variant="outlined">
        <CardContent>
          <Typography variant="h6" className={classes.sectionTitle}>
            {i18n.t("openai.sandbox.title")}
          </Typography>
          <Typography variant="body2" className={classes.muted}>
            {i18n.t("openai.sandbox.subtitle")}
          </Typography>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12} md={8}>
              <TextField
                label={i18n.t("openai.sandbox.text")}
                value={sandboxText}
                onChange={event => setSandboxText(event.target.value)}
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                minRows={4}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={i18n.t("openai.sandbox.ticketId")}
                value={sandboxTicketId}
                onChange={event => setSandboxTicketId(event.target.value)}
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">#</InputAdornment>
                  )
                }}
              />
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  onClick={() => handleSandboxAction("suggest")}
                  disabled={!settings.isActive || !hasValidKey}
                >
                  {i18n.t("openai.sandbox.suggest")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleSandboxAction("rewrite")}
                  disabled={!settings.isActive || !hasValidKey}
                >
                  {i18n.t("openai.sandbox.rewrite")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleSandboxAction("classify")}
                  disabled={!settings.isActive || !hasValidKey}
                >
                  {i18n.t("openai.sandbox.classify")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleSandboxAction("summarize")}
                  disabled={!settings.isActive || !hasValidKey}
                >
                  {i18n.t("openai.sandbox.summarize")}
                </Button>
              </div>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={i18n.t("openai.sandbox.result")}
                value={sandboxResult}
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                minRows={3}
                InputProps={{ readOnly: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card className={classes.card} variant="outlined">
        <CardContent>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6" className={classes.sectionTitle}>
              {i18n.t("openai.logs.title")}
            </Typography>
            <Button
              variant="outlined"
              onClick={loadLogs}
              disabled={refreshingLogs}
            >
              {i18n.t("openai.logs.refresh")}
            </Button>
          </div>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t("openai.logs.columns.action")}</TableCell>
                <TableCell>{i18n.t("openai.logs.columns.status")}</TableCell>
                <TableCell>{i18n.t("openai.logs.columns.model")}</TableCell>
                <TableCell>{i18n.t("openai.logs.columns.tokens")}</TableCell>
                <TableCell>{i18n.t("openai.logs.columns.duration")}</TableCell>
                <TableCell>{i18n.t("openai.logs.columns.createdAt")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className={classes.muted}>
                    {i18n.t("openai.logs.empty")}
                  </TableCell>
                </TableRow>
              )}
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className={classes.logsTable}>{log.action}</TableCell>
                  <TableCell className={classes.logsTable}>{log.status}</TableCell>
                  <TableCell className={classes.logsTable}>{log.model || "-"}</TableCell>
                  <TableCell className={classes.logsTable}>
                    {log.totalTokens || "-"}
                  </TableCell>
                  <TableCell className={classes.logsTable}>
                    {log.durationMs ? `${log.durationMs}ms` : "-"}
                  </TableCell>
                  <TableCell className={classes.logsTable}>
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );

  if (embedded) {
    return <div className={classes.embeddedRoot}>{content}</div>;
  }

  return <MainContainer>{content}</MainContainer>;
};

export default OpenAI;
