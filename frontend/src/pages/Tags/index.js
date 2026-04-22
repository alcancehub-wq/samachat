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

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
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
  };

  const handleDeleteTag = async tagId => {
    try {
      await api.delete(`/tags/${tagId}`);
      toast.success(i18n.t("tags.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedTag(null);
  };

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          selectedTag && `${i18n.t("tags.confirmationModal.deleteTitle")} ${selectedTag.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteTag(selectedTag.id)}
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
          <TextField
            placeholder={i18n.t("tags.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
          <Button variant="contained" color="primary" onClick={handleOpenTagModal}>
            {i18n.t("tags.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("tags.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("tags.table.color")}</TableCell>
              <TableCell align="center">{i18n.t("tags.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {tags.map(tag => (
                <TableRow key={tag.id}>
                  <TableCell align="center">{tag.name}</TableCell>
                  <TableCell align="center">
                    <span
                      className={classes.colorDot}
                      style={{ backgroundColor: tag.color || "#64748b" }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEditTag(tag)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedTag(tag);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={3} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Tags;
