import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
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

const ContactSelect = ({ selectedContactIds = [], onChange }) => {
  const classes = useStyles();
  const [contacts, setContacts] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className={classes.container}>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder={i18n.t("contactSelect.searchPlaceholder")}
        value={searchParam}
        onChange={event => setSearchParam(event.target.value.toLowerCase())}
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
