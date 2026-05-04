import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import CircularProgress from "@material-ui/core/CircularProgress";
import Container from "@material-ui/core/Container";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import {
  AccessTime,
  AssignmentTurnedIn,
  Autorenew,
  Contacts,
  DoneAll,
  Forum,
  MailOutline,
  PowerSettingsNew,
  Schedule,
} from "@material-ui/icons";

import toastError from "../../errors/toastError";
import {
  getDashboardDateRange,
  loadDashboardData,
  loadDashboardFilterOptions,
} from "../../services/dashboard";
import { i18n } from "../../translate/i18n";

const emptyDashboard = {
  summary: {
    openTickets: 0,
    pendingTickets: 0,
    closedTickets: 0,
    unreadTickets: 0,
    contactsCount: 0,
    ticketsInPeriodCount: 0,
    ticketsTodayCount: 0,
    connectedConnections: 0,
    attentionConnections: 0,
    disconnectedConnections: 0,
    openTasks: 0,
    overdueTasks: 0,
    pendingSchedules: 0,
    scheduledInPeriodCount: 0,
    todaySchedules: 0,
    publishedFlows: 0,
    scheduledCampaigns: 0,
  },
  sla: {
    targetMinutes: 15,
    firstResponseRate: null,
    averageFirstResponseMinutes: null,
    averageResolutionHours: null,
    respondedTickets: 0,
  },
  charts: {
    ticketsTimeline: [],
    timelineMode: "hour",
    ticketsByQueue: [],
  },
  filters: {
    period: "today",
    queueId: null,
    assigneeId: null,
  },
  connections: [],
  recentTickets: [],
  urgentTasks: [],
  upcomingSchedules: [],
};

