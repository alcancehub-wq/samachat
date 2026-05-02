import React, { useState, useEffect, useReducer, useContext } from "react";
import openSocket from "../../services/socket-io";
import { toast } from "react-toastify";
import { useHistory, useLocation } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import Checkbox from "@material-ui/core/Checkbox";
import Typography from "@material-ui/core/Typography";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal/";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import TagSelect from "../../components/TagSelect";

const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload;
    const newContacts = [];

    contacts.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;

    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  pageContainer: {
    padding: theme.spacing(0.5, 0.5, 0),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0.5, 0.5, 0),
    },
  },
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1.25, 1, 0),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    borderRadius: 16,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 16px 28px rgba(15, 23, 42, 0.08)",
    backgroundColor: "#ffffff",
    backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5),
  },
  headerTopRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    flexWrap: "wrap",
  },
  headerBottomRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    [theme.breakpoints.down("sm")]: {
      justifyContent: "flex-start",
    },
  },
  pageSubtitle: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6,
  },
  searchField: {
    minWidth: 320,
    backgroundColor: "#ffffff",
    marginLeft: "auto",
    [theme.breakpoints.down("sm")]: {
      minWidth: "100%",
      marginLeft: 0,
    },
  },
  searchInputRoot: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  actionButton: {
    borderRadius: 4,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none !important",
    backgroundImage: "none !important",
    backgroundColor: "#FF1919 !important",
    color: "#FFFFFF !important",
    "&:hover": {
      backgroundColor: "#E11414 !important",
      boxShadow: "none !important",
    },
    "&.Mui-disabled": {
      backgroundColor: "rgba(255, 25, 25, 0.18) !important",
      color: "rgba(255, 255, 255, 0.72) !important",
    },
  },
  importButton: {
    marginLeft: "auto",
    [theme.breakpoints.down("sm")]: {
      marginLeft: 0,
    },
  },
  bulkActionButton: {
    borderRadius: 4,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none !important",
    backgroundColor: "#FF1919 !important",
    color: "#FFFFFF !important",
    "&:hover": {
      backgroundColor: "#E11414 !important",
      boxShadow: "none !important",
    },
    "&.Mui-disabled": {
      backgroundColor: "rgba(255, 25, 25, 0.18) !important",
      color: "rgba(255, 255, 255, 0.72) !important",
    },
  },
  selectionInfo: {
    fontSize: "0.86rem",
    color: theme.palette.text.secondary,
    fontWeight: 600,
  },
  table: {
    borderCollapse: "separate",
    borderSpacing: "0 8px",
  },
  tableHead: {
    backgroundColor: "transparent",
  },
  tableHeadCell: {
    color: "#111111",
    fontWeight: 700,
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    borderBottom: "none",
  },
  tableRow: {
    backgroundColor: "#ffffff",
    boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
    borderRadius: 12,
    "& > td": {
      borderBottom: "none",
    },
    "& td:first-child": {
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
    "& td:last-child": {
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
    },
    "&:hover": {
      backgroundColor: "rgba(14, 165, 233, 0.06)",
    },
  },
  tableCell: {
    paddingTop: theme.spacing(1.25),
    paddingBottom: theme.spacing(1.25),
  },
  leadingCell: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  checkboxCell: {
    width: 72,
  },
  checkboxRoot: {
    padding: theme.spacing(0.5),
  },
  avatar: {
    width: 36,
    height: 36,
  },
  actionsCell: {
    whiteSpace: "nowrap",
  },
  actionIconButton: {
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    marginRight: theme.spacing(0.5),
    borderRadius: 10,
  },
}));

