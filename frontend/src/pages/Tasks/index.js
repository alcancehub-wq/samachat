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

import { CheckCircle, DeleteOutline, Edit, Replay, Search, Launch } from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import TaskModal from "../../components/TaskModal";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import buildMenuListPageStyles from "../../styles/menuListPageStyles";

const reducer = (state, action) => {
  if (action.type === "LOAD_TASKS") {
    return action.payload;
  }

  if (action.type === "UPDATE_TASK") {
    const task = action.payload;
    const taskIndex = state.findIndex(item => item.id === task.id);

    if (taskIndex !== -1) {
      state[taskIndex] = task;
      return [...state];
    }

    return [task, ...state];
  }

  if (action.type === "DELETE_TASK") {
    const taskId = action.payload;
    const taskIndex = state.findIndex(item => item.id === taskId);
    if (taskIndex !== -1) {
      state.splice(taskIndex, 1);
    }
    return [...state];
  }

  return state;
};

const useStyles = makeStyles(theme => ({
  ...buildMenuListPageStyles(theme),
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

const Tasks = () => {
  const classes = useStyles();
  const history = useHistory();

  const [tasks, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [users, setUsers] = useState([]);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState(null);

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
      const fetchTasks = async () => {
        try {
          const params = {
            searchParam,
            status: statusFilter === "all" ? undefined : statusFilter,
            priority: priorityFilter || undefined,
            assigneeId: assigneeFilter || undefined
          };

          const { data } = await api.get("/tasks", { params });
          dispatch({ type: "LOAD_TASKS", payload: data || [] });
          setLoading(false);
        } catch (err) {
          toastError(err);
          setLoading(false);
        }
      };

      fetchTasks();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, statusFilter, priorityFilter, assigneeFilter]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("task", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_TASK", payload: data.task });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_TASK", payload: +data.taskId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenTaskModal = () => {
    setSelectedTask(null);
    setTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
    setTaskModalOpen(false);
  };

  const handleEditTask = task => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  };

  const handleDeleteTask = async taskId => {
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success(i18n.t("tasks.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }

    setDeletingTask(null);
  };

  const handleToggleTaskStatus = async task => {
    try {
      if (task.status === "completed") {
        await api.put(`/tasks/${task.id}/reopen`);
      } else {
        await api.put(`/tasks/${task.id}/close`);
      }
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
    if (status === "completed") {
      return <Chip className={classes.chip} color="primary" label={i18n.t("tasks.status.completed")} />;
    }

    return <Chip className={classes.chip} label={i18n.t("tasks.status.open")} />;
  };

  const renderPriorityChip = priority => {
    if (priority === "high") {
      return <Chip className={classes.chip} color="secondary" label={i18n.t("tasks.priority.high")} />;
    }

    if (priority === "low") {
      return <Chip className={classes.chip} label={i18n.t("tasks.priority.low")} />;
    }

    return <Chip className={classes.chip} color="default" label={i18n.t("tasks.priority.medium")} />;
  };

  const handleOpenTicket = ticketId => {
    if (!ticketId) return;
    history.push(`/tickets/${ticketId}`);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingTask &&
          `${i18n.t("tasks.confirmationModal.deleteTitle")} ${deletingTask.title}?`
        }
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={() => handleDeleteTask(deletingTask.id)}
      >
        {i18n.t("tasks.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <TaskModal
        open={taskModalOpen}
        onClose={handleCloseTaskModal}
        taskId={selectedTask?.id}
      />
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("tasks.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("tasks.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            className={classes.searchField}
            placeholder={i18n.t("tasks.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              classes: { root: classes.searchInputRoot },
              startAdornment: (
                <InputAdornment position="start">
                  <Search style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
          <Button variant="contained" color="primary" className={classes.actionButton} onClick={handleOpenTaskModal}>
            {i18n.t("tasks.buttons.add")}
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
          <Tab value="all" label={i18n.t("tasks.status.all")} />
          <Tab value="open" label={i18n.t("tasks.status.open")} />
          <Tab value="completed" label={i18n.t("tasks.status.completed")} />
        </Tabs>
      </Paper>
      <Paper className={classes.filtersPaper} variant="outlined">
        <FormControl variant="outlined" size="small" style={{ minWidth: 180 }}>
          <InputLabel>{i18n.t("tasks.filters.assignee")}</InputLabel>
          <Select
            value={assigneeFilter}
            onChange={event => setAssigneeFilter(event.target.value)}
            label={i18n.t("tasks.filters.assignee")}
          >
            <MenuItem value="">{i18n.t("tasks.filters.assigneeAll")}</MenuItem>
            {users.map(user => (
              <MenuItem key={user.id} value={user.id}>
                {user.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl variant="outlined" size="small" style={{ minWidth: 180 }}>
          <InputLabel>{i18n.t("tasks.filters.priority")}</InputLabel>
          <Select
            value={priorityFilter}
            onChange={event => setPriorityFilter(event.target.value)}
            label={i18n.t("tasks.filters.priority")}
          >
            <MenuItem value="">{i18n.t("tasks.filters.priorityAll")}</MenuItem>
            <MenuItem value="low">{i18n.t("tasks.priority.low")}</MenuItem>
            <MenuItem value="medium">{i18n.t("tasks.priority.medium")}</MenuItem>
            <MenuItem value="high">{i18n.t("tasks.priority.high")}</MenuItem>
          </Select>
        </FormControl>
      </Paper>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{i18n.t("tasks.table.title")}</TableCell>
              <TableCell>{i18n.t("tasks.table.status")}</TableCell>
              <TableCell>{i18n.t("tasks.table.priority")}</TableCell>
              <TableCell>{i18n.t("tasks.table.dueAt")}</TableCell>
              <TableCell>{i18n.t("tasks.table.assignee")}</TableCell>
              <TableCell>{i18n.t("tasks.table.ticket")}</TableCell>
              <TableCell>{i18n.t("tasks.table.contact")}</TableCell>
              <TableCell align="center">{i18n.t("tasks.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowSkeleton columns={8} />
            ) : (
              tasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{renderStatusChip(task.status)}</TableCell>
                  <TableCell>{renderPriorityChip(task.priority)}</TableCell>
                  <TableCell>{formatDate(task.dueAt)}</TableCell>
                  <TableCell>{task.assignee?.name || "-"}</TableCell>
                  <TableCell>
                    {task.ticketId ? `#${task.ticketId}` : "-"}
                  </TableCell>
                  <TableCell>{task.contact?.name || "-"}</TableCell>
                  <TableCell align="center" className={classes.tableActions}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleTaskStatus(task)}
                      title={
                        task.status === "completed"
                          ? i18n.t("tasks.buttons.reopen")
                          : i18n.t("tasks.buttons.complete")
                      }
                    >
                      {task.status === "completed" ? <Replay /> : <CheckCircle />}
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEditTask(task)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenTicket(task.ticketId)}>
                      <Launch />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingTask(task);
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

export default Tasks;
