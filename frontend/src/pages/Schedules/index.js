import React, { useEffect, useReducer, useState } from "react";
import { useHistory } from "react-router-dom";
import openSocket from "../../services/socket-io";

import {
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  makeStyles,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@material-ui/core";

import {
  Block,
  DeleteOutline,
  Edit,
  Launch,
  Replay,
  Search
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import ScheduleModal from "../../components/ScheduleModal";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const reducer = (state, action) => {
  if (action.type === "LOAD_SCHEDULES") {
    return action.payload;
  }

  if (action.type === "UPDATE_SCHEDULE") {
    const schedule = action.payload;
    const scheduleIndex = state.findIndex(item => item.id === schedule.id);

    if (scheduleIndex !== -1) {
      state[scheduleIndex] = schedule;
      return [...state];
    }

    return [schedule, ...state];
  }

  if (action.type === "DELETE_SCHEDULE") {
    const scheduleId = action.payload;
    const scheduleIndex = state.findIndex(item => item.id === scheduleId);
    if (scheduleIndex !== -1) {
      state.splice(scheduleIndex, 1);
    }
    return [...state];
  }

  return state;
};

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5)
  },
  headerSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.9rem"
  },
  filtersPaper: {
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  tableActions: {
    whiteSpace: "nowrap"
  },
  chip: {
    textTransform: "capitalize"
  }
}));

