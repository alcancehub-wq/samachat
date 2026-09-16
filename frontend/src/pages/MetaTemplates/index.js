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
import MessageVariablesHelper from "../../components/MessageVariablesHelper";
import {
  AVAILABLE_MESSAGE_VARIABLES,
  appendMessageVariable
} from "../../utils/messageVariables";
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

const META_TEMPLATE_VARIABLE_EXAMPLES = {
  nome: "João",
  telefone: "5511999999999",
  email: "joao@exemplo.com",
  ticket_id: "12345",
  responsavel: "Maria",
  fila: "Atendimento",
  bom_dia: "Bom dia",
  boa_tarde: "Boa tarde",
  boa_noite: "Boa noite",
  data_atual: "08/09/2026",
  hora_atual: "10:00"
};

const buildMetaBodyDefinition = body => {
  const availableKeys = new Set(
    AVAILABLE_MESSAGE_VARIABLES.map(
      variable => variable.key
    )
  );

  const examples = [];
  const variableMapping = [];
  let position = 0;

  const text = String(body || "").replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (match, key) => {
      if (!availableKeys.has(key)) {
        return match;
      }

      position += 1;

      examples.push(
        META_TEMPLATE_VARIABLE_EXAMPLES[key] ||
          match
      );

      variableMapping.push({
        componentType: "BODY",
        position,
        variableKey: key
      });

      return `{{${position}}}`;
    }
  );

  const component = {
    type: "BODY",
    text
  };

  if (examples.length > 0) {
    component.example = {
      body_text: [examples]
    };
  }

  return {
    component,
    variableMapping
  };
};

