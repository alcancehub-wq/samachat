import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import {
  Button,
  IconButton,
  InputAdornment,
  makeStyles,
  Paper,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select
} from "@material-ui/core";
import {
  Add,
  ArrowBack,
  ArrowForward,
  Edit,
  Search
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import QueueSelect from "../../components/QueueSelect";
import TagSelect from "../../components/TagSelect";
import KanbanColumnModal from "../../components/KanbanColumnModal";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
  board: {
    display: "flex",
    gap: theme.spacing(2),
    overflowX: "auto",
    padding: theme.spacing(1),
    flex: 1
  },
  column: {
    minWidth: 280,
    background: theme.palette.background.paper,
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    display: "flex",
    flexDirection: "column",
    maxHeight: "calc(100vh - 240px)"
  },
  columnHeader: {
    padding: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1)
  },
  columnTitle: {
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  columnCount: {
    background: theme.palette.grey[200],
    borderRadius: 12,
    padding: "2px 8px",
    fontSize: "0.75rem"
  },
  columnBody: {
    padding: theme.spacing(1),
    overflowY: "auto",
    flex: 1
  },
  card: {
    padding: theme.spacing(1.2),
    marginBottom: theme.spacing(1),
    cursor: "grab",
    border: `1px solid ${theme.palette.divider}`
  },
  cardTitle: {
    fontWeight: 600
  },
  cardMeta: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    alignItems: "center"
  },
  filterSelect: {
    minWidth: 180
  },
  emptyColumn: {
    padding: theme.spacing(1),
    color: theme.palette.text.secondary,
    textAlign: "center"
  },
  columnActions: {
    display: "flex",
    alignItems: "center",
    gap: 4
  }
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();

  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [queueIds, setQueueIds] = useState([]);
  const [tagIds, setTagIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");

  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/users", {
        params: { searchParam: "", pageNumber: 1 }
      });
      setUsers(data?.users || []);
    } catch (err) {
      toastError(err);
    }
  }, []);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/kanban", {
        params: {
          searchParam,
          queueIds: JSON.stringify(queueIds || []),
          userId: userId || undefined,
          tagIds: JSON.stringify(tagIds || [])
        }
      });
      setColumns(data || []);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  }, [searchParam, queueIds, userId, tagIds]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleOpenColumnModal = column => {
    setSelectedColumn(column || null);
    setColumnModalOpen(true);
  };

  const handleCloseColumnModal = () => {
    setColumnModalOpen(false);
    setSelectedColumn(null);
    fetchBoard();
  };

  const moveColumn = async (columnId, direction) => {
    const index = columns.findIndex(column => column.id === columnId);
    if (index === -1) {
      return;
    }

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= columns.length) {
      return;
    }

    const nextColumns = [...columns];
    const temp = nextColumns[index];
    nextColumns[index] = nextColumns[nextIndex];
    nextColumns[nextIndex] = temp;

    setColumns(nextColumns);

    try {
      await api.put("/kanban/columns/reorder", {
        orderedColumnIds: nextColumns.map(column => column.id)
      });
    } catch (err) {
      toastError(err);
    }
  };

  const handleCardClick = ticketId => {
    history.push(`/tickets/${ticketId}`);
  };

  const resolveCardTitle = ticket => {
    if (ticket.contact?.name) {
      return ticket.contact.name;
    }

    return ticket.contact?.number || `#${ticket.id}`;
  };

  const buildMovePayload = useCallback(
    (nextColumns, ticketId, targetColumnId) => {
      const targetColumn = nextColumns.find(c => c.id === targetColumnId);
      const orderedTicketIds = targetColumn
        ? targetColumn.cards.map(card => card.ticket.id)
        : [];

      return { orderedTicketIds, ticketId, columnId: targetColumnId };
    },
    []
  );

  const applyMove = useCallback(
    (ticketId, sourceColumnId, targetColumnId, targetIndex) => {
      const nextColumns = columns.map(column => ({
        ...column,
        cards: [...column.cards]
      }));

      const sourceColumn = nextColumns.find(column => column.id === sourceColumnId);
      const targetColumn = nextColumns.find(column => column.id === targetColumnId);

      if (!sourceColumn || !targetColumn) {
        return null;
      }

      const cardIndex = sourceColumn.cards.findIndex(
        card => card.ticket.id === ticketId
      );
      if (cardIndex === -1) {
        return null;
      }

      const [card] = sourceColumn.cards.splice(cardIndex, 1);

      if (typeof targetIndex !== "number" || targetIndex < 0) {
        targetColumn.cards.push(card);
      } else {
        targetColumn.cards.splice(targetIndex, 0, card);
      }

      return nextColumns;
    },
    [columns]
  );

  const handleDrop = async (event, targetColumnId, targetIndex) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/plain");

    if (!raw) {
      return;
    }

    const payload = JSON.parse(raw);
    const ticketId = Number(payload.ticketId);
    const sourceColumnId = Number(payload.columnId);

    if (!ticketId || !sourceColumnId || !targetColumnId) {
      return;
    }

    const nextColumns = applyMove(
      ticketId,
      sourceColumnId,
      targetColumnId,
      targetIndex
    );

    if (!nextColumns) {
      return;
    }

    setColumns(nextColumns);

    const movePayload = buildMovePayload(nextColumns, ticketId, targetColumnId);

    try {
      await api.post("/kanban/move", movePayload);
    } catch (err) {
      toastError(err);
    }
  };

  const handleDragStart = (event, ticketId, columnId) => {
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ ticketId, columnId })
    );
  };

  const handleDragOver = event => {
    event.preventDefault();
  };

  const renderCard = (card, columnId, index) => (
    <Paper
      key={card.ticket.id}
      className={classes.card}
      elevation={1}
      draggable
      onDragStart={event => handleDragStart(event, card.ticket.id, columnId)}
      onDragOver={handleDragOver}
      onDrop={event => handleDrop(event, columnId, index)}
      onClick={() => handleCardClick(card.ticket.id)}
    >
      <Typography className={classes.cardTitle}>{resolveCardTitle(card.ticket)}</Typography>
      <Typography className={classes.cardMeta}>
        {card.ticket.queue?.name || i18n.t("kanban.card.noQueue")}
      </Typography>
      <Typography className={classes.cardMeta}>
        {card.ticket.user?.name || i18n.t("kanban.card.noUser")}
      </Typography>
      <Typography className={classes.cardMeta}>
        {card.ticket.lastMessage || "-"}
      </Typography>
    </Paper>
  );

  const columnsWithCounts = useMemo(
    () =>
      columns.map(column => ({
        ...column,
        count: column.cards?.length || 0
      })),
    [columns]
  );

  return (
    <MainContainer>
      <KanbanColumnModal
        open={columnModalOpen}
        onClose={handleCloseColumnModal}
        column={selectedColumn}
      />
      <MainHeader>
        <div>
          <Title>{i18n.t("kanban.title")}</Title>
          <Typography color="textSecondary">{i18n.t("kanban.subtitle")}</Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <div className={classes.filters}>
            <TextField
              placeholder={i18n.t("kanban.searchPlaceholder")}
              value={searchParam}
              onChange={event => setSearchParam(event.target.value.toLowerCase())}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search style={{ color: "gray" }} />
                  </InputAdornment>
                )
              }}
            />
            <QueueSelect selectedQueueIds={queueIds} onChange={setQueueIds} />
            <TagSelect selectedTagIds={tagIds} onChange={setTagIds} />
            <FormControl variant="outlined" margin="dense" className={classes.filterSelect}>
              <InputLabel>{i18n.t("kanban.filters.user")}</InputLabel>
              <Select
                value={userId}
                onChange={event => setUserId(event.target.value)}
                label={i18n.t("kanban.filters.user")}
                displayEmpty
              >
                <MenuItem value="">{i18n.t("kanban.filters.allUsers")}</MenuItem>
                {users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => handleOpenColumnModal(null)}
            >
              {i18n.t("kanban.buttons.addColumn")}
            </Button>
          </div>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <div className={classes.board}>
        {loading && (
          <Typography color="textSecondary">{i18n.t("kanban.loading")}</Typography>
        )}
        {!loading &&
          columnsWithCounts.map(column => (
            <div
              key={column.id}
              className={classes.column}
              onDragOver={handleDragOver}
              onDrop={event => handleDrop(event, column.id)}
            >
              <div className={classes.columnHeader}>
                <div className={classes.columnTitle}>
                  <Typography variant="subtitle1">{column.name}</Typography>
                  <span className={classes.columnCount}>{column.count}</span>
                </div>
                <div className={classes.columnActions}>
                  <IconButton
                    size="small"
                    onClick={() => moveColumn(column.id, -1)}
                  >
                    <ArrowBack fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moveColumn(column.id, 1)}
                  >
                    <ArrowForward fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenColumnModal(column)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </div>
              </div>
              <div className={classes.columnBody}>
                {column.cards?.length === 0 && (
                  <div className={classes.emptyColumn}>
                    {i18n.t("kanban.emptyColumn")}
                  </div>
                )}
                {column.cards?.map((card, index) =>
                  renderCard(card, column.id, index)
                )}
              </div>
            </div>
          ))}
      </div>
    </MainContainer>
  );
};

export default Kanban;
