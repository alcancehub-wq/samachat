import React, { useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Button,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  makeStyles,
  Paper,
  Typography
} from "@material-ui/core";
import { CheckCircle, Replay, Add, Launch } from "@material-ui/icons";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { userHasPermission } from "../../utils/permissions";
import TaskModal from "../TaskModal";

const useStyles = makeStyles(theme => ({
  wrapper: {
    marginTop: theme.spacing(2)
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1)
  },
  list: {
    padding: 0
  },
  listItem: {
    paddingLeft: 0,
    paddingRight: 0
  },
  actions: {
    whiteSpace: "nowrap"
  },
  statusDone: {
    textDecoration: "line-through",
    color: theme.palette.text.secondary
  }
}));

const TicketTasks = ({ ticketId, contactId }) => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const canViewTasks = userHasPermission(user, "tasks.view");
  const canCreateTasks = userHasPermission(user, "tasks.create");
  const canCloseTasks = userHasPermission(user, "tasks.close");
  const canReopenTasks = userHasPermission(user, "tasks.reopen");

  const loadTasks = async () => {
    if (!canViewTasks) {
      setTasks([]);
      return;
    }

    try {
      const { data } = await api.get("/tasks", {
        params: {
          ticketId,
          contactId
        }
      });

      setTasks(data || []);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    if (!canViewTasks) {
      setTasks([]);
      return;
    }

    loadTasks();
  }, [canViewTasks, ticketId, contactId]);

  const handleToggle = async task => {
    const canToggleTask =
      (task.status === "completed" && canReopenTasks) ||
      (task.status !== "completed" && canCloseTasks);

    if (!canToggleTask) {
      return;
    }

    try {
      if (task.status === "completed") {
        await api.put(`/tasks/${task.id}/reopen`);
      } else {
        await api.put(`/tasks/${task.id}/close`);
      }
      loadTasks();
    } catch (err) {
      toastError(err);
    }
  };

  if (!canViewTasks) {
    return null;
  }

  return (
    <div className={classes.wrapper}>
      <div className={classes.header}>
        <Typography variant="subtitle1">
          {i18n.t("ticketTasks.title")}
        </Typography>
        {canCreateTasks && (
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => setModalOpen(true)}
          >
            {i18n.t("ticketTasks.add")}
          </Button>
        )}
      </div>
      <Paper variant="outlined">
        {tasks.length === 0 ? (
          <Typography style={{ padding: 12 }}>
            {i18n.t("ticketTasks.empty")}
          </Typography>
        ) : (
          <List className={classes.list}>
            {tasks.map(task => (
              <ListItem key={task.id} dense divider className={classes.listItem}>
                <ListItemText
                  primary={task.title}
                  secondary={task.status === "completed" ? i18n.t("tasks.status.completed") : i18n.t("tasks.status.open")}
                  classes={{ primary: task.status === "completed" ? classes.statusDone : undefined }}
                />
                <ListItemSecondaryAction className={classes.actions}>
                  {((task.status === "completed" && canReopenTasks) ||
                    (task.status !== "completed" && canCloseTasks)) && (
                    <IconButton size="small" onClick={() => handleToggle(task)}>
                      {task.status === "completed" ? <Replay /> : <CheckCircle />}
                    </IconButton>
                  )}
                  {task.ticketId && (
                    <IconButton
                      size="small"
                      onClick={() => history.push(`/tickets/${task.ticketId}`)}
                    >
                      <Launch />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          loadTasks();
        }}
        initialValues={{
          ticketId,
          contactId
        }}
      />
    </div>
  );
};

export default TicketTasks;