const Contacts = () => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();

  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("import");
  const [hasMore, setHasMore] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search");
    if (search) {
      setSearchParam(search.toLowerCase());
    }
  }, [location.search]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setSelectedContactIds([]);
  }, [searchParam, selectedTagIds]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: {
              searchParam,
              pageNumber,
              tagIds: JSON.stringify(selectedTagIds),
            },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("contact", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const handleToggleContactSelection = (contactId) => {
    setSelectedContactIds((prevState) =>
      prevState.includes(contactId)
        ? prevState.filter((id) => id !== contactId)
        : [...prevState, contactId]
    );
  };

  const handleToggleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedContactIds(contacts.map((contact) => contact.id));
      return;
    }

    setSelectedContactIds([]);
  };

  const handleSaveTicket = async (contactId) => {
    if (!contactId) return;
    setLoading(true);
    try {
      const { data: ticket } = await api.post("/tickets", {
        contactId: contactId,
        userId: user?.id,
        status: "open",
      });
      history.push(`/tickets/${ticket.id}`);
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const hadleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSelectedContactIds((prevState) => prevState.filter((id) => id !== contactId));
    setSearchParam("");
    setPageNumber(1);
  };

  const handleDeleteSelectedContacts = async () => {
    try {
      await Promise.all(selectedContactIds.map((contactId) => api.delete(`/contacts/${contactId}`)));
      toast.success("Contatos selecionados excluídos.");
      setSelectedContactIds([]);
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleimportContact = async () => {
    try {
      await api.post("/contacts/import");
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleOpenImportConfirmation = () => {
    setDeletingContact(null);
    setConfirmAction("import");
    setConfirmOpen(true);
  };

  const handleOpenBulkDeleteConfirmation = () => {
    setDeletingContact(null);
    setConfirmAction("bulk-delete");
    setConfirmOpen(true);
  };

  const handleOpenSingleDeleteConfirmation = (contact) => {
    setDeletingContact(contact);
    setConfirmAction("single-delete");
    setConfirmOpen(true);
  };

  const handleEditSelectedContact = () => {
    if (selectedContactIds.length !== 1) {
      return;
    }

    hadleEditContact(selectedContactIds[0]);
  };

  const allVisibleSelected = contacts.length > 0 && selectedContactIds.length === contacts.length;
  const someVisibleSelected = selectedContactIds.length > 0 && !allVisibleSelected;

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <MainContainer className={classes.pageContainer}>
      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
      ></ContactModal>
      <ConfirmationModal
        title={
          confirmAction === "single-delete"
            ? `${i18n.t("contacts.confirmationModal.deleteTitle")} ${deletingContact?.name}?`
            : confirmAction === "bulk-delete"
            ? `Excluir ${selectedContactIds.length} contatos selecionados?`
            : `${i18n.t("contacts.confirmationModal.importTitlte")}`
        }
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={(e) =>
          confirmAction === "single-delete"
            ? handleDeleteContact(deletingContact.id)
            : confirmAction === "bulk-delete"
            ? handleDeleteSelectedContacts()
            : handleimportContact()
        }
      >
        {confirmAction === "single-delete"
          ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
          : confirmAction === "bulk-delete"
          ? "Os contatos selecionados serão excluídos em lote."
          : `${i18n.t("contacts.confirmationModal.importMessage")}`}
      </ConfirmationModal>
      <MainHeader>
        <div className={classes.headerTopRow}>
          <div className={classes.headerTitle}>
            <Title>Clientes</Title>
            <Typography className={classes.pageSubtitle}>
              {i18n.t("contacts.subtitle")}
            </Typography>
          </div>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            className={classes.searchField}
            InputProps={{
              classes: { root: classes.searchInputRoot },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
        </div>
        <MainHeaderButtonsWrapper className={classes.headerBottomRow}>
          <TagSelect
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            label={i18n.t("contacts.tagsFilter")}
            style={{ minWidth: 200 }}
          />
          {selectedContactIds.length > 0 && (
            <Typography className={classes.selectionInfo}>
              {selectedContactIds.length} selecionado(s)
            </Typography>
          )}
          <Button
            variant="contained"
            className={classes.bulkActionButton}
            disabled={selectedContactIds.length !== 1}
            onClick={handleEditSelectedContact}
          >
            Editar selecionado
          </Button>
          <Can
            role={user.profile}
            perform="contacts-page:deleteContact"
            yes={() => (
              <Button
                variant="contained"
                className={classes.bulkActionButton}
                disabled={selectedContactIds.length === 0}
                onClick={handleOpenBulkDeleteConfirmation}
              >
                Excluir selecionados
              </Button>
            )}
          />
          <Button
            variant="contained"
            className={`${classes.actionButton} ${classes.importButton}`}
            onClick={handleOpenImportConfirmation}
          >
            {i18n.t("contacts.buttons.import")}
          </Button>
          <Button
            variant="contained"
            className={classes.actionButton}
            onClick={handleOpenContactModal}
          >
            {i18n.t("contacts.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small" className={classes.table}>
          <TableHead className={classes.tableHead}>
            <TableRow>
              <TableCell padding="checkbox" className={classes.tableHeadCell}>
                <Checkbox
                  indeterminate={someVisibleSelected}
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAll}
                  classes={{ root: classes.checkboxRoot }}
                  color="primary"
                />
              </TableCell>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("contacts.table.name")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("contacts.table.whatsapp")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("contacts.table.email")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("contacts.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {contacts.map((contact) => (
                <TableRow key={contact.id} className={classes.tableRow}>
                  <TableCell className={classes.tableCell}>
                    <div className={classes.leadingCell}>
                      <Checkbox
                        checked={selectedContactIds.includes(contact.id)}
                        onChange={() => handleToggleContactSelection(contact.id)}
                        classes={{ root: classes.checkboxRoot }}
                        color="primary"
                      />
                      <Avatar src={contact.profilePicUrl} className={classes.avatar} />
                    </div>
                  </TableCell>
                  <TableCell className={classes.tableCell}>{contact.name}</TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    {contact.number}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCell}>
                    {contact.email}
                  </TableCell>
                  <TableCell align="center" className={classes.actionsCell}>
                    <IconButton
                      size="small"
                      className={classes.actionIconButton}
                      onClick={() => handleSaveTicket(contact.id)}
                    >
                      <WhatsAppIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      className={classes.actionIconButton}
                      onClick={() => hadleEditContact(contact.id)}
                    >
                      <EditIcon />
                    </IconButton>
                    <Can
                      role={user.profile}
                      perform="contacts-page:deleteContact"
                      yes={() => (
                        <IconButton
                          size="small"
                          className={classes.actionIconButton}
                          onClick={() => handleOpenSingleDeleteConfirmation(contact)}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton avatar columns={3} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Contacts;
