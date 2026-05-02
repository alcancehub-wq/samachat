import React, { useEffect, useReducer, useState } from "react";

import openSocket from "../../services/socket-io";

import {
  Button,
  Checkbox,
  IconButton,
  makeStyles,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@material-ui/core";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { DeleteOutline, Edit } from "@material-ui/icons";
import ContactListModal from "../../components/ContactListModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import buildMenuListPageStyles from "../../styles/menuListPageStyles";

const useStyles = makeStyles(theme => ({
  ...buildMenuListPageStyles(theme)
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_LISTS") {
    const lists = action.payload;
    const newLists = [];

    lists.forEach(list => {
      const listIndex = state.findIndex(item => item.id === list.id);
      if (listIndex !== -1) {
        state[listIndex] = list;
      } else {
        newLists.push(list);
      }
    });

    return [...state, ...newLists];
  }

  if (action.type === "UPDATE_LIST") {
    const list = action.payload;
    const listIndex = state.findIndex(item => item.id === list.id);

    if (listIndex !== -1) {
      state[listIndex] = list;
      return [...state];
    }

    return [list, ...state];
  }

  if (action.type === "DELETE_LIST") {
    const listId = action.payload;
    const listIndex = state.findIndex(item => item.id === listId);
    if (listIndex !== -1) {
      state.splice(listIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const ContactLists = () => {
  const classes = useStyles();

  const [lists, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState([]);

  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/contactLists");
        dispatch({ type: "LOAD_LISTS", payload: data });
        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const socket = openSocket();

    socket.on("contactList", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_LIST", payload: data.list });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_LIST", payload: +data.listId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenListModal = () => {
    setListModalOpen(true);
    setSelectedList(null);
  };

  const handleCloseListModal = () => {
    setListModalOpen(false);
    setSelectedList(null);
  };

  const handleEditList = list => {
    setSelectedList(list);
    setListModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedList(null);
    setDeleteTargetIds([]);
  };

  const handleDeleteLists = async listIds => {
    try {
      await Promise.all(listIds.map(listId => api.delete(`/contactLists/${listId}`)));
      toast.success(i18n.t("contactLists.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedList(null);
    setDeleteTargetIds([]);
    setSelectedListIds([]);
  };

  const handleToggleListSelection = listId => {
    setSelectedListIds(prevState =>
      prevState.includes(listId)
        ? prevState.filter(id => id !== listId)
        : [...prevState, listId]
    );
  };

  const handleToggleSelectAll = event => {
    if (event.target.checked) {
      setSelectedListIds(lists.map(list => list.id));
      return;
    }

    setSelectedListIds([]);
  };

  const handleEditSelectedList = () => {
    if (selectedListIds.length !== 1) return;
    const list = lists.find(item => item.id === selectedListIds[0]);
    if (list) {
      handleEditList(list);
    }
  };

  const handleOpenSingleDeleteConfirmation = list => {
    setSelectedList(list);
    setDeleteTargetIds([list.id]);
    setConfirmModalOpen(true);
  };

  const handleOpenBulkDeleteConfirmation = () => {
    if (selectedListIds.length === 0) return;
    setSelectedList(null);
    setDeleteTargetIds(selectedListIds);
    setConfirmModalOpen(true);
  };

  const allVisibleSelected = lists.length > 0 && selectedListIds.length === lists.length;
  const someVisibleSelected = selectedListIds.length > 0 && !allVisibleSelected;

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deleteTargetIds.length > 1
            ? `Excluir ${deleteTargetIds.length} listas selecionadas?`
            : selectedList &&
              `${i18n.t("contactLists.confirmationModal.deleteTitle")} ${selectedList.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteLists(deleteTargetIds)}
      >
        {i18n.t("contactLists.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ContactListModal
        open={listModalOpen}
        onClose={handleCloseListModal}
        listId={selectedList?.id}
      />
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("contactLists.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("contactLists.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          {selectedListIds.length > 0 && (
            <Typography className={classes.bulkSelectionInfo}>
              {selectedListIds.length} selecionado(s)
            </Typography>
          )}
          <Button
            variant="contained"
            className={classes.bulkActionButton}
            disabled={selectedListIds.length !== 1}
            onClick={handleEditSelectedList}
          >
            Editar selecionado
          </Button>
          <Button
            variant="outlined"
            className={classes.bulkDeleteButton}
            disabled={selectedListIds.length === 0}
            onClick={handleOpenBulkDeleteConfirmation}
          >
            Excluir selecionados
          </Button>
          <Button variant="contained" color="primary" className={classes.actionButton} onClick={handleOpenListModal}>
            {i18n.t("contactLists.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small" className={classes.table}>
          <TableHead className={classes.tableHead}>
            <TableRow>
              <TableCell padding="checkbox" className={classes.tableHeadCell}>
                <Checkbox
                  indeterminate={someVisibleSelected}
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAll}
                  classes={{ root: classes.checkboxRoot }}
                />
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("contactLists.table.name")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("contactLists.table.type")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("contactLists.table.description")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("contactLists.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {lists.map(list => (
                <TableRow key={list.id} className={classes.tableRow}>
                  <TableCell className={`${classes.tableCell} ${classes.checkboxCell}`}>
                    <Checkbox
                      checked={selectedListIds.includes(list.id)}
                      onChange={() => handleToggleListSelection(list.id)}
                      classes={{ root: classes.checkboxRoot }}
                    />
                  </TableCell>
                  <TableCell align="center" className={classes.tableCell}>{list.name}</TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    {list.isDynamic
                      ? i18n.t("contactLists.table.dynamic")
                      : i18n.t("contactLists.table.manual")}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCell}>{list.description || "-"}</TableCell>
                  <TableCell align="center" className={`${classes.tableCell} ${classes.actionsCell}`}>
                    <IconButton className={classes.actionIconButton} size="small" onClick={() => handleEditList(list)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      className={classes.actionIconButton}
                      size="small"
                      onClick={() => handleOpenSingleDeleteConfirmation(list)}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={5} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default ContactLists;
