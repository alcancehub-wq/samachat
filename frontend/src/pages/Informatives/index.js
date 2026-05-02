import React, { useEffect, useReducer, useState } from "react";

import openSocket from "../../services/socket-io";

import {
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  makeStyles,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
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
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import SearchIcon from "@material-ui/icons/Search";
import InformativeModal from "../../components/InformativeModal";
import buildMenuListPageStyles from "../../styles/menuListPageStyles";

const useStyles = makeStyles(theme => ({
  ...buildMenuListPageStyles(theme),
  targetCell: {
    maxWidth: 220,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_INFORMATIVES") {
    const informatives = action.payload;
    const newItems = [];

    informatives.forEach(informative => {
      const index = state.findIndex(item => item.id === informative.id);
      if (index !== -1) {
        state[index] = informative;
      } else {
        newItems.push(informative);
      }
    });

    return [...state, ...newItems];
  }

  if (action.type === "UPDATE_INFORMATIVE") {
    const informative = action.payload;
    const index = state.findIndex(item => item.id === informative.id);

    if (index !== -1) {
      state[index] = informative;
      return [...state];
    }

    return [informative, ...state];
  }

  if (action.type === "DELETE_INFORMATIVE") {
    const informativeId = action.payload;
    const index = state.findIndex(item => item.id === informativeId);
    if (index !== -1) {
      state.splice(index, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Informatives = () => {
  const classes = useStyles();

  const [informatives, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [tags, setTags] = useState([]);
  const [contactLists, setContactLists] = useState([]);

  const [informativeModalOpen, setInformativeModalOpen] = useState(false);
  const [selectedInformative, setSelectedInformative] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [searchParam, statusFilter, audienceFilter]);

  useEffect(() => {
    (async () => {
      try {
        const [tagResponse, listResponse] = await Promise.all([
          api.get("/tags"),
          api.get("/contactLists")
        ]);
        setTags(tagResponse.data || []);
        setContactLists(listResponse.data || []);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = {
          searchParam,
          audience: audienceFilter || undefined,
          isActive:
            statusFilter === "active"
              ? true
              : statusFilter === "inactive"
              ? false
              : undefined
        };
        const { data } = await api.get("/informatives", { params });
        dispatch({ type: "LOAD_INFORMATIVES", payload: data });
        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, [searchParam, statusFilter, audienceFilter]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("informative", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_INFORMATIVE", payload: data.informative });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_INFORMATIVE", payload: +data.informativeId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenInformativeModal = () => {
    setInformativeModalOpen(true);
    setSelectedInformative(null);
  };

  const handleCloseInformativeModal = () => {
    setInformativeModalOpen(false);
    setSelectedInformative(null);
  };

  const handleEditInformative = informative => {
    setSelectedInformative(informative);
    setInformativeModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedInformative(null);
  };

  const handleDeleteInformative = async informativeId => {
    try {
      await api.delete(`/informatives/${informativeId}`);
      toast.success(i18n.t("informatives.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedInformative(null);
  };

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const formatDate = dateValue => {
    if (!dateValue) {
      return "-";
    }

    return new Date(dateValue).toLocaleString();
  };

  const resolveAudienceLabel = audience => {
    if (audience === "contactList") {
      return i18n.t("informatives.audience.contactList");
    }

    if (audience === "tags") {
      return i18n.t("informatives.audience.tags");
    }

    return i18n.t("informatives.audience.all");
  };

  const resolveTagNames = tagIds => {
    if (!tagIds || tagIds.length === 0) {
      return "-";
    }

    const map = new Map(tags.map(tag => [tag.id, tag.name]));
    const names = tagIds
      .map(id => map.get(id))
      .filter(Boolean)
      .join(", ");

    return names || "-";
  };

  const resolveContactListName = listId => {
    if (!listId) {
      return "-";
    }

    const list = contactLists.find(item => item.id === listId);
    return list?.name || "-";
  };

  const resolveTarget = informative => {
    if (informative.audience === "contactList") {
      return informative.contactList?.name || resolveContactListName(informative.contactListId);
    }

    if (informative.audience === "tags") {
      return resolveTagNames(informative.tagIds);
    }

    return "-";
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          selectedInformative &&
          `${i18n.t("informatives.confirmationModal.deleteTitle")} ${selectedInformative.title}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteInformative(selectedInformative.id)}
      >
        {i18n.t("informatives.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <InformativeModal
        open={informativeModalOpen}
        onClose={handleCloseInformativeModal}
        informativeId={selectedInformative?.id}
      />
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("informatives.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("informatives.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            className={classes.searchField}
            placeholder={i18n.t("informatives.searchPlaceholder")}
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
          <FormControl variant="outlined" margin="dense" style={{ minWidth: 150 }}>
            <InputLabel>{i18n.t("informatives.filters.status")}</InputLabel>
            <Select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              label={i18n.t("informatives.filters.status")}
            >
              <MenuItem value="">{i18n.t("informatives.filters.all")}</MenuItem>
              <MenuItem value="active">
                {i18n.t("informatives.filters.active")}
              </MenuItem>
              <MenuItem value="inactive">
                {i18n.t("informatives.filters.inactive")}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="outlined" margin="dense" style={{ minWidth: 160 }}>
            <InputLabel>{i18n.t("informatives.filters.audience")}</InputLabel>
            <Select
              value={audienceFilter}
              onChange={event => setAudienceFilter(event.target.value)}
              label={i18n.t("informatives.filters.audience")}
            >
              <MenuItem value="">{i18n.t("informatives.filters.all")}</MenuItem>
              <MenuItem value="all">{i18n.t("informatives.audience.all")}</MenuItem>
              <MenuItem value="contactList">
                {i18n.t("informatives.audience.contactList")}
              </MenuItem>
              <MenuItem value="tags">{i18n.t("informatives.audience.tags")}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            className={classes.actionButton}
            onClick={handleOpenInformativeModal}
          >
            {i18n.t("informatives.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small" className={classes.table}>
          <TableHead className={classes.tableHead}>
            <TableRow>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("informatives.table.title")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("informatives.table.audience")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("informatives.table.status")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("informatives.table.period")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("informatives.table.target")}</TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("informatives.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {informatives.map(informative => (
                <TableRow key={informative.id} className={classes.tableRow}>
                  <TableCell align="center" className={classes.tableCell}>{informative.title}</TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    {resolveAudienceLabel(informative.audience)}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    {informative.isActive
                      ? i18n.t("informatives.table.active")
                      : i18n.t("informatives.table.inactive")}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    {`${formatDate(informative.startsAt)} - ${formatDate(
                      informative.endsAt
                    )}`}
                  </TableCell>
                  <TableCell align="center" className={`${classes.tableCell} ${classes.targetCell}`}>
                    {resolveTarget(informative)}
                  </TableCell>
                  <TableCell align="center" className={`${classes.tableCell} ${classes.actionsCell}`}>
                    <IconButton
                      className={classes.actionIconButton}
                      size="small"
                      onClick={() => handleEditInformative(informative)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      className={classes.actionIconButton}
                      size="small"
                      onClick={() => {
                        setSelectedInformative(informative);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={6} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Informatives;
