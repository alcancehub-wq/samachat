import React, { useEffect, useMemo, useState } from "react";
import Autocomplete from "@material-ui/lab/Autocomplete";

import {
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
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

  const [attendanceAuditLoading, setAttendanceAuditLoading] = useState(false);
  const [attendanceAuditUserSearch, setAttendanceAuditUserSearch] = useState("");
  const [attendanceAuditUsers, setAttendanceAuditUsers] = useState([]);
  const [attendanceAuditSelectedUsers, setAttendanceAuditSelectedUsers] = useState([]);
  const [attendanceAuditFilters, setAttendanceAuditFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    limit: 10
  });
  const [attendanceAuditReports, setAttendanceAuditReports] = useState([]);

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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const fetchAttendanceAuditUsers = async () => {
        try {
          const { data } = await api.get("/users/", {
            params: {
              searchParam: attendanceAuditUserSearch,
              pageNumber: 1
            }
          });

          setAttendanceAuditUsers(data?.users || []);
        } catch (err) {
          toastError(err);
        }
      };

      fetchAttendanceAuditUsers();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [attendanceAuditUserSearch]);

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
  const handleAttendanceAuditFilterChange = event => {
    const { name, value } = event.target;

    setAttendanceAuditFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAttendanceAuditReport = async () => {
    if (attendanceAuditSelectedUsers.length === 0) {
      toast.error("Selecione pelo menos um usuario para auditar.");
      return;
    }

    if (!attendanceAuditFilters.dateFrom || !attendanceAuditFilters.dateTo) {
      toast.error("Informe o periodo da auditoria.");
      return;
    }

    setAttendanceAuditLoading(true);

    try {
      setAttendanceAuditReports([]);

      const reportResults = [];
      const totalLimitPerUser = Math.min(
        Math.max(Number(attendanceAuditFilters.limit) || 10, 1),
        50
      );
      const safeBatchSize = Math.min(totalLimitPerUser, 5);
      const maxBatchesPerUser = Math.ceil(totalLimitPerUser / safeBatchSize);

      for (const selectedUser of attendanceAuditSelectedUsers) {
        let offset = 0;
        let batchNumber = 1;
        let processedTickets = 0;
        let hasMore = true;

        while (
          hasMore &&
          processedTickets < totalLimitPerUser &&
          batchNumber <= maxBatchesPerUser
        ) {
          const remainingTickets = totalLimitPerUser - processedTickets;
          const params = {
            userId: Number(selectedUser.id),
            dateFrom: attendanceAuditFilters.dateFrom,
            dateTo: attendanceAuditFilters.dateTo,
            limit: Math.min(safeBatchSize, remainingTickets),
            offset
          };

          if (attendanceAuditFilters.status) {
            params.status = attendanceAuditFilters.status;
          }

          const { data } = await api.get("/attendance-audit/report", { params });
          const pagination = data?.pagination || {};
          const returnedTickets =
            pagination.returnedTickets ?? data?.summary?.ticketsAnalyzed ?? 0;

          reportResults.push({
            user: selectedUser,
            batchNumber,
            offset,
            data
          });

          processedTickets += returnedTickets;

          hasMore = Boolean(
            returnedTickets > 0 &&
              pagination.hasMore &&
              pagination.nextOffset !== null &&
              pagination.nextOffset !== undefined &&
              processedTickets < totalLimitPerUser
          );

          if (hasMore) {
            offset = Number(pagination.nextOffset);
            batchNumber += 1;
          }
        }

        if (hasMore) {
          toast.warn(
            `Auditoria de ${selectedUser.name || selectedUser.email || selectedUser.id} pausada no limite seguro de ${maxBatchesPerUser} lotes.`
          );
        }
      }

      setAttendanceAuditReports(reportResults);
      toast.success("Relatorio de auditoria gerado com sucesso.");
      await loadLogs();
    } catch (err) {
      toastError(err);
    }

    setAttendanceAuditLoading(false);
  };

  const getAttendanceAuditTotals = () =>
    attendanceAuditReports.reduce(
      (totals, reportItem) => ({
        ticketsAnalyzed:
          totals.ticketsAnalyzed + (reportItem.data?.summary?.ticketsAnalyzed || 0),
        totalCustomerMessages:
          totals.totalCustomerMessages +
          (reportItem.data?.summary?.totalCustomerMessages || 0),
        totalAgentMessages:
          totals.totalAgentMessages +
          (reportItem.data?.summary?.totalAgentMessages || 0)
      }),
      {
        ticketsAnalyzed: 0,
        totalCustomerMessages: 0,
        totalAgentMessages: 0
      }
    );

  const escapeAttendanceAuditHtml = value =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const handleAttendanceAuditPdfExport = () => {
    if (!attendanceAuditReports.length) {
      toast.error("Gere uma auditoria antes de exportar o PDF.");
      return;
    }

    const totals = getAttendanceAuditTotals();
    const generatedAt = new Date().toLocaleString("pt-BR");
    const selectedUsers = attendanceAuditSelectedUsers
      .map(user => user?.name || user?.email || user?.id)
      .filter(Boolean)
      .join(", ");

    const reportSections = attendanceAuditReports
      .map(reportItem => {
        const userName =
          reportItem.user?.name || reportItem.user?.email || reportItem.user?.id || "-";
        const returnedTickets =
          reportItem.data?.pagination?.returnedTickets ??
          reportItem.data?.summary?.ticketsAnalyzed ??
          0;
        const totalTickets =
          reportItem.data?.pagination?.totalTickets ??
          reportItem.data?.summary?.ticketsAnalyzed ??
          0;
        const content = escapeAttendanceAuditHtml(
          reportItem.data?.report?.content || "Relatorio indisponivel."
        );

        return `
          <section class="report-section">
            <div class="section-meta">
              <span>Usuario: ${escapeAttendanceAuditHtml(userName)}</span>
              <span>Lote: ${reportItem.batchNumber || 1}</span>
              <span>Atendimentos neste lote: ${returnedTickets} de ${totalTickets}</span>
            </div>
            <pre>${content}</pre>
          </section>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Auditoria IA de Atendimento</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              color: #111827;
              background: #ffffff;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10px;
              line-height: 1.35;
            }

            .cover {
              border-bottom: 3px solid #D90000;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }

            .eyebrow {
              color: #D90000;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              margin-bottom: 8px;
            }

            h1 {
              margin: 0;
              font-size: 20px;
              line-height: 1.15;
            }

            .subtitle {
              color: #4b5563;
              margin-top: 4px;
              font-size: 10px;
            }

            .meta-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 5px 10px;
              margin-top: 10px;
              padding: 8px;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              background: #f9fafb;
            }

            .meta-item strong {
              display: block;
              color: #374151;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            .cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 6px;
              margin: 10px 0 12px;
            }

            .card {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 7px;
              background: #ffffff;
            }

            .card-label {
              color: #6b7280;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            .card-value {
              margin-top: 5px;
              color: #111827;
              font-size: 15px;
              font-weight: 700;
            }

            .report-section {
              break-inside: auto;
              page-break-inside: auto;
              border-top: 1px solid #e5e7eb;
              padding-top: 8px;
              margin-top: 10px;
            }

            .section-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 5px;
              margin-bottom: 6px;
            }

            .section-meta span {
              border: 1px solid #e5e7eb;
              border-radius: 999px;
              padding: 3px 6px;
              background: #f9fafb;
              color: #374151;
              font-size: 9px;
            }

            pre {
              white-space: pre-wrap;
              word-break: break-word;
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 9px;
              line-height: 1.28;
            }

            .footer {
              margin-top: 12px;
              padding-top: 7px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 10px;
              text-align: center;
            }

            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <main>
            <section class="cover">
              <div class="eyebrow">SamaChat | Auditoria IA</div>
              <h1>Relatorio de Auditoria de Atendimento</h1>
              <div class="subtitle">
                Relatorio gerencial gerado a partir dos atendimentos selecionados no SamaChat.
              </div>

              <div class="meta-grid">
                <div class="meta-item">
                  <strong>Usuarios</strong>
                  ${escapeAttendanceAuditHtml(selectedUsers || "-")}
                </div>
                <div class="meta-item">
                  <strong>Gerado em</strong>
                  ${escapeAttendanceAuditHtml(generatedAt)}
                </div>
                <div class="meta-item">
                  <strong>Periodo</strong>
                  ${escapeAttendanceAuditHtml(attendanceAuditFilters.dateFrom || "-")} ate ${escapeAttendanceAuditHtml(attendanceAuditFilters.dateTo || "-")}
                </div>
                <div class="meta-item">
                  <strong>Status</strong>
                  ${escapeAttendanceAuditHtml(attendanceAuditFilters.status || "Todos")}
                </div>
              </div>
            </section>

            <section class="cards">
              <div class="card">
                <div class="card-label">Tickets analisados</div>
                <div class="card-value">${totals.ticketsAnalyzed}</div>
              </div>
              <div class="card">
                <div class="card-label">Mensagens cliente</div>
                <div class="card-value">${totals.totalCustomerMessages}</div>
              </div>
              <div class="card">
                <div class="card-label">Mensagens atendente</div>
                <div class="card-value">${totals.totalAgentMessages}</div>
              </div>
              <div class="card">
                <div class="card-label">Lotes</div>
                <div class="card-value">${attendanceAuditReports.length}</div>
              </div>
            </section>

            ${reportSections}

            <div class="footer">
              Documento gerado automaticamente pelo SamaChat. Revise tickets criticos antes de decisoes operacionais sensiveis.
            </div>
          </main>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("Nao foi possivel abrir a janela de exportacao. Verifique o bloqueador de pop-ups.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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
          <Typography variant="h6" className={classes.sectionTitle}>
            Auditoria IA de Atendimento
          </Typography>
          <Typography variant="body2" className={classes.muted}>
            Gere um relatorio gerencial sobre os atendimentos de um usuario em um periodo.
          </Typography>

          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12} md={4}>
              <Autocomplete
                multiple
                options={attendanceAuditUsers}
                value={attendanceAuditSelectedUsers}
                onChange={(event, value) => setAttendanceAuditSelectedUsers(value)}
                onInputChange={(event, value) => setAttendanceAuditUserSearch(value)}
                getOptionLabel={option =>
                  option?.name
                    ? option.email
                      ? `${option.name} - ${option.email}`
                      : option.name
                    : ""
                }
                getOptionSelected={(option, value) => option.id === value.id}
                filterSelectedOptions
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Usuarios"
                    placeholder="Buscar por nome ou e-mail"
                    fullWidth
                    variant="outlined"
                    margin="dense"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Data inicial"
                name="dateFrom"
                value={attendanceAuditFilters.dateFrom}
                onChange={handleAttendanceAuditFilterChange}
                fullWidth
                variant="outlined"
                margin="dense"
                type="date"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Data final"
                name="dateTo"
                value={attendanceAuditFilters.dateTo}
                onChange={handleAttendanceAuditFilterChange}
                fullWidth
                variant="outlined"
                margin="dense"
                type="date"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                label="Status"
                name="status"
                value={attendanceAuditFilters.status}
                onChange={handleAttendanceAuditFilterChange}
                fullWidth
                variant="outlined"
                margin="dense"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="open">Aberto</MenuItem>
                <MenuItem value="pending">Pendente</MenuItem>
                <MenuItem value="closed">Resolvido</MenuItem>
                <MenuItem value="lost">Perdido</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Limite por usuario"
                name="limit"
                value={attendanceAuditFilters.limit}
                onChange={handleAttendanceAuditFilterChange}
                fullWidth
                variant="outlined"
                margin="dense"
                type="number"
                helperText="Maximo de atendimentos/tickets analisados por usuario no periodo."
                InputProps={{ inputProps: { min: 1, max: 50, step: 1 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAttendanceAuditReport}
                disabled={
                  attendanceAuditLoading ||
                  loading ||
                  !settings.isActive ||
                  !hasValidKey
                }
              >
                {attendanceAuditLoading ? "Gerando relatorio..." : "Gerar auditoria"}
              </Button>

              <Button
                variant="outlined"
                color="primary"
                onClick={handleAttendanceAuditPdfExport}
                disabled={attendanceAuditLoading || attendanceAuditReports.length === 0}
                style={{ marginLeft: 12 }}
              >
                Exportar PDF
              </Button>
            </Grid>

            {attendanceAuditReports.length > 0 && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Tickets analisados"
                    value={attendanceAuditReports.reduce(
                        (sum, reportItem) =>
                          sum + (reportItem.data?.summary?.ticketsAnalyzed || 0),
                        0
                      )}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Mensagens do cliente"
                    value={attendanceAuditReports.reduce(
                        (sum, reportItem) =>
                          sum + (reportItem.data?.summary?.totalCustomerMessages || 0),
                        0
                      )}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Mensagens do atendente"
                    value={attendanceAuditReports.reduce(
                        (sum, reportItem) =>
                          sum + (reportItem.data?.summary?.totalAgentMessages || 0),
                        0
                      )}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Modelo"
                    value={attendanceAuditReports[0]?.data?.report?.model || "-"}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Relatorio gerado"
                    value={attendanceAuditReports
                      .map(reportItem =>
                        [
                          `Usuario: ${reportItem.user?.name || reportItem.user?.email || reportItem.user?.id}`,
                          `Lote: ${reportItem.batchNumber || 1}`,
                          `Atendimentos neste lote: ${reportItem.data?.pagination?.returnedTickets ?? reportItem.data?.summary?.ticketsAnalyzed ?? 0} de ${reportItem.data?.pagination?.totalTickets ?? reportItem.data?.summary?.ticketsAnalyzed ?? 0}`,
                          "",
                          reportItem.data?.report?.content || ""
                        ].join("\n")
                      )
                      .join("\n\n------------------------------\n\n") || ""}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    multiline
                    minRows={12}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </>
            )}
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