const useStyles = makeStyles(theme => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(5),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      paddingTop: theme.spacing(2),
      paddingBottom: theme.spacing(3),
      paddingLeft: 0,
      paddingRight: 0,
    },
  },
  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2.5),
    padding: theme.spacing(0, 0.5),
    [theme.breakpoints.down("md")]: {
      flexDirection: "column",
    },
  },
  headerMain: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  pageTitle: {
    fontWeight: 700,
    fontSize: "2.1rem",
    lineHeight: 1.08,
    letterSpacing: "-0.03em",
    color: theme.palette.text.primary,
    [theme.breakpoints.down("sm")]: {
      fontSize: "1.75rem",
    },
  },
  pageSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.95rem",
    fontWeight: 400,
    lineHeight: 1.7,
    maxWidth: 760,
  },
  headerMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: theme.spacing(1.25),
    [theme.breakpoints.down("md")]: {
      alignItems: "flex-start",
      width: "100%",
    },
  },
  lastUpdated: {
    fontSize: "0.8125rem",
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  actionBar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
    [theme.breakpoints.down("md")]: {
      justifyContent: "flex-start",
    },
  },
  primaryButton: {
    borderRadius: 6,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: 600,
    boxShadow: "none",
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: "none",
    },
  },
  secondaryButton: {
    borderRadius: 6,
    fontWeight: 600,
    borderColor: theme.custom.panelBorderStrong,
  },
  filtersBar: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: theme.spacing(1.25),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(1.25),
    borderRadius: 16,
    border: `1px solid ${theme.custom.panelBorder}`,
    backgroundColor: theme.palette.background.paper,
    backgroundImage: theme.custom.panelGradient,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  filterControl: {
    width: "100%",
    "& .MuiOutlinedInput-root": {
      backgroundColor: theme.custom.inputBackground,
      borderRadius: 10,
    },
    "& .MuiInputLabel-root": {
      color: theme.palette.text.secondary,
    },
  },
  filterHint: {
    marginTop: theme.spacing(0.25),
    color: theme.palette.text.secondary,
    fontSize: "0.8rem",
  },
  statsGrid: {
    marginBottom: theme.spacing(1.5),
  },
  statCard: {
    position: "relative",
    minHeight: 178,
    overflow: "hidden",
    borderRadius: 18,
    border: `1px solid ${theme.custom.panelBorder}`,
    backgroundColor: theme.palette.background.paper,
    backgroundImage: theme.custom.panelGradientSoft,
    padding: theme.spacing(2.5),
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  clickableCard: {
    cursor: "pointer",
  },
  statAccent: {
    position: "absolute",
    inset: 0,
    opacity: 0.08,
    pointerEvents: "none",
  },
  statHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
  },
  statIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: "0.88rem",
    lineHeight: 1.5,
  },
  statValue: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: "2.45rem",
    lineHeight: 1,
    letterSpacing: "-0.05em",
    marginTop: theme.spacing(2),
  },
  statHelper: {
    color: theme.palette.text.secondary,
    fontSize: "0.84rem",
    lineHeight: 1.5,
    marginTop: theme.spacing(1.25),
  },
  sectionPaper: {
    height: "100%",
    borderRadius: 18,
    border: `1px solid ${theme.custom.panelBorder}`,
    backgroundColor: theme.palette.background.paper,
    backgroundImage: theme.custom.panelGradient,
    padding: theme.spacing(2.5),
    display: "flex",
    flexDirection: "column",
    boxShadow: "none",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2.25),
  },
  sectionTitle: {
    fontWeight: 700,
    fontSize: "1.08rem",
    color: theme.palette.text.primary,
  },
  sectionSubtitle: {
    fontSize: "0.89rem",
    color: theme.palette.text.secondary,
    lineHeight: 1.6,
    marginTop: theme.spacing(0.5),
  },
  chartWrap: {
    width: "100%",
    height: 320,
    [theme.breakpoints.down("sm")]: {
      height: 260,
    },
  },
  compactChartWrap: {
    width: "100%",
    height: 310,
    [theme.breakpoints.down("sm")]: {
      height: 260,
    },
  },
  loadingPaper: {
    minHeight: 320,
    borderRadius: 18,
    border: `1px solid ${theme.custom.panelBorder}`,
    backgroundColor: theme.palette.background.paper,
    backgroundImage: theme.custom.panelGradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: theme.spacing(1.25),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  summaryBadge: {
    padding: theme.spacing(1.4, 1.5),
    borderRadius: 14,
    border: `1px solid ${theme.custom.panelBorder}`,
    backgroundColor: theme.custom.softBackground,
  },
  summaryBadgeLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  summaryBadgeValue: {
    fontSize: "1.6rem",
    lineHeight: 1,
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  connectionList: {
    padding: 0,
    margin: 0,
  },
  connectionItem: {
    padding: theme.spacing(1.25, 0),
    borderTop: `1px solid ${theme.palette.divider}`,
    "&:first-child": {
      borderTop: "none",
    },
  },
  connectionTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  connectionName: {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  mutedText: {
    color: theme.palette.text.secondary,
  },
  miniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  miniCard: {
    borderRadius: 14,
    border: `1px solid ${theme.custom.panelBorder}`,
    backgroundColor: theme.custom.softBackground,
    padding: theme.spacing(1.5),
    minHeight: 118,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  miniLabel: {
    fontSize: "0.82rem",
    lineHeight: 1.5,
    color: theme.palette.text.secondary,
    fontWeight: 600,
  },
  miniValue: {
    fontSize: "1.8rem",
    lineHeight: 1,
    color: theme.palette.text.primary,
    fontWeight: 700,
    letterSpacing: "-0.04em",
  },
  miniHelper: {
    color: theme.palette.text.secondary,
    fontSize: "0.78rem",
    lineHeight: 1.45,
    marginTop: theme.spacing(0.75),
  },
  list: {
    padding: 0,
  },
  listItem: {
    padding: theme.spacing(1.5, 0),
    borderTop: `1px solid ${theme.palette.divider}`,
    alignItems: "flex-start",
    cursor: "default",
    "&:first-child": {
      borderTop: "none",
      paddingTop: 0,
    },
    "&:last-child": {
      paddingBottom: 0,
    },
  },
  clickableItem: {
    cursor: "pointer",
  },
  listPrimary: {
    fontWeight: 600,
    color: theme.palette.text.primary,
    lineHeight: 1.5,
    marginBottom: theme.spacing(0.5),
  },
  listSecondary: {
    color: theme.palette.text.secondary,
    lineHeight: 1.6,
  },
  inlineMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    alignItems: "center",
    marginTop: theme.spacing(0.75),
  },
  statusChip: {
    height: 28,
    borderRadius: 999,
    fontWeight: 700,
    fontSize: "0.72rem",
    border: "1px solid transparent",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: theme.palette.text.secondary,
    minHeight: 180,
  },
  tooltipCard: {
    borderRadius: 12,
    border: `1px solid ${theme.custom.panelBorderStrong}`,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1.25, 1.5),
  },
  tooltipLabel: {
    fontWeight: 700,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(0.5),
  },
  tooltipValue: {
    color: theme.palette.text.secondary,
    fontSize: "0.84rem",
  },
  queueActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),
  },
  queueActionButton: {
    borderRadius: 999,
    fontWeight: 600,
  },
}));

