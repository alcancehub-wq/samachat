import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import ButtonWithSpinner from "../ButtonWithSpinner";

const useStyles = makeStyles(theme => ({
  warningBox: {
    borderRadius: 10,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    color: theme.palette.text.primary
  },
  optionText: {
    display: "flex",
    flexDirection: "column"
  },
  optionNumber: {
    color: theme.palette.text.secondary,
    fontSize: "0.85rem"
  },
  fieldSpacing: {
    marginTop: theme.spacing(2)
  }
}));

const filterOptions = createFilterOptions({
  trim: true
});

const MergeContactModal = ({
  open,
  onClose,
  targetContactId,
  targetContactName,
  targetContactNumber,
  targetAllowMultipleConversations,
  targetUserId,
  onMerged
}) => {
  const classes = useStyles();
  const [options, setOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSearchDone, setAutoSearchDone] = useState(false);

  const mustChooseResponsible =
    Boolean(selectedContact) && targetAllowMultipleConversations !== true;

  useEffect(() => {
    if (!open) {
      setOptions([]);
      setUsers([]);
      setSearchParam("");
      setSelectedContact(null);
      setSelectedUser(null);
      setLoading(false);
      setUsersLoading(false);
      setSaving(false);
      setAutoSearchDone(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !targetContactNumber || autoSearchDone) {
      return;
    }

    const normalizedNumber = String(targetContactNumber).replace(/\D/g, "");

    if (normalizedNumber.length < 8) {
      setAutoSearchDone(true);
      return;
    }

    setLoading(true);
    setAutoSearchDone(true);

    const loadDuplicatedContacts = async () => {
      try {
        const { data } = await api.get("/contacts/" + targetContactId + "/duplicates");

        const contacts = data.contacts || [];

        setOptions(contacts);

        if (contacts.length === 1) {
          setSelectedContact(contacts[0]);
        }

        if (contacts.length > 0) {
          setSearchParam(normalizedNumber);
        }
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    loadDuplicatedContacts();
  }, [open, targetContactNumber, targetContactId, autoSearchDone]);

  useEffect(() => {
    if (!open || !mustChooseResponsible || users.length > 0 || usersLoading) {
      return;
    }

    setUsersLoading(true);

    const loadUsers = async () => {
      try {
        const { data } = await api.get("/users/");
        const loadedUsers = data.users || [];

        setUsers(loadedUsers);

        const currentUser = loadedUsers.find(
          user => Number(user.id) === Number(targetUserId)
        );

        if (currentUser) {
          setSelectedUser(currentUser);
        }
      } catch (err) {
        toastError(err);
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [open, mustChooseResponsible, users.length, usersLoading, targetUserId]);

  useEffect(() => {
    if (!open || searchParam.length < 3) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const delay = setTimeout(async () => {
      try {
        const { data } = await api.get("/contacts", {
          params: { searchParam, pageNumber: 1 }
        });

        setOptions(
          (data.contacts || []).filter(
            contact => Number(contact.id) !== Number(targetContactId)
          )
        );
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [open, searchParam, targetContactId]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (!selectedContact?.id || !targetContactId) {
      return;
    }

    if (mustChooseResponsible && !selectedUser?.id) {
      toast.error("Escolha o respons\u00e1vel final deste cliente.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/contacts/" + targetContactId + "/merge", {
        sourceContactId: selectedContact.id,
        targetUserId: mustChooseResponsible ? selectedUser.id : null
      });

      toast.success("Contatos mesclados com sucesso.");
      onClose();

      if (typeof onMerged === "function") {
        onMerged();
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Mesclar contato duplicado</DialogTitle>
        <DialogContent dividers>
          <div className={classes.warningBox}>
            <Typography variant="body2">
              {"O contato selecionado abaixo ser\u00e1 mesclado em "}
              <strong>{targetContactName || targetContactNumber || ("#" + targetContactId)}</strong>.
              {" Tickets, mensagens, agendamentos, tarefas, tags e listas ser\u00e3o movidos para o contato atual."}
            </Typography>
          </div>

          <Autocomplete
            getOptionLabel={option =>
              option ? (option.name || "Sem nome") + " - " + (option.number || "sem n\u00famero") : ""
            }
            renderOption={option => (
              <div className={classes.optionText}>
                <span>{option.name || "Sem nome"}</span>
                <span className={classes.optionNumber}>{option.number || "sem n\u00famero"}</span>
              </div>
            )}
            value={selectedContact}
            onChange={(event, value) => setSelectedContact(value)}
            options={options}
            filterOptions={filterOptions}
            loading={loading}
            autoHighlight
            noOptionsText={"Nenhum contato duplicado encontrado para este n\u00famero."}
            renderInput={params => (
              <TextField
                {...params}
                label={"Contato duplicado localizado pelo n\u00famero"}
                variant="outlined"
                autoFocus
                onChange={event => setSearchParam(event.target.value)}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
          />

          {selectedContact && (
            <Typography variant="body2" style={{ marginTop: 16 }}>
              {"Ser\u00e1 mesclado: "}
              <strong>{selectedContact.name}</strong>{" "}
              {selectedContact.number ? "(" + selectedContact.number + ")" : ""}
            </Typography>
          )}

          {mustChooseResponsible && (
            <>
              <Typography variant="body2" style={{ marginTop: 16 }}>
                {"Este cliente n\u00e3o permite m\u00faltiplas conversas. Escolha qual respons\u00e1vel ficar\u00e1 com o atendimento principal."}
              </Typography>

              <Autocomplete
                className={classes.fieldSpacing}
                getOptionLabel={option => option?.name || ""}
                value={selectedUser}
                onChange={(event, value) => setSelectedUser(value)}
                options={users}
                loading={usersLoading}
                autoHighlight
                noOptionsText={"Nenhum usu\u00e1rio encontrado"}
                renderInput={params => (
                  <TextField
                    {...params}
                    label={"Respons\u00e1vel final"}
                    variant="outlined"
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {usersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <ButtonWithSpinner
            type="submit"
            color="primary"
            variant="contained"
            loading={saving}
            disabled={!selectedContact || saving || (mustChooseResponsible && !selectedUser)}
          >
            Mesclar contatos
          </ButtonWithSpinner>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MergeContactModal;
