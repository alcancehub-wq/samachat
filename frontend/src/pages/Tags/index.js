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
import { DeleteOutline, Edit } from "@material-ui/icons";
import TagModal from "../../components/TagModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import SearchIcon from "@material-ui/icons/Search";
import buildMenuListPageStyles from "../../styles/menuListPageStyles";

const useStyles = makeStyles(theme => ({
  ...buildMenuListPageStyles(theme),
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    display: "inline-block"
  }
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_TAGS") {
    const tags = action.payload;
    const newTags = [];

    tags.forEach(tag => {
      const tagIndex = state.findIndex(t => t.id === tag.id);
      if (tagIndex !== -1) {
        state[tagIndex] = tag;
      } else {
        newTags.push(tag);
      }
    });

    return [...state, ...newTags];
  }

  if (action.type === "UPDATE_TAGS") {
    const tag = action.payload;
    const tagIndex = state.findIndex(t => t.id === tag.id);

    if (tagIndex !== -1) {
      state[tagIndex] = tag;
      return [...state];
    } else {
      return [tag, ...state];
    }
  }

  if (action.type === "DELETE_TAG") {
    const tagId = action.payload;
    const tagIndex = state.findIndex(t => t.id === tagId);
    if (tagIndex !== -1) {
      state.splice(tagIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Tags = () => {
  const classes = useStyles();

  const [tags, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState([]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setSelectedTagIds([]);
  }, [searchParam]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/tags", {
          params: { searchParam }
        });
        dispatch({ type: "LOAD_TAGS", payload: data });

        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, [searchParam]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("tag", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_TAGS", payload: data.tag });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_TAG", payload: +data.tagId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenTagModal = () => {
    setTagModalOpen(true);
    setSelectedTag(null);
  };

  const handleCloseTagModal = () => {
    setTagModalOpen(false);
    setSelectedTag(null);
  };

  const handleEditTag = tag => {
    setSelectedTag(tag);
    setTagModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedTag(null);
    setDeleteTargetIds([]);
  };

  const handleDeleteTags = async tagIds => {
    try {
      await Promise.all(tagIds.map(tagId => api.delete(`/tags/${tagId}`)));
      toast.success(i18n.t("tags.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedTag(null);
    setDeleteTargetIds([]);
    setSelectedTagIds([]);
  };

  const handleToggleTagSelection = tagId => {
    setSelectedTagIds(prevState =>
      prevState.includes(tagId)
        ? prevState.filter(id => id !== tagId)
        : [...prevState, tagId]
    );
  };

  const handleToggleSelectAll = event => {
    if (event.target.checked) {
      setSelectedTagIds(tags.map(tag => tag.id));
      return;
    }

    setSelectedTagIds([]);
  };

  const handleEditSelectedTag = () => {
    if (selectedTagIds.length !== 1) return;
    const tag = tags.find(item => item.id === selectedTagIds[0]);
    if (tag) {
      handleEditTag(tag);
    }
  };

  const handleOpenSingleDeleteConfirmation = tag => {
    setSelectedTag(tag);
    setDeleteTargetIds([tag.id]);
    setConfirmModalOpen(true);
  };

  const handleOpenBulkDeleteConfirmation = () => {
    if (selectedTagIds.length === 0) return;
    setSelectedTag(null);
    setDeleteTargetIds(selectedTagIds);
    setConfirmModalOpen(true);
  };

  const allVisibleSelected = tags.length > 0 && selectedTagIds.length === tags.length;
  const someVisibleSelected = selectedTagIds.length > 0 && !allVisibleSelected;

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deleteTargetIds.length > 1
            ? `Excluir ${deleteTargetIds.length} tags selecionadas?`
            : selectedTag && `${i18n.t("tags.confirmationModal.deleteTitle")} ${selectedTag.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteTags(deleteTargetIds)}
      >
        {i18n.t("tags.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <TagModal
        open={tagModalOpen}
        onClose={handleCloseTagModal}
        tagId={selectedTag?.id}
      />
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("tags.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("tags.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          {selectedTagIds.length > 0 && (
            <Typography className={classes.bulkSelectionInfo}>
              {selectedTagIds.length} selecionado(s)
            </Typography>
          )}
          <Button
            variant="contained"
            className={classes.bulkActionButton}
            disabled={selectedTagIds.length !== 1}
            onClick={handleEditSelectedTag}
          >
            Editar selecionado
          </Button>
          <Button
            variant="outlined"
            className={classes.bulkDeleteButton}
            disabled={selectedTagIds.length === 0}
            onClick={handleOpenBulkDeleteConfirmation}
          >
            Excluir selecionados
          </Button>
          <TextField
            className={classes.searchField}
            placeholder={i18n.t("tags.searchPlaceholder")}
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
          <Button variant="contained" color="primary" className={classes.actionButton} onClick={handleOpenTagModal}>
            {i18n.t("tags.buttons.add")}
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
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("tags.table.name")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("tags.table.color")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("tags.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {tags.map(tag => (
                <TableRow key={tag.id} className={classes.tableRow}>
                  <TableCell className={`${classes.tableCell} ${classes.checkboxCell}`}>
                    <Checkbox
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => handleToggleTagSelection(tag.id)}
                      classes={{ root: classes.checkboxRoot }}
                    />
                  </TableCell>
                  <TableCell align="center" className={classes.tableCell}>{tag.name}</TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    <span
                      className={classes.colorDot}
                      style={{ backgroundColor: tag.color || "#64748b" }}
                    />
                  </TableCell>
                  <TableCell align="center" className={`${classes.tableCell} ${classes.actionsCell}`}>
                    <IconButton className={classes.actionIconButton} size="small" onClick={() => handleEditTag(tag)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      className={classes.actionIconButton}
                      size="small"
                      onClick={() => handleOpenSingleDeleteConfirmation(tag)}
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

export default Tags;