const truncateText = (value, size = 88) => {
  if (!value) {
    return null;
  }

  if (value.length <= size) {
    return value;
  }

  return `${value.slice(0, size).trim()}...`;
};

const formatDateTime = value => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

const formatTime = value => {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const ChartTooltip = ({ active, payload, label, classes }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <Paper className={classes.tooltipCard} elevation={0}>
      <Typography className={classes.tooltipLabel}>{label}</Typography>
      {payload.map(item => (
        <Typography key={item.name} className={classes.tooltipValue}>
          {item.name}: {item.value}
        </Typography>
      ))}
    </Paper>
  );
};

const Dashboard = () => {
  const classes = useStyles();
  const history = useHistory();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    period: "today",
    queueId: "all",
    assigneeId: "all",
  });

  const tones = {
    primary: {
      accent: "#FF1919",
      soft: "rgba(255, 25, 25, 0.10)",
    },
    success: {
      accent: "#2E7D32",
      soft: "rgba(46, 125, 50, 0.10)",
    },
    warning: {
      accent: "#ED6C02",
      soft: "rgba(237, 108, 2, 0.11)",
    },
    info: {
      accent: "#0284C7",
      soft: "rgba(2, 132, 199, 0.11)",
    },
  };

  const periodLabels = {
    today: i18n.t("dashboard.periods.today"),
    "7d": i18n.t("dashboard.periods.7d"),
    "30d": i18n.t("dashboard.periods.30d"),
  };

  const selectedPeriodLabel = periodLabels[filters.period] || periodLabels.today;

  const applyDashboardData = data => {
    setDashboard({
      ...emptyDashboard,
      ...data,
      summary: {
        ...emptyDashboard.summary,
        ...(data.summary || {}),
      },
      sla: {
        ...emptyDashboard.sla,
        ...(data.sla || {}),
      },
      charts: {
        ...emptyDashboard.charts,
        ...(data.charts || {}),
      },
      filters: {
        ...emptyDashboard.filters,
        ...(data.filters || {}),
      },
      connections: data.connections || [],
      recentTickets: data.recentTickets || [],
      urgentTasks: data.urgentTasks || [],
      upcomingSchedules: data.upcomingSchedules || [],
    });
    setLastUpdatedAt(new Date());
  };

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const data = await loadDashboardFilterOptions();

        if (!isMounted) {
          return;
        }

        setQueues(data.queues || []);
        setUsers(data.users || []);
      } catch (err) {
        if (isMounted) {
          toastError(err);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        if (lastUpdatedAt) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await loadDashboardData(filters);

        if (!isMounted) {
          return;
        }

        applyDashboardData(data);
      } catch (err) {
        if (isMounted) {
          toastError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [filters.period, filters.queueId, filters.assigneeId]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await loadDashboardData(filters);
      applyDashboardData(data);
    } catch (err) {
      toastError(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = event => {
    const { name, value } = event.target;
    setFilters(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const selectedQueueIds =
    filters.queueId !== "all" ? [Number(filters.queueId)] : undefined;
  const selectedAssigneeId =
    filters.assigneeId !== "all" ? Number(filters.assigneeId) : undefined;
  const dateRange = getDashboardDateRange(filters.period);

  const handleTicketDrillDown = (status, queueOverride) => {
    const queueIds = queueOverride ? [queueOverride] : selectedQueueIds;

    if (status === "closed") {
      history.push("/tickets", {
        dashboardFilters: {
          tab: "closed",
          queueIds,
          showAllTickets: true,
        },
      });
      return;
    }

    history.push("/tickets", {
      dashboardFilters: {
        tab: "open",
        tabOpen: status,
        queueIds,
        showAllTickets: true,
      },
    });
  };

  const handleTaskDrillDown = extraFilters => {
    history.push("/tasks", {
      dashboardFilters: {
        assigneeId: selectedAssigneeId,
        ...extraFilters,
      },
    });
  };

  const handleScheduleDrillDown = extraFilters => {
    history.push("/schedules", {
      dashboardFilters: {
        assigneeId: selectedAssigneeId,
        scheduledFrom: dateRange.start,
        scheduledTo: dateRange.end,
        ...extraFilters,
      },
    });
  };

  const statusLabels = {
    open: i18n.t("dashboard.status.open"),
    pending: i18n.t("dashboard.status.pending"),
    closed: i18n.t("dashboard.status.closed"),
  };

  const connectionStateLabels = {
    connected: i18n.t("dashboard.status.connected"),
    attention: i18n.t("dashboard.status.attention"),
    disconnected: i18n.t("dashboard.status.disconnected"),
  };

  const priorityLabels = {
    high: i18n.t("dashboard.priority.high"),
    medium: i18n.t("dashboard.priority.medium"),
    low: i18n.t("dashboard.priority.low"),
  };

  const getConnectionState = status => {
    if (status === "CONNECTED") {
      return "connected";
    }

    if (["OPENING", "PAIRING", "TIMEOUT", "qrcode"].includes(status)) {
      return "attention";
    }

    return "disconnected";
  };

  const getStatusChipStyle = status => {
    if (status === "open" || status === "connected") {
      return {
        color: tones.success.accent,
        backgroundColor: tones.success.soft,
        borderColor: tones.success.soft,
      };
    }

    if (status === "pending" || status === "attention") {
      return {
        color: tones.warning.accent,
        backgroundColor: tones.warning.soft,
        borderColor: tones.warning.soft,
      };
    }

    return {
      color: tones.primary.accent,
      backgroundColor: tones.primary.soft,
      borderColor: tones.primary.soft,
    };
  };

  const summaryCards = [
    {
      key: "openTickets",
      label: i18n.t("dashboard.messages.inAttendance.title"),
      value: dashboard.summary.openTickets,
      helper: `${dashboard.summary.unreadTickets} ${i18n.t("dashboard.recent.unread")}`,
      icon: Forum,
      tone: tones.primary,
      onClick: () => handleTicketDrillDown("open"),
    },
    {
      key: "pendingTickets",
      label: i18n.t("dashboard.messages.waiting.title"),
      value: dashboard.summary.pendingTickets,
      helper: `${dashboard.summary.ticketsInPeriodCount} ${selectedPeriodLabel}`,
      icon: AccessTime,
      tone: tones.warning,
      onClick: () => handleTicketDrillDown("pending"),
    },
    {
      key: "closedTickets",
      label: i18n.t("dashboard.messages.closed.title"),
      value: dashboard.summary.closedTickets,
      helper: i18n.t("dashboard.sections.recent.subtitle"),
      icon: DoneAll,
      tone: tones.success,
      onClick: () => handleTicketDrillDown("closed"),
    },
    {
      key: "unreadTickets",
      label: i18n.t("dashboard.summary.unread"),
      value: dashboard.summary.unreadTickets,
      helper: i18n.t("dashboard.sections.timeline.subtitle", { period: selectedPeriodLabel }),
      icon: MailOutline,
      tone: tones.info,
    },
    {
      key: "contactsCount",
      label: i18n.t("dashboard.summary.contacts"),
      value: dashboard.summary.contactsCount,
      helper: i18n.t("dashboard.sections.queues.subtitle"),
      icon: Contacts,
      tone: tones.info,
      onClick: () => history.push("/contacts"),
    },
    {
      key: "connectedConnections",
      label: i18n.t("dashboard.summary.activeConnections"),
      value: dashboard.summary.connectedConnections,
      helper: `${dashboard.summary.attentionConnections} ${i18n.t("dashboard.connections.attention")}`,
      icon: PowerSettingsNew,
      tone: tones.success,
      onClick: () => history.push("/connections"),
    },
    {
      key: "pendingSchedules",
      label: i18n.t("dashboard.summary.pendingSchedules"),
      value: dashboard.summary.pendingSchedules,
      helper: `${dashboard.summary.scheduledInPeriodCount} ${selectedPeriodLabel}`,
      icon: Schedule,
      tone: tones.warning,
      onClick: () => handleScheduleDrillDown({ statusFilter: "pending" }),
    },
    {
      key: "openTasks",
      label: i18n.t("dashboard.workbench.openTasks"),
      value: dashboard.summary.openTasks,
      helper: `${dashboard.summary.overdueTasks} ${i18n.t("dashboard.workbench.overdueTasks")}`,
      icon: AssignmentTurnedIn,
      tone: tones.primary,
      onClick: () => handleTaskDrillDown({ statusFilter: "open" }),
    },
  ];

  const actionButtons = [
    {
      label: i18n.t("dashboard.buttons.tickets"),
      path: "/tickets",
      variant: "contained",
      className: classes.primaryButton,
    },
    {
      label: i18n.t("dashboard.buttons.connections"),
      path: "/connections",
      variant: "outlined",
      className: classes.secondaryButton,
    },
    {
      label: i18n.t("dashboard.buttons.tasks"),
      path: "/tasks",
      variant: "outlined",
      className: classes.secondaryButton,
    },
    {
      label: i18n.t("dashboard.buttons.schedules"),
      path: "/schedules",
      variant: "outlined",
      className: classes.secondaryButton,
    },
  ];

  return (
    <Container maxWidth="xl" className={classes.container}>
      <div className={classes.pageHeader}>
        <div className={classes.headerMain}>
          <Typography className={classes.pageTitle}>
            {i18n.t("dashboard.title")}
          </Typography>
          <Typography className={classes.pageSubtitle}>
            {i18n.t("dashboard.subtitle")}
          </Typography>
        </div>

        <div className={classes.headerMeta}>
          <Typography className={classes.lastUpdated}>
            {i18n.t("dashboard.lastUpdated", { time: formatTime(lastUpdatedAt) })}
          </Typography>
          <div className={classes.actionBar}>
            {actionButtons.map(button => (
              <Button
                key={button.path}
                variant={button.variant}
                className={button.className}
                onClick={() => history.push(button.path)}
              >
                {button.label}
              </Button>
            ))}
            <Button
              variant="outlined"
              className={classes.secondaryButton}
              startIcon={refreshing ? <CircularProgress size={14} /> : <Autorenew />}
              onClick={handleRefresh}
            >
              {i18n.t("dashboard.buttons.refresh")}
            </Button>
          </div>
        </div>
      </div>

      <Paper className={classes.filtersBar} elevation={0}>
        <div>
          <FormControl variant="outlined" className={classes.filterControl}>
            <InputLabel>{i18n.t("dashboard.filters.period")}</InputLabel>
            <Select
              label={i18n.t("dashboard.filters.period")}
              name="period"
              value={filters.period}
              onChange={handleFilterChange}
            >
              <MenuItem value="today">{i18n.t("dashboard.periods.today")}</MenuItem>
              <MenuItem value="7d">{i18n.t("dashboard.periods.7d")}</MenuItem>
              <MenuItem value="30d">{i18n.t("dashboard.periods.30d")}</MenuItem>
            </Select>
          </FormControl>
          <Typography className={classes.filterHint}>
            {i18n.t("dashboard.filters.periodHint")}
          </Typography>
        </div>

        <div>
          <FormControl variant="outlined" className={classes.filterControl}>
            <InputLabel>{i18n.t("dashboard.filters.queue")}</InputLabel>
            <Select
              label={i18n.t("dashboard.filters.queue")}
              name="queueId"
              value={filters.queueId}
              onChange={handleFilterChange}
            >
              <MenuItem value="all">{i18n.t("dashboard.filters.allQueues")}</MenuItem>
              {queues.map(queue => (
                <MenuItem key={queue.id} value={String(queue.id)}>
                  {queue.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography className={classes.filterHint}>
            {i18n.t("dashboard.filters.queueHint")}
          </Typography>
        </div>

        <div>
          <FormControl variant="outlined" className={classes.filterControl}>
            <InputLabel>{i18n.t("dashboard.filters.assignee")}</InputLabel>
            <Select
              label={i18n.t("dashboard.filters.assignee")}
              name="assigneeId"
              value={filters.assigneeId}
              onChange={handleFilterChange}
            >
              <MenuItem value="all">{i18n.t("dashboard.filters.allAssignees")}</MenuItem>
              {users.map(user => (
                <MenuItem key={user.id} value={String(user.id)}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography className={classes.filterHint}>
            {i18n.t("dashboard.filters.assigneeHint")}
          </Typography>
        </div>
      </Paper>

      {loading ? (
        <Paper className={classes.loadingPaper} elevation={0}>
          <CircularProgress size={30} />
        </Paper>
      ) : (
        <React.Fragment>
          <Grid container spacing={3} className={classes.statsGrid}>
            {summaryCards.map(card => {
              const Icon = card.icon;

              return (
                <Grid item xs={12} sm={6} md={4} xl={3} key={card.key}>
                  <Paper
                    className={`${classes.statCard} ${card.onClick ? classes.clickableCard : ""}`}
                    elevation={0}
                    onClick={card.onClick}
                  >
                    <div
                      className={classes.statAccent}
                      style={{
                        background: `linear-gradient(135deg, ${card.tone.soft} 0%, transparent 70%)`,
                      }}
                    />
                    <div className={classes.statHeader}>
                      <div>
                        <Typography className={classes.statLabel}>{card.label}</Typography>
                        <Typography className={classes.statValue}>{card.value}</Typography>
                      </div>
                      <div
                        className={classes.statIconWrap}
                        style={{
                          backgroundColor: card.tone.soft,
                          color: card.tone.accent,
                        }}
                      >
                        <Icon />
                      </div>
                    </div>
                    <Typography className={classes.statHelper}>{card.helper}</Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Paper className={classes.sectionPaper} elevation={0}>
                <div className={classes.sectionHeader}>
                  <div>
                    <Typography className={classes.sectionTitle}>
                      {i18n.t("dashboard.sections.timeline.title")}
                    </Typography>
                    <Typography className={classes.sectionSubtitle}>
                      {i18n.t("dashboard.sections.timeline.subtitle", {
                        period: selectedPeriodLabel,
                      })}
                    </Typography>
                  </div>
                </div>

                {dashboard.charts.ticketsTimeline.length ? (
                  <div className={classes.chartWrap}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.charts.ticketsTimeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7DEE7" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip classes={classes} />} />
                        <Bar
                          dataKey="count"
                          name={selectedPeriodLabel}
                          fill="#FF1919"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className={classes.emptyState}>{i18n.t("dashboard.sections.empty")}</div>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper className={classes.sectionPaper} elevation={0}>
                <div className={classes.sectionHeader}>
                  <div>
                    <Typography className={classes.sectionTitle}>
                      {i18n.t("dashboard.sections.connections.title")}
                    </Typography>
                    <Typography className={classes.sectionSubtitle}>
                      {i18n.t("dashboard.sections.connections.subtitle")}
                    </Typography>
                  </div>
                </div>

                <div className={classes.summaryRow}>
                  <div className={classes.summaryBadge}>
                    <Typography className={classes.summaryBadgeLabel}>
                      {i18n.t("dashboard.connections.connected")}
                    </Typography>
                    <Typography className={classes.summaryBadgeValue}>
                      {dashboard.summary.connectedConnections}
                    </Typography>
                  </div>
                  <div className={classes.summaryBadge}>
                    <Typography className={classes.summaryBadgeLabel}>
                      {i18n.t("dashboard.connections.attention")}
                    </Typography>
                    <Typography className={classes.summaryBadgeValue}>
                      {dashboard.summary.attentionConnections}
                    </Typography>
                  </div>
                  <div className={classes.summaryBadge}>
                    <Typography className={classes.summaryBadgeLabel}>
                      {i18n.t("dashboard.connections.disconnected")}
                    </Typography>
                    <Typography className={classes.summaryBadgeValue}>
                      {dashboard.summary.disconnectedConnections}
                    </Typography>
                  </div>
                </div>

                {dashboard.connections.length ? (
                  <List className={classes.connectionList}>
                    {dashboard.connections.map(connection => {
                      const state = getConnectionState(connection.status);

                      return (
                        <ListItem key={connection.id} className={classes.connectionItem} disableGutters>
                          <ListItemText
                            disableTypography
                            primary={
                              <div className={classes.connectionTitle}>
                                <Typography className={classes.connectionName}>
                                  {connection.name || `WhatsApp ${connection.id}`}
                                </Typography>
                                <Chip
                                  label={connectionStateLabels[state]}
                                  className={classes.statusChip}
                                  style={getStatusChipStyle(state)}
                                />
                              </div>
                            }
                            secondary={
                              <Typography variant="body2" className={classes.mutedText}>
                                {i18n.t("dashboard.connections.updated", {
                                  time: formatTime(connection.updatedAt),
                                })}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <div className={classes.emptyState}>{i18n.t("dashboard.connections.noData")}</div>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} lg={7}>
              <Paper className={classes.sectionPaper} elevation={0}>
                <div className={classes.sectionHeader}>
                  <div>
                    <Typography className={classes.sectionTitle}>
                      {i18n.t("dashboard.sections.queues.title")}
                    </Typography>
                    <Typography className={classes.sectionSubtitle}>
                      {i18n.t("dashboard.sections.queues.subtitle")}
                    </Typography>
                  </div>
                </div>

                {dashboard.charts.ticketsByQueue.length ? (
                  <React.Fragment>
                    <div className={classes.compactChartWrap}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard.charts.ticketsByQueue} layout="vertical" margin={{ left: 24 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D7DEE7" />
                          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey="queueName"
                            tickLine={false}
                            axisLine={false}
                            width={118}
                            tickFormatter={value => value || i18n.t("dashboard.recent.noQueue")}
                          />
                          <Tooltip content={<ChartTooltip classes={classes} />} />
                          <Bar dataKey="open" stackId="queue" name={i18n.t("dashboard.status.open")} fill="#FF1919" />
                          <Bar dataKey="pending" stackId="queue" name={i18n.t("dashboard.status.pending")} fill="#F4B740" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className={classes.queueActions}>
                      {dashboard.charts.ticketsByQueue
                        .filter(queue => Boolean(queue.queueId))
                        .map(queue => (
                          <Button
                            key={queue.queueId}
                            variant="outlined"
                            className={classes.queueActionButton}
                            onClick={() => handleTicketDrillDown("open", queue.queueId)}
                          >
                            {queue.queueName}
                          </Button>
                        ))}
                    </div>
                  </React.Fragment>
                ) : (
                  <div className={classes.emptyState}>{i18n.t("dashboard.sections.empty")}</div>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Paper className={classes.sectionPaper} elevation={0}>
                <div className={classes.sectionHeader}>
                  <div>
                    <Typography className={classes.sectionTitle}>
                      {i18n.t("dashboard.sections.workbench.title")}
                    </Typography>
                    <Typography className={classes.sectionSubtitle}>
                      {i18n.t("dashboard.sections.workbench.subtitle")}
                    </Typography>
                  </div>
                </div>

                <div className={classes.miniGrid}>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.workbench.openTasks")}</Typography>
                    <Typography className={classes.miniValue}>{dashboard.summary.openTasks}</Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.workbench.overdueTasks")}</Typography>
                    <Typography className={classes.miniValue}>{dashboard.summary.overdueTasks}</Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.workbench.pendingSchedules")}</Typography>
                    <Typography className={classes.miniValue}>{dashboard.summary.pendingSchedules}</Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.workbench.scheduledInPeriod")}</Typography>
                    <Typography className={classes.miniValue}>{dashboard.summary.scheduledInPeriodCount}</Typography>
                    <Typography className={classes.miniHelper}>{selectedPeriodLabel}</Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.workbench.publishedFlows")}</Typography>
                    <Typography className={classes.miniValue}>{dashboard.summary.publishedFlows}</Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.workbench.scheduledCampaigns")}</Typography>
                    <Typography className={classes.miniValue}>{dashboard.summary.scheduledCampaigns}</Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.sla.firstResponseRate")}</Typography>
                    <Typography className={classes.miniValue}>
                      {dashboard.sla.firstResponseRate === null ? "-" : `${dashboard.sla.firstResponseRate}%`}
                    </Typography>
                    <Typography className={classes.miniHelper}>
                      {dashboard.sla.respondedTickets} {i18n.t("dashboard.sla.respondedTickets")}
                    </Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.sla.averageFirstResponse")}</Typography>
                    <Typography className={classes.miniValue}>
                      {dashboard.sla.averageFirstResponseMinutes === null ? "-" : dashboard.sla.averageFirstResponseMinutes}
                    </Typography>
                    <Typography className={classes.miniHelper}>{i18n.t("dashboard.sla.minutes")}</Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.sla.averageResolution")}</Typography>
                    <Typography className={classes.miniValue}>
                      {dashboard.sla.averageResolutionHours === null ? "-" : dashboard.sla.averageResolutionHours}
                    </Typography>
                    <Typography className={classes.miniHelper}>{i18n.t("dashboard.sla.hours")}</Typography>
                  </div>
                  <div className={classes.miniCard}>
                    <Typography className={classes.miniLabel}>{i18n.t("dashboard.sla.target")}</Typography>
                    <Typography className={classes.miniValue}>{dashboard.sla.targetMinutes}</Typography>
                    <Typography className={classes.miniHelper}>{i18n.t("dashboard.sla.minutes")}</Typography>
                  </div>
                </div>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper className={classes.sectionPaper} elevation={0}>
                <div className={classes.sectionHeader}>
                  <div>
                    <Typography className={classes.sectionTitle}>
                      {i18n.t("dashboard.sections.recent.title")}
                    </Typography>
                    <Typography className={classes.sectionSubtitle}>
                      {i18n.t("dashboard.sections.recent.subtitle")}
                    </Typography>
                  </div>
                </div>

                {dashboard.recentTickets.length ? (
                  <List className={classes.list}>
                    {dashboard.recentTickets.map(ticket => (
                      <ListItem
                        button
                        disableGutters
                        key={ticket.id}
                        className={`${classes.listItem} ${classes.clickableItem}`}
                        onClick={() => history.push(`/tickets/${ticket.id}`)}
                      >
                        <ListItemText
                          disableTypography
                          primary={
                            <React.Fragment>
                              <Typography className={classes.listPrimary}>
                                {ticket.contactName || `${i18n.t("dashboard.recent.unassigned")} #${ticket.id}`}
                              </Typography>
                              <Typography variant="body2" className={classes.listSecondary}>
                                {truncateText(ticket.lastMessage, 96) || i18n.t("dashboard.recent.noMessage")}
                              </Typography>
                              <div className={classes.inlineMeta}>
                                <Chip
                                  label={statusLabels[ticket.status] || ticket.status}
                                  className={classes.statusChip}
                                  style={getStatusChipStyle(ticket.status)}
                                />
                                <Chip
                                  label={ticket.queueName || i18n.t("dashboard.recent.noQueue")}
                                  className={classes.statusChip}
                                />
                                {ticket.unreadMessages > 0 && (
                                  <Chip
                                    label={`${ticket.unreadMessages} ${i18n.t("dashboard.recent.unread")}`}
                                    className={classes.statusChip}
                                    style={getStatusChipStyle("pending")}
                                  />
                                )}
                              </div>
                            </React.Fragment>
                          }
                          secondary={
                            <Typography variant="body2" className={classes.listSecondary}>
                              {(ticket.userName || i18n.t("dashboard.recent.unassigned")) + " • " + formatDateTime(ticket.updatedAt)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <div className={classes.emptyState}>{i18n.t("dashboard.sections.empty")}</div>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Paper className={classes.sectionPaper} elevation={0}>
                <div className={classes.sectionHeader}>
                  <div>
                    <Typography className={classes.sectionTitle}>
                      {i18n.t("dashboard.sections.tasks.title")}
                    </Typography>
                    <Typography className={classes.sectionSubtitle}>
                      {i18n.t("dashboard.sections.tasks.subtitle")}
                    </Typography>
                  </div>
                </div>

                {dashboard.urgentTasks.length ? (
                  <List className={classes.list}>
                    {dashboard.urgentTasks.map(task => (
                      <ListItem key={task.id} className={classes.listItem} disableGutters>
                        <ListItemText
                          disableTypography
                          primary={
                            <React.Fragment>
                              <Typography className={classes.listPrimary}>{task.title}</Typography>
                              <div className={classes.inlineMeta}>
                                <Chip
                                  label={priorityLabels[task.priority] || task.priority}
                                  className={classes.statusChip}
                                  style={getStatusChipStyle(task.priority === "high" ? "closed" : task.priority === "medium" ? "pending" : "open")}
                                />
                              </div>
                            </React.Fragment>
                          }
                          secondary={
                            <Typography variant="body2" className={classes.listSecondary}>
                              {(task.assigneeName || i18n.t("dashboard.recent.unassigned")) + " • " + formatDateTime(task.dueAt)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <div className={classes.emptyState}>{i18n.t("dashboard.sections.empty")}</div>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Paper className={classes.sectionPaper} elevation={0}>
                <div className={classes.sectionHeader}>
                  <div>
                    <Typography className={classes.sectionTitle}>
                      {i18n.t("dashboard.sections.schedules.title")}
                    </Typography>
                    <Typography className={classes.sectionSubtitle}>
                      {i18n.t("dashboard.sections.schedules.subtitle")}
                    </Typography>
                  </div>
                </div>

                {dashboard.upcomingSchedules.length ? (
                  <List className={classes.list}>
                    {dashboard.upcomingSchedules.map(schedule => (
                      <ListItem key={schedule.id} className={classes.listItem} disableGutters>
                        <ListItemText
                          disableTypography
                          primary={
                            <React.Fragment>
                              <Typography className={classes.listPrimary}>
                                {schedule.contactName || i18n.t("dashboard.schedules.noContact")}
                              </Typography>
                              <Typography variant="body2" className={classes.listSecondary}>
                                {truncateText(schedule.body, 88)}
                              </Typography>
                            </React.Fragment>
                          }
                          secondary={
                            <Typography variant="body2" className={classes.listSecondary}>
                              {(schedule.assigneeName || i18n.t("dashboard.recent.unassigned")) + " • " + formatDateTime(schedule.scheduledAt)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <div className={classes.emptyState}>{i18n.t("dashboard.sections.empty")}</div>
                )}
              </Paper>
            </Grid>
          </Grid>
        </React.Fragment>
      )}
    </Container>
  );
};

export default Dashboard;