const getTemplateParameterPositions = template => {
  const result = [];

  (template?.components || []).forEach(
    component => {
      const componentType = String(
        component?.type || ""
      ).toUpperCase();

      const seen = new Set();
      const pattern = /{{(\d+)}}/g;
      const text = String(
        component?.text || ""
      );

      let match;

      while (
        (match = pattern.exec(text)) !== null
      ) {
        const position =
          Number(match[1]);

        if (
          !Number.isInteger(position) ||
          position <= 0 ||
          seen.has(position)
        ) {
          continue;
        }

        seen.add(position);

        result.push({
          componentType,
          position,
          key:
            `${componentType}:${position}`
        });
      }
    }
  );

  return result;
};
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

  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappingTemplateKey, setMappingTemplateKey] = useState("");
  const [mappingValues, setMappingValues] = useState({});
  const [mappingSaving, setMappingSaving] = useState(false);

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

    const {
      component,
      variableMapping
    } = buildMetaBodyDefinition(
      cleanBody
    );

    try {
      await api.post(
        `/meta-message-templates/${selectedWhatsappId}`,
        {
          name: cleanName,
          language: templateLanguage.trim(),
          category: templateCategory,
          components: [
            component
          ],
          samachatVariableMapping:
            variableMapping
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
  const mappingTemplates =
    templates.filter(
      template =>
        getTemplateParameterPositions(
          template
        ).length > 0
    );

  const mappingTemplate =
    mappingTemplates.find(
      template =>
        `${template.name}:${template.language}` ===
        mappingTemplateKey
    ) || null;

  const mappingParameters =
    getTemplateParameterPositions(
      mappingTemplate
    );

  const handleOpenMappingModal = () => {
    setMappingTemplateKey("");
    setMappingValues({});
    setMappingModalOpen(true);
  };

  const handleCloseMappingModal = () => {
    if (mappingSaving) {
      return;
    }

    setMappingModalOpen(false);
    setMappingTemplateKey("");
    setMappingValues({});
  };

  const handleSelectMappingTemplate = key => {
    const template =
      mappingTemplates.find(
        item =>
          `${item.name}:${item.language}` ===
          key
      );

    const nextValues = {};

    if (template) {
      const existing =
        Array.isArray(
          template.samachatVariableMapping
        )
          ? template.samachatVariableMapping
          : [];

      getTemplateParameterPositions(
        template
      ).forEach(parameter => {
        const current =
          existing.find(
            mapping =>
              String(
                mapping.componentType || ""
              ).toUpperCase() ===
                parameter.componentType &&
              Number(mapping.position) ===
                parameter.position
          );

        nextValues[parameter.key] =
          current?.variableKey || "";
      });
    }

    setMappingTemplateKey(key);
    setMappingValues(nextValues);
  };

  const mappingComplete =
    Boolean(mappingTemplate) &&
    mappingParameters.length > 0 &&
    mappingParameters.every(
      parameter =>
        Boolean(
          mappingValues[
            parameter.key
          ]
        )
    );

  const handleSaveVariableMapping = async () => {
    if (
      !selectedWhatsappId ||
      !mappingTemplate ||
      !mappingComplete
    ) {
      return;
    }

    const samachatVariableMapping =
      mappingParameters.map(
        parameter => ({
          componentType:
            parameter.componentType,
          position:
            parameter.position,
          variableKey:
            mappingValues[
              parameter.key
            ]
        })
      );

    setMappingSaving(true);

    try {
      await api.put(
        `/meta-message-templates/${selectedWhatsappId}/${encodeURIComponent(
          mappingTemplate.name
        )}/${encodeURIComponent(
          mappingTemplate.language
        )}/variable-mapping`,
        {
          samachatVariableMapping
        }
      );

      toast.success(
        "Mapeamento de variáveis salvo."
      );

      setMappingModalOpen(false);
      setMappingTemplateKey("");
      setMappingValues({});

      await fetchTemplates();
    } catch (err) {
      toastError(err);
    } finally {
      setMappingSaving(false);
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

          <MessageVariablesHelper
            onInsertVariable={token =>
              setTemplateBody(current =>
                appendMessageVariable(current, token)
              )
            }
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

      <Dialog
        open={mappingModalOpen}
        onClose={handleCloseMappingModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Mapear variáveis do template
        </DialogTitle>

        <DialogContent dividers>
          <Typography
            variant="body2"
            color="textSecondary"
            style={{ marginBottom: 12 }}
          >
            Esta configuração é feita uma única vez por template. Campanhas, Agendamentos e Fluxos usarão o mapeamento automaticamente.
          </Typography>

          <FormControl
            variant="outlined"
            fullWidth
            margin="dense"
          >
            <InputLabel>
              Template
            </InputLabel>

            <Select
              value={mappingTemplateKey}
              onChange={event =>
                handleSelectMappingTemplate(
                  event.target.value
                )
              }
              label="Template"
            >
              <MenuItem value="">
                Selecione o template
              </MenuItem>

              {mappingTemplates.map(
                template => (
                  <MenuItem
                    key={`${template.name}:${template.language}`}
                    value={`${template.name}:${template.language}`}
                  >
                    {[
                      template.name,
                      template.category,
                      template.language
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>

          {mappingParameters.map(
            parameter => {
              const label =
                `${parameter.componentType} - variável ${parameter.position}`;

              return (
                <FormControl
                  key={parameter.key}
                  variant="outlined"
                  fullWidth
                  margin="dense"
                >
                  <InputLabel>
                    {label}
                  </InputLabel>

                  <Select
                    value={
                      mappingValues[
                        parameter.key
                      ] || ""
                    }
                    onChange={event =>
                      setMappingValues(
                        current => ({
                          ...current,
                          [parameter.key]:
                            event.target.value
                        })
                      )
                    }
                    label={label}
                  >
                    <MenuItem value="">
                      Selecione a variável SamaChat
                    </MenuItem>

                    {AVAILABLE_MESSAGE_VARIABLES.map(
                      variable => (
                        <MenuItem
                          key={variable.key}
                          value={variable.key}
                        >
                          {variable.label ||
                            `{{${variable.key}}}`}
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
              );
            }
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCloseMappingModal}
            color="secondary"
            variant="outlined"
            disabled={mappingSaving}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleSaveVariableMapping}
            color="primary"
            variant="contained"
            disabled={
              mappingSaving ||
              !mappingComplete
            }
          >
            {mappingSaving
              ? <CircularProgress size={18} />
              : "Salvar mapeamento"}
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
              variant="outlined"
              color="primary"
              className={classes.createButton}
              onClick={handleOpenMappingModal}
              disabled={
                !selectedWhatsappId ||
                mappingTemplates.length === 0
              }
            >
              Mapear variáveis
            </Button>
          )}
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