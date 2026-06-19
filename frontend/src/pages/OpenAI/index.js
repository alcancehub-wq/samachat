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

  const normalizeAttendanceAuditText = value =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const truncateAttendanceAuditText = (value, maxLength = 180) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trim()}...`;
  };

  const getAttendanceAuditReportModel = () =>
    attendanceAuditReports.find(reportItem => reportItem.data?.report?.model)?.data
      ?.report?.model || "-";

  const getAttendanceAuditSectionKey = line => {
    const normalized = normalizeAttendanceAuditText(line);

    if (/resumo executivo/.test(normalized)) return "summary";
    if (/pontos positivos|pontos fortes/.test(normalized)) return "strengths";
    if (/pontos de atencao|pontos criticos|fragilidades/.test(normalized))
      return "attention";
    if (/possiveis motivos|motivos de perda|silencio do cliente/.test(normalized))
      return "lossReasons";
    if (/tickets que merecem|tickets para revisao|revisao manual/.test(normalized))
      return "tickets";
    if (/recomendacoes praticas|recomendacoes/.test(normalized))
      return "recommendations";
    if (/plano de acao/.test(normalized)) return "actionPlan";
    if (/conclusao/.test(normalized)) return "conclusion";

    return null;
  };

  const cleanAttendanceAuditLine = line =>
    String(line || "")
      .replace(/^\s*[-*]\s*/, "")
      .replace(/^\s*\d+[\).]\s*/, "")
      .replace(/^\s*[-]\s*/, "")
      .trim();

  const parseAttendanceAuditContent = content => {
    const sections = {
      summary: [],
      strengths: [],
      attention: [],
      lossReasons: [],
      tickets: [],
      recommendations: [],
      actionPlan: [],
      conclusion: []
    };

    let currentSection = null;

    String(content || "")
      .split(/\r?\n/)
      .forEach(rawLine => {
        const line = String(rawLine || "").trim();

        if (!line || /^---+$/.test(line)) {
          return;
        }

        const sectionKey = getAttendanceAuditSectionKey(line);

        if (sectionKey) {
          currentSection = sectionKey;
          return;
        }

        if (!currentSection) {
          return;
        }

        const cleaned = cleanAttendanceAuditLine(line);

        if (!cleaned || cleaned.length < 4) {
          return;
        }

        sections[currentSection].push(cleaned);
      });

    return sections;
  };

  const getUniqueAttendanceAuditItems = (items, limit = 6) => {
    const seen = new Set();

    return items
      .map(item => String(item || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .filter(item => {
        const key = normalizeAttendanceAuditText(item)
          .replace(/ticket\s*#?\d+/g, "ticket")
          .replace(/#\d+/g, "#")
          .slice(0, 90);

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, limit);
  };

  const splitAttendanceAuditSentences = text => {
    const normalizedText = String(text || "").replace(/\s+/g, " ").trim();
    const sentences = normalizedText.match(/[^.!?]+[.!?]+/g);

    return (sentences || [normalizedText])
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 20);
  };

  const getAttendanceAuditConsolidation = () => {
    const parsedReports = attendanceAuditReports.map(reportItem => ({
      reportItem,
      sections: parseAttendanceAuditContent(reportItem.data?.report?.content || "")
    }));

    const allText = attendanceAuditReports
      .map(reportItem => reportItem.data?.report?.content || "")
      .join("\n");
    const normalizedAllText = normalizeAttendanceAuditText(allText);

    const summaries = parsedReports.flatMap(item => item.sections.summary);
    const strengths = getUniqueAttendanceAuditItems(
      parsedReports.flatMap(item => item.sections.strengths),
      5
    );
    const attention = getUniqueAttendanceAuditItems(
      parsedReports.flatMap(item => item.sections.attention),
      6
    );
    const lossReasons = getUniqueAttendanceAuditItems(
      parsedReports.flatMap(item => item.sections.lossReasons),
      5
    );
    const recommendations = getUniqueAttendanceAuditItems(
      parsedReports.flatMap(item => item.sections.recommendations),
      5
    );
    const actionPlan = getUniqueAttendanceAuditItems(
      parsedReports.flatMap(item => item.sections.actionPlan),
      5
    );

    const summarySentences = getUniqueAttendanceAuditItems(
      splitAttendanceAuditSentences(summaries.join(" ")),
      5
    );

    const ticketRows = [];
    const ticketSeen = new Set();

    parsedReports.forEach(({ sections }) => {
      sections.tickets.forEach(line => {
        const matches = [...line.matchAll(/#(\d+)/g)];

        matches.forEach(match => {
          const ticketId = match[1];

          if (ticketSeen.has(ticketId)) {
            return;
          }

          ticketSeen.add(ticketId);

          const normalized = normalizeAttendanceAuditText(line);
          const priority =
            /sem resposta|abandono|extrem|muito alto|dias|tardia|demora|longo intervalo|critico|inaceitavel/.test(
              normalized
            )
              ? "Alta"
              : "Media";

          ticketRows.push({
            ticket: `#${ticketId}`,
            reason: truncateAttendanceAuditText(
              line.replace(new RegExp(`#${ticketId}:?`, "g"), "").trim() ||
                "Revisao manual recomendada",
              130
            ),
            priority
          });
        });
      });
    });

    const delayMentions = (normalizedAllText.match(
      /tempo|demora|atras|primeira resposta|intervalo/g
    ) || []).length;
    const followUpMentions = (normalizedAllText.match(
      /follow-up|retomar|reengaj|sem retorno|silencio/g
    ) || []).length;
    const clarityMentions = (normalizedAllText.match(
      /clareza|objetiv|perguntas|repetitiv|confus/g
    ) || []).length;
    const highTickets = ticketRows.filter(row => row.priority === "Alta").length;

    const riskLevel =
      highTickets >= 3 || delayMentions >= attendanceAuditReports.length * 5
        ? "Alto"
        : highTickets >= 1 || attention.length >= 4
          ? "Medio"
          : "Baixo";

    const attentionMetrics = [
      {
        label: "Tempo de 1a resposta",
        value: Math.min(92, 38 + delayMentions * 4)
      },
      {
        label: "Follow-up",
        value: Math.min(86, 34 + followUpMentions * 5)
      },
      {
        label: "Objetividade",
        value: Math.min(78, 30 + clarityMentions * 4)
      }
    ];

    const operationalScores = {
      agility: Math.max(18, 88 - delayMentions * 3 - highTickets * 7),
      clarity: Math.max(28, 82 - clarityMentions * 4),
      engagement: Math.max(24, 80 - followUpMentions * 3)
    };

    return {
      summarySentences,
      strengths,
      attention,
      lossReasons,
      recommendations,
      actionPlan,
      ticketRows: ticketRows.slice(0, 8),
      attentionMetrics,
      operationalScores,
      riskLevel
    };
  };

  const renderAttendanceAuditBullets = (items, variant = "neutral") => {
    if (!items.length) {
      return `<div class="empty-state">Nenhum item consolidado nesta secao.</div>`;
    }

    return items
      .map(
        item => `
          <div class="bullet-row ${variant}">
            <span></span>
            <p>${escapeAttendanceAuditHtml(item)}</p>
          </div>
        `
      )
      .join("");
  };

  const renderAttendanceAuditDetailContent = content =>
    String(content || "")
      .split(/\r?\n/)
      .map(rawLine => {
        const line = String(rawLine || "").trim();

        if (!line) {
          return "";
        }

        const escaped = escapeAttendanceAuditHtml(line);
        const sectionKey = getAttendanceAuditSectionKey(line);

        if (sectionKey || /^\d+[\).]\s+/.test(line)) {
          return `<h4>${escaped}</h4>`;
        }

        if (/^[-*]\s+/.test(line)) {
          return `<div class="detail-bullet"><span></span><p>${escapeAttendanceAuditHtml(
            cleanAttendanceAuditLine(line)
          )}</p></div>`;
        }

        if (/^---+$/.test(line)) {
          return `<hr />`;
        }

        return `<p>${escaped}</p>`;
      })
      .join("");

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
    const model = getAttendanceAuditReportModel();
    const totalMessages =
      totals.totalCustomerMessages + totals.totalAgentMessages || 1;
    const customerPercent = Math.round(
      (totals.totalCustomerMessages / totalMessages) * 100
    );
    const agentPercent = Math.max(0, 100 - customerPercent);
    const consolidation = getAttendanceAuditConsolidation();

    const summaryHtml = consolidation.summarySentences.length
      ? consolidation.summarySentences
          .map(sentence => `<p>${escapeAttendanceAuditHtml(sentence)}</p>`)
          .join("")
      : `
        <p>A auditoria analisou ${totals.ticketsAnalyzed} tickets, totalizando ${totalMessages} mensagens trocadas entre clientes e atendentes.</p>
        <p>O relatorio consolidado preserva os lotes completos no anexo tecnico e destaca os principais pontos de gestao para decisao rapida.</p>
      `;

    const attentionBars = consolidation.attentionMetrics
      .map(
        metric => `
          <div class="bar-row">
            <div class="bar-label">${escapeAttendanceAuditHtml(metric.label)}</div>
            <div class="bar-track">
              <div style="width: ${metric.value}%"></div>
            </div>
            <strong>${metric.value}%</strong>
          </div>
        `
      )
      .join("");

    const ticketRowsHtml = consolidation.ticketRows.length
      ? consolidation.ticketRows
          .map(
            row => `
              <tr>
                <td><strong>${escapeAttendanceAuditHtml(row.ticket)}</strong></td>
                <td>${escapeAttendanceAuditHtml(row.reason)}</td>
                <td><span class="priority ${row.priority === "Alta" ? "high" : "medium"}">${escapeAttendanceAuditHtml(row.priority)}</span></td>
              </tr>
            `
          )
          .join("")
      : `
        <tr>
          <td colspan="3">Nenhum ticket especifico foi consolidado para revisao manual.</td>
        </tr>
      `;

    const technicalSections = attendanceAuditReports
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

        return `
          <section class="detail-section">
            <div class="detail-header">
              <div>
                <span class="section-kicker">Anexo tecnico</span>
                <h3>${escapeAttendanceAuditHtml(userName)} - Lote ${reportItem.batchNumber || 1}</h3>
              </div>
              <div class="detail-meta">
                ${returnedTickets} de ${totalTickets} atendimentos
              </div>
            </div>
            <div class="detail-content">
              ${renderAttendanceAuditDetailContent(
                reportItem.data?.report?.content || "Relatorio indisponivel."
              )}
            </div>
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
              margin: 9mm;
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

            .pdf-page {
              page-break-after: always;
            }

            .pdf-page:last-child {
              page-break-after: auto;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 8px;
              color: #111827;
              font-weight: 800;
              font-size: 16px;
              margin-bottom: 10px;
            }

            .brand-mark {
              width: 22px;
              height: 22px;
              border: 3px solid #D90000;
              border-radius: 999px;
              position: relative;
            }

            .brand-mark:after {
              content: "";
              position: absolute;
              left: 2px;
              bottom: -6px;
              width: 8px;
              height: 8px;
              border-left: 3px solid #D90000;
              border-bottom: 3px solid #D90000;
              transform: rotate(-20deg);
              background: #ffffff;
            }

            .brand strong {
              color: #D90000;
            }

            h1 {
              margin: 0;
              font-size: 30px;
              line-height: 1.05;
              letter-spacing: -0.04em;
            }

            .subtitle {
              color: #4b5563;
              margin-top: 6px;
              font-size: 11px;
              font-weight: 600;
            }

            .red-dot {
              display: inline-block;
              width: 5px;
              height: 5px;
              margin: 0 7px 2px;
              border-radius: 999px;
              background: #D90000;
              vertical-align: middle;
            }

            .meta-pills {
              display: flex;
              flex-wrap: wrap;
              gap: 7px;
              margin-top: 14px;
            }

            .pill {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 6px 8px;
              background: #ffffff;
              color: #374151;
              font-size: 9px;
              font-weight: 700;
            }

            .pill b {
              color: #111827;
            }

            .pill .status-open {
              color: #047857;
            }

            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 9px;
              margin-top: 16px;
            }

            .kpi-card {
              min-height: 86px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 11px;
              background: linear-gradient(180deg, #ffffff 0%, #fbfbfc 100%);
            }

            .kpi-icon {
              width: 25px;
              height: 25px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 999px;
              background: #fee2e2;
              color: #D90000;
              font-size: 13px;
              font-weight: 900;
              margin-bottom: 12px;
            }

            .kpi-label {
              color: #4b5563;
              font-size: 10px;
              font-weight: 700;
              min-height: 25px;
            }

            .kpi-value {
              margin-top: 2px;
              color: #030712;
              font-size: 27px;
              line-height: 1;
              font-weight: 900;
              letter-spacing: -0.04em;
            }

            .kpi-value.risk {
              color: #D90000;
              font-size: 25px;
            }

            .dashboard-grid {
              display: grid;
              grid-template-columns: 1.05fr 1.1fr 1fr;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              overflow: hidden;
              margin-top: 13px;
            }

            .dashboard-panel {
              padding: 12px;
              min-height: 150px;
              border-right: 1px solid #e5e7eb;
            }

            .dashboard-panel:last-child {
              border-right: 0;
            }

            .panel-title {
              margin: 0 0 10px;
              color: #111827;
              font-size: 12px;
              font-weight: 800;
            }

            .donut-wrap {
              display: grid;
              grid-template-columns: 0.75fr 1fr 0.75fr;
              align-items: center;
              gap: 8px;
            }

            .donut {
              width: 94px;
              height: 94px;
              border-radius: 999px;
              background: conic-gradient(#D90000 0 ${agentPercent}%, #d1d5db ${agentPercent}% 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto;
            }

            .donut-inner {
              width: 58px;
              height: 58px;
              border-radius: 999px;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              color: #111827;
              font-size: 9px;
              font-weight: 700;
            }

            .donut-inner strong {
              display: block;
              font-size: 16px;
              line-height: 1.05;
            }

            .legend-box {
              color: #4b5563;
              font-size: 9px;
              font-weight: 700;
            }

            .legend-box strong {
              display: block;
              color: #111827;
              font-size: 16px;
              margin-top: 4px;
            }

            .legend-dot {
              display: inline-block;
              width: 7px;
              height: 7px;
              border-radius: 999px;
              margin-right: 4px;
              background: #d1d5db;
            }

            .legend-dot.red {
              background: #D90000;
            }

            .bar-row {
              display: grid;
              grid-template-columns: 72px 1fr 30px;
              align-items: center;
              gap: 8px;
              margin: 10px 0;
            }

            .bar-label {
              color: #374151;
              font-size: 9px;
              font-weight: 700;
            }

            .bar-track {
              height: 18px;
              border-radius: 4px;
              background: #f3f4f6;
              overflow: hidden;
            }

            .bar-track div {
              height: 100%;
              border-radius: 4px;
              background: linear-gradient(90deg, #ef4444, #D90000);
            }

            .bar-row strong {
              color: #111827;
              font-size: 10px;
              text-align: right;
            }

            .score-row {
              display: grid;
              grid-template-columns: 26px 1fr 32px;
              align-items: center;
              gap: 8px;
              padding: 7px 0;
              border-bottom: 1px solid #f3f4f6;
            }

            .score-row:last-child {
              border-bottom: 0;
            }

            .score-icon {
              width: 23px;
              height: 23px;
              border-radius: 999px;
              background: #fee2e2;
              color: #D90000;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
            }

            .score-label {
              color: #374151;
              font-size: 10px;
              font-weight: 800;
            }

            .spark {
              height: 12px;
              margin-top: 4px;
              background:
                linear-gradient(135deg, transparent 0 18%, #ef4444 18% 22%, transparent 22% 40%, #ef4444 40% 44%, transparent 44% 60%, #ef4444 60% 64%, transparent 64% 100%);
              opacity: 0.9;
            }

            .score-value {
              font-size: 20px;
              line-height: 1;
              font-weight: 900;
              text-align: right;
            }

            .score-value.alert {
              color: #D90000;
            }

            .summary-card {
              display: grid;
              grid-template-columns: 36px 1fr;
              gap: 12px;
              margin-top: 14px;
              padding: 14px;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              background: #ffffff;
            }

            .section-icon {
              width: 32px;
              height: 32px;
              border-radius: 999px;
              background: #D90000;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 17px;
              font-weight: 900;
            }

            .summary-card h2,
            .compact-section h2 {
              margin: 0 0 6px;
              color: #111827;
              font-size: 15px;
              line-height: 1.1;
            }

            .summary-card p {
              margin: 2px 0;
              color: #1f2937;
              font-size: 10.5px;
              line-height: 1.38;
            }

            .insights-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 14px;
            }

            .compact-section {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 13px;
              background: #ffffff;
            }

            .compact-section.good h2 {
              color: #047857;
            }

            .compact-section.warning h2 {
              color: #D90000;
            }

            .bullet-row {
              display: grid;
              grid-template-columns: 12px 1fr;
              gap: 7px;
              margin: 6px 0;
              align-items: start;
            }

            .bullet-row span {
              width: 8px;
              height: 8px;
              margin-top: 4px;
              border-radius: 999px;
              background: #9ca3af;
            }

            .bullet-row.good span {
              background: #047857;
            }

            .bullet-row.warning span {
              background: #D90000;
            }

            .bullet-row p {
              margin: 0;
              color: #1f2937;
              font-size: 10px;
              line-height: 1.35;
            }

            .audit-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              overflow: hidden;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              margin-top: 8px;
              font-size: 9.5px;
            }

            .audit-table th {
              background: #f9fafb;
              color: #374151;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            .audit-table th,
            .audit-table td {
              padding: 7px 8px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
            }

            .audit-table tr:last-child td {
              border-bottom: 0;
            }

            .priority {
              display: inline-block;
              min-width: 44px;
              padding: 2px 7px;
              border-radius: 999px;
              text-align: center;
              font-size: 9px;
              font-weight: 800;
            }

            .priority.high {
              background: #D90000;
              color: #ffffff;
            }

            .priority.medium {
              background: #fff7ed;
              color: #c2410c;
              border: 1px solid #fdba74;
            }

            .action-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-top: 9px;
            }

            .action-card {
              display: grid;
              grid-template-columns: 24px 1fr;
              gap: 8px;
              align-items: start;
              padding: 11px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              background: #ffffff;
            }

            .action-number {
              width: 21px;
              height: 21px;
              border-radius: 999px;
              background: #D90000;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 11px;
            }

            .action-card strong {
              display: block;
              color: #111827;
              font-size: 11px;
              line-height: 1.2;
              margin-bottom: 3px;
            }

            .action-card p {
              margin: 0;
              color: #4b5563;
              font-size: 9px;
              line-height: 1.25;
            }

            .footer {
              margin-top: 14px;
              padding-top: 8px;
              border-top: 2px solid #D90000;
              color: #6b7280;
              font-size: 9px;
              text-align: center;
            }

            .page-title {
              margin: 0 0 10px;
              font-size: 18px;
              letter-spacing: -0.02em;
            }

            .consolidated-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 11px;
            }

            .detail-section {
              page-break-inside: auto;
              break-inside: auto;
              margin-bottom: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              overflow: hidden;
            }

            .detail-header {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              align-items: center;
              padding: 10px 12px;
              background: #111827;
              color: #ffffff;
            }

            .section-kicker {
              display: block;
              color: #fca5a5;
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              font-weight: 800;
              margin-bottom: 2px;
            }

            .detail-header h3 {
              margin: 0;
              color: #ffffff;
              font-size: 13px;
              line-height: 1.15;
            }

            .detail-meta {
              color: #ffffff;
              border: 1px solid rgba(255,255,255,0.25);
              border-radius: 999px;
              padding: 4px 8px;
              font-size: 9px;
              white-space: nowrap;
            }

            .detail-content {
              padding: 10px 12px 12px;
            }

            .detail-content h4 {
              margin: 10px 0 5px;
              color: #D90000;
              font-size: 11px;
              line-height: 1.2;
              border-bottom: 1px solid #fee2e2;
              padding-bottom: 3px;
            }

            .detail-content h4:first-child {
              margin-top: 0;
            }

            .detail-content p {
              margin: 3px 0;
              color: #1f2937;
              font-size: 9.2px;
              line-height: 1.32;
            }

            .detail-bullet {
              display: grid;
              grid-template-columns: 10px 1fr;
              gap: 6px;
              margin: 3px 0;
            }

            .detail-bullet span {
              width: 5px;
              height: 5px;
              border-radius: 999px;
              background: #D90000;
              margin-top: 5px;
            }

            .detail-bullet p {
              margin: 0;
            }

            .detail-content hr {
              border: 0;
              border-top: 1px solid #e5e7eb;
              margin: 7px 0;
            }

            .empty-state {
              color: #6b7280;
              font-size: 10px;
              padding: 8px;
              background: #f9fafb;
              border-radius: 8px;
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
            <section class="pdf-page">
              <div class="brand">
                <span class="brand-mark"></span>
                <span><strong>Sama</strong>Chat</span>
              </div>

              <h1>Auditoria IA de Atendimento</h1>
              <div class="subtitle">
                Relatorio Gerencial <span class="red-dot"></span> Periodo ${escapeAttendanceAuditHtml(attendanceAuditFilters.dateFrom || "-")} a ${escapeAttendanceAuditHtml(attendanceAuditFilters.dateTo || "-")}
              </div>

              <div class="meta-pills">
                <div class="pill">Usuario: <b>${escapeAttendanceAuditHtml(selectedUsers || "-")}</b></div>
                <div class="pill">Status: <b class="status-open">${escapeAttendanceAuditHtml(attendanceAuditFilters.status || "Todos")}</b></div>
                <div class="pill">Gerado em: <b>${escapeAttendanceAuditHtml(generatedAt)}</b></div>
                <div class="pill">Modelo: <b>${escapeAttendanceAuditHtml(model)}</b></div>
              </div>

              <section class="kpi-grid">
                <div class="kpi-card">
                  <div class="kpi-icon">T</div>
                  <div class="kpi-label">Tickets analisados</div>
                  <div class="kpi-value">${totals.ticketsAnalyzed}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-icon">C</div>
                  <div class="kpi-label">Mensagens cliente</div>
                  <div class="kpi-value">${totals.totalCustomerMessages}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-icon">A</div>
                  <div class="kpi-label">Mensagens atendente</div>
                  <div class="kpi-value">${totals.totalAgentMessages}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-icon">L</div>
                  <div class="kpi-label">Lotes analisados</div>
                  <div class="kpi-value">${attendanceAuditReports.length}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-icon">!</div>
                  <div class="kpi-label">Risco geral</div>
                  <div class="kpi-value risk">${escapeAttendanceAuditHtml(consolidation.riskLevel)}</div>
                </div>
              </section>

              <section class="dashboard-grid">
                <div class="dashboard-panel">
                  <h2 class="panel-title">Volume de mensagens</h2>
                  <div class="donut-wrap">
                    <div class="legend-box">
                      <span class="legend-dot"></span>Cliente
                      <strong>${totals.totalCustomerMessages}</strong>
                      ${customerPercent}%
                    </div>
                    <div class="donut">
                      <div class="donut-inner">
                        <div>Total<strong>${totalMessages}</strong>mensagens</div>
                      </div>
                    </div>
                    <div class="legend-box">
                      <span class="legend-dot red"></span>Atendente
                      <strong>${totals.totalAgentMessages}</strong>
                      ${agentPercent}%
                    </div>
                  </div>
                </div>

                <div class="dashboard-panel">
                  <h2 class="panel-title">Principais pontos de atencao</h2>
                  ${attentionBars}
                </div>

                <div class="dashboard-panel">
                  <h2 class="panel-title">Score operacional</h2>
                  <div class="score-row">
                    <div class="score-icon">A</div>
                    <div>
                      <div class="score-label">Agilidade</div>
                      <div class="spark"></div>
                    </div>
                    <div class="score-value alert">${consolidation.operationalScores.agility}</div>
                  </div>
                  <div class="score-row">
                    <div class="score-icon">C</div>
                    <div>
                      <div class="score-label">Clareza</div>
                      <div class="spark"></div>
                    </div>
                    <div class="score-value">${consolidation.operationalScores.clarity}</div>
                  </div>
                  <div class="score-row">
                    <div class="score-icon">E</div>
                    <div>
                      <div class="score-label">Engajamento</div>
                      <div class="spark"></div>
                    </div>
                    <div class="score-value">${consolidation.operationalScores.engagement}</div>
                  </div>
                </div>
              </section>

              <section class="summary-card">
                <div class="section-icon">R</div>
                <div>
                  <h2>Resumo Executivo</h2>
                  ${summaryHtml}
                </div>
              </section>

              <section class="insights-grid">
                <div class="compact-section good">
                  <h2>Pontos Fortes</h2>
                  ${renderAttendanceAuditBullets(consolidation.strengths, "good")}
                </div>

                <div class="compact-section warning">
                  <h2>Pontos de Atencao</h2>
                  ${renderAttendanceAuditBullets(consolidation.attention.slice(0, 4), "warning")}
                </div>
              </section>

              <section class="compact-section" style="margin-top: 13px;">
                <h2>Tickets para revisao manual</h2>
                <table class="audit-table">
                  <thead>
                    <tr>
                      <th style="width: 18%;">Ticket</th>
                      <th>Motivo</th>
                      <th style="width: 18%;">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ticketRowsHtml}
                  </tbody>
                </table>
              </section>

              <section class="compact-section" style="margin-top: 13px;">
                <h2>Plano de Acao Recomendado</h2>
                <div class="action-grid">
                  <div class="action-card">
                    <div class="action-number">1</div>
                    <div>
                      <strong>Reduzir tempo de 1a resposta.</strong>
                      <p>Estabelecer metas e acompanhar tickets recentes com prioridade operacional.</p>
                    </div>
                  </div>
                  <div class="action-card">
                    <div class="action-number">2</div>
                    <div>
                      <strong>Reforcar follow-up estruturado.</strong>
                      <p>Padronizar cadencias, proximos passos e retomadas de clientes silenciosos.</p>
                    </div>
                  </div>
                  <div class="action-card">
                    <div class="action-number">3</div>
                    <div>
                      <strong>Padronizar conducao objetiva.</strong>
                      <p>Reduzir excesso de perguntas e orientar mensagens claras para avancar o atendimento.</p>
                    </div>
                  </div>
                </div>
              </section>

              <div class="footer">
                Documento gerado automaticamente pelo SamaChat para apoio gerencial.
              </div>
            </section>

            <section class="pdf-page">
              <h2 class="page-title">Consolidado gerencial dos lotes</h2>

              <div class="consolidated-grid">
                <div class="compact-section good">
                  <h2>Pontos fortes recorrentes</h2>
                  ${renderAttendanceAuditBullets(consolidation.strengths, "good")}
                </div>

                <div class="compact-section warning">
                  <h2>Pontos de atencao recorrentes</h2>
                  ${renderAttendanceAuditBullets(consolidation.attention, "warning")}
                </div>

                <div class="compact-section warning">
                  <h2>Possiveis motivos de perda ou silencio</h2>
                  ${renderAttendanceAuditBullets(consolidation.lossReasons, "warning")}
                </div>

                <div class="compact-section">
                  <h2>Recomendacoes praticas</h2>
                  ${renderAttendanceAuditBullets(consolidation.recommendations, "neutral")}
                </div>

                <div class="compact-section" style="grid-column: 1 / -1;">
                  <h2>Plano de acao consolidado para o gestor</h2>
                  ${renderAttendanceAuditBullets(
                    consolidation.actionPlan.length
                      ? consolidation.actionPlan
                      : [
                          "Monitorar diariamente tickets com alto tempo de resposta.",
                          "Realizar feedback individual com base nos tickets de maior risco.",
                          "Padronizar follow-up e criterios de encerramento ou reengajamento."
                        ],
                    "neutral"
                  )}
                </div>
              </div>

              <div class="footer">
                Os itens acima sao consolidados a partir dos lotes analisados. O anexo tecnico preserva o conteudo completo.
              </div>
            </section>

            <section>
              <h2 class="page-title">Anexo tecnico completo por lote</h2>
              ${technicalSections}
            </section>
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
  };  const handleSandboxAction = async action => {
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