const Schedules = () => {
  const classes = useStyles();
  const history = useHistory();

  const [schedules, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo, setScheduledTo] = useState("");
  const [users, setUsers] = useState([]);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        let pageNumber = 1;
        let hasMore = true;
        const allUsers = [];

        while (hasMore) {
          const { data } = await api.get("/users", {
            params: { searchParam: "", pageNumber }
          });

          allUsers.push(...(data.users || []));
          hasMore = Boolean(data.hasMore);
          pageNumber += 1;

          if (!data.hasMore) {
            break;
          }
        }

        setUsers(allUsers);
      } catch (err) {
        toastError(err);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchSchedules = async () => {
        try {
          const params = {
            searchParam,
            status: statusFilter === "all" ? undefined : statusFilter,
            assigneeId: assigneeFilter || undefined,
            scheduledFrom: scheduledFrom || undefined,
            scheduledTo: scheduledTo || undefined
          };

          const { data } = await api.get("/schedules", { params });
          dispatch({ type: "LOAD_SCHEDULES", payload: data || [] });
          setLoading(false);
        } catch (err) {
          toastError(err);
          setLoading(false);
        }
      };

      fetchSchedules();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, statusFilter, assigneeFilter, scheduledFrom, scheduledTo]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("schedule", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_SCHEDULE", payload: data.schedule });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_SCHEDULE", payload: +data.scheduleId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(true);
  };

  const handleCloseScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(false);
  };

  const handleEditSchedule = schedule => {
    setSelectedSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const handleDeleteSchedule = async scheduleId => {
    try {
      await api.delete(`/schedules/${scheduleId}`);
      toast.success(i18n.t("schedules.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }

    setDeletingSchedule(null);
  };

  const handleCancelSchedule = async schedule => {
    try {
      await api.put(`/schedules/${schedule.id}/cancel`);
      toast.success(i18n.t("schedules.toasts.canceled"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleReopenSchedule = async schedule => {
    try {
      await api.put(`/schedules/${schedule.id}/reopen`);
      toast.success(i18n.t("schedules.toasts.reopened"));
    } catch (err) {
      toastError(err);
    }
  };

  const formatDate = value => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString();
  };

  const renderStatusChip = status => {
    if (status === "sent") {
      return (
        <Chip
          className={classes.chip}
          color="primary"
          label={i18n.t("schedules.status.sent")}
        />
      );
    }

    if (status === "canceled") {
      return (
        <Chip
          className={classes.chip}
          color="secondary"
          label={i18n.t("schedules.status.canceled")}
        />
      );
    }

    if (status === "failed") {
      return (
        <Chip
          className={classes.chip}
          color="secondary"
          label={i18n.t("schedules.status.failed")}
        />
      );
    }

    return (
      <Chip
        className={classes.chip}
        label={i18n.t("schedules.status.pending")}
      />
    );
  };

  const handleOpenTicket = ticketId => {
    if (!ticketId) return;
    history.push(`/tickets/${ticketId}`);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingSchedule &&
          `${i18n.t("schedules.confirmationModal.deleteTitle")} ${
            deletingSchedule.id
          }?`
        }
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={() => handleDeleteSchedule(deletingSchedule.id)}
      >
        {i18n.t("schedules.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ScheduleModal
        open={scheduleModalOpen}
        onClose={handleCloseScheduleModal}
        scheduleId={selectedSchedule?.id}
      />
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("schedules.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("schedules.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("schedules.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenScheduleModal}
          >
            {i18n.t("schedules.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper elevation={0} square>
        <Tabs
          value={statusFilter}
          onChange={(event, value) => setStatusFilter(value)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab value="all" label={i18n.t("schedules.status.all")} />
          <Tab value="pending" label={i18n.t("schedules.status.pending")} />
          <Tab value="sent" label={i18n.t("schedules.status.sent")} />
          <Tab value="canceled" label={i18n.t("schedules.status.canceled")} />
          <Tab value="failed" label={i18n.t("schedules.status.failed")} />
        </Tabs>
      </Paper>
      <Paper className={classes.filtersPaper} variant="outlined">
        <FormControl variant="outlined" size="small" style={{ minWidth: 180 }}>
          <InputLabel>{i18n.t("schedules.filters.assignee")}</InputLabel>
          <Select
            value={assigneeFilter}
            onChange={event => setAssigneeFilter(event.target.value)}
            label={i18n.t("schedules.filters.assignee")}
          >
            <MenuItem value="">
              {i18n.t("schedules.filters.assigneeAll")}
            </MenuItem>
            {users.map(user => (
              <MenuItem key={user.id} value={user.id}>
                {user.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label={i18n.t("schedules.filters.dateFrom")}
          type="date"
          variant="outlined"
          size="small"
          value={scheduledFrom}
          onChange={event => setScheduledFrom(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={i18n.t("schedules.filters.dateTo")}
          type="date"
          variant="outlined"
          size="small"
          value={scheduledTo}
          onChange={event => setScheduledTo(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Paper>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{i18n.t("schedules.table.body")}</TableCell>
              <TableCell>{i18n.t("schedules.table.status")}</TableCell>
              <TableCell>{i18n.t("schedules.table.scheduledAt")}</TableCell>
              <TableCell>{i18n.t("schedules.table.assignee")}</TableCell>
              <TableCell>{i18n.t("schedules.table.ticket")}</TableCell>
              <TableCell>{i18n.t("schedules.table.contact")}</TableCell>
              <TableCell align="center">
                {i18n.t("schedules.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowSkeleton columns={7} />
            ) : (
              schedules.map(schedule => (
                <TableRow key={schedule.id}>
                  <TableCell>{schedule.body}</TableCell>
                  <TableCell>{renderStatusChip(schedule.status)}</TableCell>
                  <TableCell>{formatDate(schedule.scheduledAt)}</TableCell>
                  <TableCell>{schedule.assignee?.name || "-"}</TableCell>
                  <TableCell>
                    {schedule.ticketId ? `#${schedule.ticketId}` : "-"}
                  </TableCell>
                  <TableCell>{schedule.contact?.name || "-"}</TableCell>
                  <TableCell align="center" className={classes.tableActions}>
                    {schedule.status === "pending" && (
                      <IconButton
                        size="small"
                        onClick={() => handleCancelSchedule(schedule)}
                        title={i18n.t("schedules.buttons.cancel")}
                      >
                        <Block />
                      </IconButton>
                    )}
                    {(schedule.status === "canceled" ||
                      schedule.status === "failed") && (
                      <IconButton
                        size="small"
                        onClick={() => handleReopenSchedule(schedule)}
                        title={i18n.t("schedules.buttons.reopen")}
                      >
                        <Replay />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleEditSchedule(schedule)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenTicket(schedule.ticketId)}
                    >
                      <Launch />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingSchedule(schedule);
                        setConfirmOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Schedules;
