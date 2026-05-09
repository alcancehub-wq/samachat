import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Chip,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
  container: {
    border: "1px solid rgba(0, 0, 0, 0.12)",
    borderRadius: 8,
    padding: theme.spacing(1)
  },
  selectedHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  summaryCard: {
    border: "1px solid rgba(0, 0, 0, 0.12)",
    borderRadius: 8,
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    backgroundColor: "rgba(0, 0, 0, 0.02)"
  },
  selectedChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(1)
  },
  selectedHint: {
    marginBottom: theme.spacing(1),
    color: theme.palette.text.secondary
  },
  list: {
    maxHeight: 240,
    overflowY: "auto",
    marginTop: theme.spacing(1)
  },
  empty: {
    padding: theme.spacing(2),
    color: theme.palette.text.secondary
  },
  loadMore: {
    marginTop: theme.spacing(1)
  }
}));

const ContactSelect = ({
  selectedContactIds = [],
  selectedContacts = [],
  onChange
}) => {
  const classes = useStyles();
  const [contacts, setContacts] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [knownContacts, setKnownContacts] = useState([]);

  useEffect(() => {
    setKnownContacts(prevState => {
      const contactMap = new Map(prevState.map(contact => [contact.id, contact]));

      selectedContacts.forEach(contact => {
        if (contact?.id) {
          contactMap.set(contact.id, contact);
        }
      });

      contacts.forEach(contact => {
        if (contact?.id) {
          contactMap.set(contact.id, contact);
        }
      });

      return Array.from(contactMap.values());
    });
  }, [contacts, selectedContacts]);

  useEffect(() => {
    setContacts([]);
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/contacts", {
          params: { searchParam, pageNumber }
        });

        setContacts(prevState =>
          pageNumber === 1
            ? data.contacts
            : [...prevState, ...data.contacts]
        );
        setHasMore(data.hasMore);
      } catch (err) {
        toastError(err);
      }
      setLoading(false);
    };

    fetchContacts();
  }, [searchParam, pageNumber]);

  const toggleContact = contactId => {
    if (typeof onChange !== "function") return;

    if (selectedContactIds.includes(contactId)) {
      onChange(selectedContactIds.filter(id => id !== contactId));
      return;
    }

    onChange([...selectedContactIds, contactId]);
  };

  const syncSelection = nextIds => {
    if (typeof onChange !== "function") return;
    onChange(nextIds);
  };

  const handleClearSelection = () => {
    syncSelection([]);
  };

  const resolvedSelectedContacts = selectedContactIds
    .map(contactId =>
      knownContacts.find(contact => contact.id === contactId) || {
        id: contactId,
        name: `#${contactId}`,
        number: ""
      }
    )
    .filter(Boolean);

  return (
    <div className={classes.container}>
      <div className={classes.summaryCard}>
        <div className={classes.selectedHeader}>
          <Typography variant="subtitle2">
            {i18n.t("contactSelect.selected", {
              count: resolvedSelectedContacts.length
            })}
          </Typography>
          <Button
            size="small"
            color="secondary"
            onClick={handleClearSelection}
            disabled={resolvedSelectedContacts.length === 0}
          >
            {i18n.t("contactSelect.clearSelection")}
          </Button>
        </div>
        <Typography variant="body2" className={classes.selectedHint}>
          {resolvedSelectedContacts.length > 0
            ? i18n.t("contactSelect.selectedHint")
            : i18n.t("contactSelect.noneSelected")}
        </Typography>
        {resolvedSelectedContacts.length > 0 && (
          <>
            <div className={classes.selectedHeader}>
              <Button
                size="small"
                onClick={() => setSearchParam("")}
                disabled={!searchParam}
              >
                {i18n.t("contactSelect.showAll")}
              </Button>
            </div>
            <div className={classes.selectedChips}>
              {resolvedSelectedContacts.map(contact => (
                <Chip
                  key={contact.id}
                  label={contact.name || contact.number || `#${contact.id}`}
                  onDelete={() => syncSelection(selectedContactIds.filter(id => id !== contact.id))}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </div>
          </>
        )}
      </div>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder={i18n.t("contactSelect.searchPlaceholder")}
        value={searchParam}
        onChange={event => setSearchParam(event.target.value)}
      />
      <List dense className={classes.list}>
        {contacts.length === 0 && !loading && (
          <Typography className={classes.empty}>
            {i18n.t("contactSelect.empty")}
          </Typography>
        )}
        {contacts.map(contact => (
          <ListItem
            key={contact.id}
            button
            onClick={() => toggleContact(contact.id)}
          >
            <Checkbox
              checked={selectedContactIds.includes(contact.id)}
              color="primary"
            />
            <ListItemText
              primary={contact.name}
              secondary={contact.number}
            />
          </ListItem>
        ))}
      </List>
      {hasMore && (
        <Button
          onClick={() => setPageNumber(prevState => prevState + 1)}
          variant="outlined"
          size="small"
          className={classes.loadMore}
        >
          {i18n.t("contactSelect.loadMore")}
        </Button>
      )}
    </div>
  );
};

export default ContactSelect;
