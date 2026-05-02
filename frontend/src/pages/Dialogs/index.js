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
  Typography,
  TextField,
  InputAdornment
} from "@material-ui/core";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import {
  DeleteOutline,
  Edit,
  Visibility,
  FileCopy
} from "@material-ui/icons";
import DialogModal from "../../components/DialogModal";
import DialogPreviewModal from "../../components/DialogPreviewModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import SearchIcon from "@material-ui/icons/Search";
import buildMenuListPageStyles from "../../styles/menuListPageStyles";

const useStyles = makeStyles(theme => ({
  ...buildMenuListPageStyles(theme)
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_DIALOGS") {
    const dialogs = action.payload;
    const newDialogs = [];

    dialogs.forEach(dialog => {
      const dialogIndex = state.findIndex(item => item.id === dialog.id);
      if (dialogIndex !== -1) {
        state[dialogIndex] = dialog;
      } else {
        newDialogs.push(dialog);
      }
    });

    return [...state, ...newDialogs];
  }

  if (action.type === "UPDATE_DIALOG") {
    const dialog = action.payload;
    const dialogIndex = state.findIndex(item => item.id === dialog.id);

    if (dialogIndex !== -1) {
      state[dialogIndex] = dialog;
      return [...state];
    }

    return [dialog, ...state];
  }

  if (action.type === "DELETE_DIALOG") {
    const dialogId = action.payload;
    const dialogIndex = state.findIndex(item => item.id === dialogId);
    if (dialogIndex !== -1) {
      state.splice(dialogIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Dialogs = () => {
  const classes = useStyles();

  const [dialogs, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedDialogIds, setSelectedDialogIds] = useState([]);

  const [dialogModalOpen, setDialogModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDialog, setSelectedDialog] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState([]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setSelectedDialogIds([]);
  }, [searchParam]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/dialogs", {
          params: { searchParam }
        });
        dispatch({ type: "LOAD_DIALOGS", payload: data });

        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, [searchParam]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("dialog", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_DIALOG", payload: data.dialog });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_DIALOG", payload: +data.dialogId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenDialogModal = () => {
    setDialogModalOpen(true);
    setSelectedDialog(null);
  };

  const handleCloseDialogModal = () => {
    setDialogModalOpen(false);
    setSelectedDialog(null);
  };

  const handleEditDialog = dialog => {
    setSelectedDialog(dialog);
    setDialogModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedDialog(null);
    setDeleteTargetIds([]);
  };

  const handleDeleteDialogs = async dialogIds => {
    try {
      await Promise.all(dialogIds.map(dialogId => api.delete(`/dialogs/${dialogId}`)));
      toast.success(i18n.t("dialogs.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedDialog(null);
    setDeleteTargetIds([]);
    setSelectedDialogIds([]);
  };

  const handleToggleDialogSelection = dialogId => {
    setSelectedDialogIds(prevState =>
      prevState.includes(dialogId)
        ? prevState.filter(id => id !== dialogId)
        : [...prevState, dialogId]
    );
  };

  const handleToggleSelectAll = event => {
    if (event.target.checked) {
      setSelectedDialogIds(dialogs.map(dialog => dialog.id));
      return;
    }

    setSelectedDialogIds([]);
  };

  const handleEditSelectedDialog = () => {
    if (selectedDialogIds.length !== 1) return;
    const dialog = dialogs.find(item => item.id === selectedDialogIds[0]);
    if (dialog) {
      handleEditDialog(dialog);
    }
  };

  const handleOpenSingleDeleteConfirmation = dialog => {
    setSelectedDialog(dialog);
    setDeleteTargetIds([dialog.id]);
    setConfirmModalOpen(true);
  };

  const handleOpenBulkDeleteConfirmation = () => {
    if (selectedDialogIds.length === 0) return;
    setSelectedDialog(null);
    setDeleteTargetIds(selectedDialogIds);
    setConfirmModalOpen(true);
  };

  const allVisibleSelected = dialogs.length > 0 && selectedDialogIds.length === dialogs.length;
  const someVisibleSelected = selectedDialogIds.length > 0 && !allVisibleSelected;

  const handleDuplicateDialog = async dialogId => {
    try {
      await api.post(`/dialogs/${dialogId}/duplicate`);
      toast.success(i18n.t("dialogs.toasts.duplicated"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenPreview = dialog => {
    setSelectedDialog(dialog);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setSelectedDialog(null);
  };

  const formatDate = dateValue => {
    if (!dateValue) {
      return "-";
    }

    return new Date(dateValue).toLocaleDateString();
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deleteTargetIds.length > 1
            ? `Excluir ${deleteTargetIds.length} dialogos selecionados?`
            : selectedDialog &&
              `${i18n.t("dialogs.confirmationModal.deleteTitle")} ${selectedDialog.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteDialogs(deleteTargetIds)}
      >
        {i18n.t("dialogs.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <DialogModal
        open={dialogModalOpen}
        onClose={handleCloseDialogModal}
        dialogId={selectedDialog?.id}
      />
      <DialogPreviewModal
        open={previewModalOpen}
        onClose={handleClosePreview}
        dialogId={selectedDialog?.id}
      />
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("dialogs.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("dialogs.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          {selectedDialogIds.length > 0 && (
            <Typography className={classes.bulkSelectionInfo}>
              {selectedDialogIds.length} selecionado(s)
            </Typography>
          )}
          <Button
            variant="contained"
            className={classes.bulkActionButton}
            disabled={selectedDialogIds.length !== 1}
            onClick={handleEditSelectedDialog}
          >
            Editar selecionado
          </Button>
          <Button
            variant="outlined"
            className={classes.bulkDeleteButton}
            disabled={selectedDialogIds.length === 0}
            onClick={handleOpenBulkDeleteConfirmation}
          >
            Excluir selecionados
          </Button>
          <TextField
            className={classes.searchField}
            placeholder={i18n.t("dialogs.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              classes: { root: classes.searchInputRoot },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
          <Button variant="contained" color="primary" className={classes.actionButton} onClick={handleOpenDialogModal}>
            {i18n.t("dialogs.buttons.add")}
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
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("dialogs.table.name")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("dialogs.table.status")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("dialogs.table.updatedAt")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("dialogs.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {dialogs.map(dialog => (
                <TableRow key={dialog.id} className={classes.tableRow}>
                  <TableCell className={`${classes.tableCell} ${classes.checkboxCell}`}>
                    <Checkbox
                      checked={selectedDialogIds.includes(dialog.id)}
                      onChange={() => handleToggleDialogSelection(dialog.id)}
                      classes={{ root: classes.checkboxRoot }}
                    />
                  </TableCell>
                  <TableCell align="center" className={classes.tableCell}>{dialog.name}</TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    {dialog.isActive
                      ? i18n.t("dialogs.table.active")
                      : i18n.t("dialogs.table.inactive")}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    {formatDate(dialog.updatedAt)}
                  </TableCell>
                  <TableCell align="center" className={`${classes.tableCell} ${classes.actionsCell}`}>
                    <IconButton className={classes.actionIconButton} size="small" onClick={() => handleEditDialog(dialog)}>
                      <Edit />
                    </IconButton>
                    <IconButton className={classes.actionIconButton} size="small" onClick={() => handleOpenPreview(dialog)}>
                      <Visibility />
                    </IconButton>
                    <IconButton
                      className={classes.actionIconButton}
                      size="small"
                      onClick={() => handleDuplicateDialog(dialog.id)}
                    >
                      <FileCopy />
                    </IconButton>
                    <IconButton
                      className={classes.actionIconButton}
                      size="small"
                      onClick={() => handleOpenSingleDeleteConfirmation(dialog)}
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

export default Dialogs;
