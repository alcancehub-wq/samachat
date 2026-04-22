import React, { useEffect, useReducer, useState } from "react";

import openSocket from "../../services/socket-io";

import {
  Button,
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
  }
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

  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

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
  };

  const handleDeleteList = async listId => {
    try {
      await api.delete(`/contactLists/${listId}`);
      toast.success(i18n.t("contactLists.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedList(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          selectedList &&
          `${i18n.t("contactLists.confirmationModal.deleteTitle")} ${selectedList.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteList(selectedList.id)}
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
          <Button variant="contained" color="primary" onClick={handleOpenListModal}>
            {i18n.t("contactLists.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("contactLists.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("contactLists.table.type")}</TableCell>
              <TableCell align="center">{i18n.t("contactLists.table.description")}</TableCell>
              <TableCell align="center">{i18n.t("contactLists.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {lists.map(list => (
                <TableRow key={list.id}>
                  <TableCell align="center">{list.name}</TableCell>
                  <TableCell align="center">
                    {list.isDynamic
                      ? i18n.t("contactLists.table.dynamic")
                      : i18n.t("contactLists.table.manual")}
                  </TableCell>
                  <TableCell align="center">{list.description || "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEditList(list)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedList(list);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={4} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default ContactLists;
