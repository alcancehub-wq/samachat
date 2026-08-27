import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import DeleteOutline from "@material-ui/icons/DeleteOutline";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1.25, 1, 0),
    overflowY: "auto",
    ...theme.scrollbarStyles,
    borderRadius: 16,
    border: `1px solid ${theme.custom.panelBorder}`,
    boxShadow: "none",
    backgroundColor: theme.palette.background.paper,
    backgroundImage: theme.custom.panelGradient
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5)
  },
  pageSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6
  },
  filters: {
    minWidth: 260
  },
  table: {
    borderCollapse: "separate",
    borderSpacing: "0 8px"
  },
  tableHeadCell: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    borderBottom: "none"
  },
  tableRow: {
    backgroundColor: theme.palette.background.paper,
    "& > td": { borderBottom: "none" },
    "& td:first-child": {
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12
    },
    "& td:last-child": {
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12
    },
    "&:hover": {
      backgroundColor: theme.custom.tableHover
    }
  },
  emptyState: {
    padding: theme.spacing(5, 2),
    textAlign: "center",
    color: theme.palette.text.secondary
  },
  refreshButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600
  },
  createButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600
  }
}));

const MetaTemplates = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [officialConnections, setOfficialConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [selectedWhatsappId, setSelectedWhatsappId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("UTILITY");
  const [templateLanguage, setTemplateLanguage] = useState("pt_BR");
  const [templateBody, setTemplateBody] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const permissions = user?.permissions || [];
  const isAdmin = user?.profile?.toLowerCase() === "admin";
  const canCreateTemplate =
    isAdmin || permissions.includes("metaTemplates.create");

  const canDeleteTemplate =
    isAdmin || permissions.includes("metaTemplates.delete");

  const resetCreateForm = () => {
    setTemplateName("");
    setTemplateCategory("UTILITY");
    setTemplateLanguage("pt_BR");
    setTemplateBody("");
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (creating) {
      return;
    }

    setCreateModalOpen(false);
    resetCreateForm();
  };

  const loadAuthorizedConnections = async () => {
    setConnectionsLoading(true);

    try {
      const { data } = await api.get(
        "/meta-message-templates/authorized-connections"
      );
      setOfficialConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      setOfficialConnections([]);
      toastError(err);
    } finally {
      setConnectionsLoading(false);
    }
  };

  useEffect(() => {
    loadAuthorizedConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedWhatsappId && officialConnections.length > 0) {
      setSelectedWhatsappId(String(officialConnections[0].id));
    }
  }, [officialConnections, selectedWhatsappId]);

  const fetchTemplates = async () => {
    if (!selectedWhatsappId) {
      setTemplates([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get(
        `/meta-message-templates/${selectedWhatsappId}`
      );
      setTemplates(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setTemplates([]);
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWhatsappId]);

  const handleCreateTemplate = async () => {
    const cleanName = templateName.trim();
    const cleanBody = templateBody.trim();

    if (
      !selectedWhatsappId ||
      !cleanName ||
      !templateCategory ||
      !templateLanguage.trim() ||
      !cleanBody
    ) {
      return;
    }

    setCreating(true);

    try {
      await api.post(
        `/meta-message-templates/${selectedWhatsappId}`,
        {
          name: cleanName,
          language: templateLanguage.trim(),
          category: templateCategory,
          components: [
            {
              type: "BODY",
              text: cleanBody
            }
          ]
        }
      );

      toast.success(i18n.t("metaTemplates.toasts.created"));
      setCreateModalOpen(false);
      resetCreateForm();
      await fetchTemplates();
    } catch (err) {
      toastError(err);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDeleteModal = template => {
    if (!template?.name) {
      return;
    }

    setTemplateToDelete(template);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (deleting) {
      return;
    }

    setDeleteModalOpen(false);
    setTemplateToDelete(null);
  };

  const handleDeleteTemplate = async () => {
    if (
      !selectedWhatsappId ||
      !templateToDelete?.name
    ) {
      return;
    }

    setDeleting(true);

    try {
      await api.delete(
        `/meta-message-templates/${selectedWhatsappId}/${encodeURIComponent(
          templateToDelete.name
        )}`
      );

      toast.success(i18n.t("metaTemplates.toasts.deleted"));
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
      await fetchTemplates();
    } catch (err) {
      toastError(err);
    } finally {
      setDeleting(false);
    }
  };
  const createFormValid =
    Boolean(templateName.trim()) &&
    Boolean(templateCategory) &&
    Boolean(templateLanguage.trim()) &&
    Boolean(templateBody.trim());

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          templateToDelete
            ? `${i18n.t("metaTemplates.deleteModal.title")} ${templateToDelete.name}?`
            : i18n.t("metaTemplates.deleteModal.title")
        }
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteTemplate}
      >
        {deleting
          ? <CircularProgress size={18} />
          : i18n.t("metaTemplates.deleteModal.message")}
      </ConfirmationModal>

      <Dialog
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {i18n.t("metaTemplates.createModal.title")}
        </DialogTitle>

        <DialogContent dividers>
          <TextField
            label={i18n.t("metaTemplates.createModal.name")}
            variant="outlined"
            fullWidth
            margin="dense"
            value={templateName}
            onChange={event => setTemplateName(event.target.value)}
            disabled={creating}
          />

          <FormControl
            variant="outlined"
            fullWidth
            margin="dense"
            disabled={creating}
          >
            <InputLabel>
              {i18n.t("metaTemplates.createModal.category")}
            </InputLabel>

            <Select
              value={templateCategory}
              onChange={event => setTemplateCategory(event.target.value)}
              label={i18n.t("metaTemplates.createModal.category")}
            >
              {["MARKETING", "UTILITY", "AUTHENTICATION"].map(category => (
                <MenuItem key={category} value={category}>
                  {i18n.t(
                    `metaTemplates.createModal.categories.${category}`
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={i18n.t("metaTemplates.createModal.language")}
            variant="outlined"
            fullWidth
            margin="dense"
            value={templateLanguage}
            onChange={event => setTemplateLanguage(event.target.value)}
            disabled={creating}
          />

          <TextField
            label={i18n.t("metaTemplates.createModal.body")}
            variant="outlined"
            fullWidth
            margin="dense"
            multiline
            rows={5}
            value={templateBody}
            onChange={event => setTemplateBody(event.target.value)}
            disabled={creating}
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCloseCreateModal}
            color="secondary"
            variant="outlined"
            disabled={creating}
          >
            {i18n.t("metaTemplates.createModal.cancel")}
          </Button>

          <Button
            onClick={handleCreateTemplate}
            color="primary"
            variant="contained"
            disabled={
              creating ||
              !selectedWhatsappId ||
              !createFormValid
            }
          >
            {creating
              ? <CircularProgress size={18} />
              : i18n.t("metaTemplates.createModal.submit")}
          </Button>
        </DialogActions>
      </Dialog>

      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("metaTemplates.title")}</Title>
          <Typography className={classes.pageSubtitle}>
            {i18n.t("metaTemplates.subtitle")}
          </Typography>
        </div>

        <MainHeaderButtonsWrapper>
          <FormControl
            variant="outlined"
            size="small"
            className={classes.filters}
            disabled={connectionsLoading || officialConnections.length === 0}
          >
            <InputLabel>{i18n.t("metaTemplates.connection")}</InputLabel>
            <Select
              value={selectedWhatsappId}
              onChange={event => setSelectedWhatsappId(event.target.value)}
              label={i18n.t("metaTemplates.connection")}
            >
              {officialConnections.map(connection => (
                <MenuItem key={connection.id} value={String(connection.id)}>
                  {connection.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {canCreateTemplate && (
            <Button
              variant="contained"
              color="primary"
              className={classes.createButton}
              disabled={!selectedWhatsappId || connectionsLoading}
              onClick={handleOpenCreateModal}
            >
              {i18n.t("metaTemplates.buttons.create")}
            </Button>
          )}

          <Button
            variant="outlined"
            className={classes.refreshButton}
            startIcon={
              loading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            disabled={!selectedWhatsappId || loading}
            onClick={fetchTemplates}
          >
            {i18n.t("metaTemplates.refresh")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper}>
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("metaTemplates.table.name")}
              </TableCell>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("metaTemplates.table.category")}
              </TableCell>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("metaTemplates.table.language")}
              </TableCell>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("metaTemplates.table.status")}
              </TableCell>
              {canDeleteTemplate && (
                <TableCell
                  className={classes.tableHeadCell}
                  align="right"
                />
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && <TableRowSkeleton columns={canDeleteTemplate ? 5 : 4} />}

            {!loading &&
              templates.map(template => (
                <TableRow
                  key={template.id || `${template.name}-${template.language}`}
                  className={classes.tableRow}
                >
                  <TableCell>{template.name || "-"}</TableCell>
                  <TableCell>{template.category || "-"}</TableCell>
                  <TableCell>{template.language || "-"}</TableCell>
                  <TableCell>{template.status || "-"}</TableCell>

                  {canDeleteTemplate && (
                    <TableCell align="right">
                      <Tooltip
                        title={i18n.t("metaTemplates.deleteModal.title")}
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDeleteModal(template)}
                            disabled={!template.name || deleting}
                          >
                            <DeleteOutline />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {!loading && officialConnections.length === 0 && (
          <Typography className={classes.emptyState}>
            {i18n.t("metaTemplates.empty.noOfficialConnection")}
          </Typography>
        )}

        {!loading &&
          officialConnections.length > 0 &&
          templates.length === 0 && (
            <Typography className={classes.emptyState}>
              {i18n.t("metaTemplates.empty.noTemplates")}
            </Typography>
          )}
      </Paper>
    </MainContainer>
  );
};

export default MetaTemplates;