import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";

import {
  Add,
  DeleteOutline,
  Edit,
  FileCopy
} from "@material-ui/icons";

import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import MessageVariablesHelper from "../MessageVariablesHelper";
import { appendMessageVariable } from "../../utils/messageVariables";

const messageVariables = [
  { sequence: 1, key: "nome", label: "Nome do contato" },
  { sequence: 2, key: "telefone", label: "Telefone do contato" },
  { sequence: 3, key: "email", label: "E-mail do contato" },
  { sequence: 4, key: "ticket_id", label: "ID do atendimento" },
  { sequence: 5, key: "responsavel", label: "Respons\u00e1vel" },
  { sequence: 6, key: "fila", label: "Setor / fila" },
  { sequence: 7, key: "bom_dia", label: "Bom dia" },
  { sequence: 8, key: "boa_tarde", label: "Boa tarde" },
  { sequence: 9, key: "boa_noite", label: "Boa noite" },
  { sequence: 10, key: "data_atual", label: "Data atual" },
  { sequence: 11, key: "hora_atual", label: "Hora atual" },
  { sequence: 12, key: "eduzz_comprador_nome", label: "Eduzz \u2014 comprador: nome" },
  { sequence: 13, key: "eduzz_comprador_email", label: "Eduzz \u2014 comprador: e-mail" },
  { sequence: 14, key: "eduzz_comprador_telefone", label: "Eduzz \u2014 comprador: telefone" },
  { sequence: 15, key: "eduzz_fatura_id", label: "Eduzz \u2014 ID da fatura" },
  { sequence: 16, key: "eduzz_produto_id", label: "Eduzz \u2014 ID do produto" },
  { sequence: 17, key: "eduzz_evento_id", label: "Eduzz \u2014 ID do webhook" },
  { sequence: 18, key: "eduzz_evento_nome", label: "Eduzz \u2014 nome do evento webhook" },
  { sequence: 19, key: "blinket_evento_id", label: "Blinket \u2014 ID do evento" },
  { sequence: 20, key: "blinket_evento_nome", label: "Blinket \u2014 nome do evento" },
  { sequence: 21, key: "blinket_participante_id", label: "Blinket \u2014 ID do participante" },
  { sequence: 22, key: "blinket_invite_key", label: "Blinket \u2014 invite key" },
  { sequence: 23, key: "blinket_ingresso_nome", label: "Blinket \u2014 nome do ingresso" },
  { sequence: 24, key: "blinket_participante_nome", label: "Blinket \u2014 participante: nome" },
  { sequence: 25, key: "blinket_participante_email", label: "Blinket \u2014 participante: e-mail" },
  { sequence: 26, key: "blinket_participante_telefone", label: "Blinket \u2014 participante: telefone" },
  { sequence: 27, key: "blinket_participante_status", label: "Blinket \u2014 participante: status" }
];

const getTextTemplateSlots = template => {
  if (!template || !Array.isArray(template.components)) {
    return [];
  }

  const slots = [];

  template.components.forEach(component => {
    const type =
      String(component?.type || "")
        .trim()
        .toLowerCase();

    const format =
      String(component?.format || "")
        .trim()
        .toLowerCase();

    const text =
      String(component?.text || "");

    const positionalMatches =
      [...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)];

    if (type === "header") {
      const isTextHeader =
        !format || format === "text";

      if (!isTextHeader) {
        slots.push({
          unsupported: true,
          componentType: "header",
          reason: `dynamic_header_${format || "unknown"}`
        });

        return;
      }

      const positions =
        [...new Set(
          positionalMatches
            .map(match => Number(match[1]))
            .filter(Number.isInteger)
        )].sort((a, b) => a - b);

      positions.forEach(position => {
        slots.push({
          unsupported: false,
          componentType: "header",
          position
        });
      });

      return;
    }

    if (type === "body") {
      const positions =
        [...new Set(
          positionalMatches
            .map(match => Number(match[1]))
            .filter(Number.isInteger)
        )].sort((a, b) => a - b);

      positions.forEach(position => {
        slots.push({
          unsupported: false,
          componentType: "body",
          position
        });
      });

      return;
    }

    if (type === "buttons") {
      const buttons =
        Array.isArray(component?.buttons)
          ? component.buttons
          : [];

      const dynamicButton =
        buttons.some(button => {
          const buttonText =
            JSON.stringify(button || {});

          return (
            /\{\{\s*\d+\s*\}\}/.test(buttonText) ||
            ["URL", "COPY_CODE"].includes(
              String(button?.type || "").toUpperCase()
            )
          );
        });

      if (dynamicButton) {
        slots.push({
          unsupported: true,
          componentType: "buttons",
          reason: "dynamic_button"
        });
      }

      return;
    }

    const serialized =
      JSON.stringify(component || {});

    if (
      /\{\{\s*\d+\s*\}\}/.test(serialized)
    ) {
      slots.push({
        unsupported: true,
        componentType: type || "unknown",
        reason: "unsupported_dynamic_component"
      });
    }
  });

  return slots;
};
const buildMetaTemplateComponents = (
  template,
  mapping
) => {
  const slots =
    getTextTemplateSlots(template);

  if (
    slots.some(slot => slot.unsupported)
  ) {
    throw new Error(
      "ERR_EDUZZ_META_TEMPLATE_DYNAMIC_COMPONENT_UNSUPPORTED"
    );
  }

  if (slots.length === 0) {
    return [];
  }

  const grouped = {};

  slots.forEach(slot => {
    const mapKey =
      `${slot.componentType}:${slot.position}`;

    const variableKey =
      mapping?.[mapKey];

    if (!variableKey) {
      throw new Error(
        "ERR_EDUZZ_META_TEMPLATE_MAPPING_INCOMPLETE"
      );
    }

    if (!grouped[slot.componentType]) {
      grouped[slot.componentType] = [];
    }

    grouped[slot.componentType].push({
      position: slot.position,
      parameter: {
        type: "text",
        text: `{{${variableKey}}}`
      }
    });
  });

  return Object.keys(grouped).map(type => ({
    type,
    parameters: grouped[type]
      .sort((a, b) => a.position - b.position)
      .map(item => item.parameter)
  }));
};
const emptyRule = {
  id: null,
  eventName: "myeduzz.invoice_paid",
  productId: "",
  whatsappId: "",
  userId: "",
  messageMode: "text",
  messageBody: "",
  metaTemplateName: "",
  metaTemplateLanguage: "",
  metaTemplateComponents: null,
  isActive: true
};

const EduzzRuleConfigModal = ({
  open,
  onClose,
  integration
}) => {
  const { whatsApps = [] } = useContext(WhatsAppsContext);
  const [rules, setRules] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [credentialEditing, setCredentialEditing] = useState(false);
  const [credentialSaving, setCredentialSaving] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    id: null,
    name: "",
    secret: "",
    isDefault: true,
    isActive: true
  });

  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateParameterMapping, setTemplateParameterMapping] = useState({});
  const [rule, setRule] = useState(emptyRule);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editing, setEditing] = useState(false);

  const integrationId = integration?.id;

  const webhookUrl = useMemo(() => {
    if (!integrationId) {
      return "";
    }

    const baseUrl = String(api.defaults.baseURL || "")
      .replace(/\/$/, "");

    return `${baseUrl}/integrations/eduzz/${integrationId}/webhook`;
  }, [integrationId]);

  const selectedWhatsapp = useMemo(
    () =>
      whatsApps.find(
        item => Number(item.id) === Number(rule.whatsappId)
      ),
    [rule.whatsappId, whatsApps]
  );

  const isOfficial =
    selectedWhatsapp?.providerType === "official";

  const approvedTemplates = useMemo(
    () =>
      templates.filter(
        item =>
          String(item.status || "").toUpperCase() ===
          "APPROVED"
      ),
    [templates]
  );
  const selectedTemplate = useMemo(
    () =>
      approvedTemplates.find(
        item =>
          item.name === rule.metaTemplateName &&
          item.language === rule.metaTemplateLanguage
      ) || null,
    [
      approvedTemplates,
      rule.metaTemplateName,
      rule.metaTemplateLanguage
    ]
  );

  const templateSlots = useMemo(
    () => getTextTemplateSlots(selectedTemplate),
    [selectedTemplate]
  );

  const hasUnsupportedDynamicComponent =
    templateSlots.some(slot => slot.unsupported);


  const loadRules = useCallback(async () => {
    if (!integrationId) {
      return;
    }

    const { data } = await api.get(
      `/integrations/${integrationId}/eduzz-rules`
    );

    setRules(Array.isArray(data) ? data : []);
  }, [integrationId]);
  const loadCredentials = useCallback(async () => {
    if (!integrationId) {
      return;
    }

    const { data } = await api.get(
      `/integrations/${integrationId}/credentials`
    );

    setCredentials(
      Array.isArray(data) ? data : []
    );
  }, [integrationId]);

  const loadUsers = useCallback(async () => {
    let pageNumber = 1;
    let hasMore = true;
    const allUsers = [];

    while (hasMore) {
      const { data } = await api.get("/users", {
        params: {
          searchParam: "",
          pageNumber
        }
      });

      const pageUsers = Array.isArray(data?.users)
        ? data.users
        : [];

      allUsers.push(...pageUsers);

      hasMore = Boolean(data?.hasMore);
      pageNumber += 1;
    }

    setUsers(allUsers);
  }, []);

  useEffect(() => {
    if (!open || !integrationId) {
      return;
    }

    let mounted = true;

    (async () => {
      setLoading(true);

      try {
        await Promise.all([
          loadRules(),
          loadUsers(),
          loadCredentials()
        ]);
      } catch (err) {
        if (mounted) {
          toastError(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    open,
    integrationId,
    loadRules,
    loadUsers,
    loadCredentials
  ]);

  useEffect(() => {
    if (!rule.whatsappId) {
      setTemplates([]);
      return;
    }

    if (!isOfficial) {
      setTemplates([]);

      setRule(previous => ({
        ...previous,
        messageMode: "text",
        metaTemplateName: "",
        metaTemplateLanguage: "",
        metaTemplateComponents: null
      }));

      return;
    }

    setRule(previous => ({
      ...previous,
      messageMode: "template",
      messageBody: previous.messageBody || ""
    }));

    let mounted = true;

    (async () => {
      setLoadingTemplates(true);

      try {
        const { data } = await api.get(
          `/meta-message-templates/${rule.whatsappId}`
        );

        if (mounted) {
          setTemplates(
            Array.isArray(data?.data)
              ? data.data
              : []
          );
        }
      } catch (err) {
        if (mounted) {
          setTemplates([]);
          toastError(err);
        }
      } finally {
        if (mounted) {
          setLoadingTemplates(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    rule.whatsappId,
    isOfficial
  ]);

  const resetRule = () => {
    setRule(emptyRule);
    setEditing(false);
    setTemplates([]);
  };

  const handleNewRule = () => {
    resetRule();
    setEditing(true);
  };

  const handleEditRule = item => {
    setRule({
      id: item.id,
      eventName:
        item.eventName ||
        "myeduzz.invoice_paid",
      productId: item.productId || "",
      whatsappId: item.whatsappId || "",
      userId: item.userId || "",
      messageMode:
        item.messageMode || "text",
      messageBody:
        item.messageBody || "",
      metaTemplateName:
        item.metaTemplateName || "",
      metaTemplateLanguage:
        item.metaTemplateLanguage || "",
      metaTemplateComponents:
        item.metaTemplateComponents || null,
      isActive:
        item.isActive !== false
    });

    setEditing(true);
  };

  const handleDeleteRule = async item => {
    if (
      !window.confirm(
        "Excluir esta regra Eduzz?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/integrations/${integrationId}/eduzz-rules/${item.id}`
      );

      toast.success("Regra Eduzz exclu\u00edda.");
      await loadRules();

      if (Number(rule.id) === Number(item.id)) {
        resetRule();
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleTemplateChange = event => {
    const templateName = event.target.value;

    const template = approvedTemplates.find(
      item => item.name === templateName
    );

    setTemplateParameterMapping({});

    setRule(previous => ({
      ...previous,
      metaTemplateName: templateName,
      metaTemplateLanguage:
        template?.language || "",
      metaTemplateComponents: null
    }));
  };

  const validate = () => {
    if (!rule.eventName.trim()) {
      toast.error("Informe o evento Eduzz.");
      return false;
    }

    if (!rule.whatsappId) {
      toast.error("Selecione a conex\u00e3o.");
      return false;
    }

    if (!rule.userId) {
      toast.error(
        "Selecione o respons\u00e1vel."
      );
      return false;
    }

    if (
      !isOfficial &&
      !rule.messageBody.trim()
    ) {
      toast.error(
        "Informe a mensagem de WhatsApp."
      );
      return false;
    }

    if (
      isOfficial &&
      !rule.metaTemplateName
    ) {
      toast.error(
        "Selecione um template aprovado."
      );
      return false;
    }

    if (
      isOfficial &&
      !rule.metaTemplateLanguage
    ) {
      toast.error(
        "O template selecionado n\u00e3o possui idioma."
      );
      return false;
    }

    if (
      isOfficial &&
      hasUnsupportedDynamicComponent
    ) {
      toast.error(
        "Este template possui par\u00e2metro din\u00e2mico fora de HEADER/BODY de texto e ainda n\u00e3o pode ser usado nesta automa\u00e7\u00e3o."
      );
      return false;
    }

    if (
      isOfficial &&
      templateSlots.some(
        slot =>
          !slot.unsupported &&
          !templateParameterMapping[
            `${slot.componentType}:${slot.position}`
          ]
      )
    ) {
      toast.error(
        "Mapeie todos os par\u00e2metros do template Meta."
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    const payload = {
      eventName: rule.eventName.trim(),
      productId:
        rule.productId.trim() || null,
      whatsappId:
        Number(rule.whatsappId),
      userId:
        Number(rule.userId),
      messageMode:
        isOfficial ? "template" : "text",
      messageBody:
        rule.messageBody || "",
      metaTemplateName:
        isOfficial
          ? rule.metaTemplateName
          : null,
      metaTemplateLanguage:
        isOfficial
          ? rule.metaTemplateLanguage
          : null,
      metaTemplateComponents:
        isOfficial
          ? buildMetaTemplateComponents(
              selectedTemplate,
              templateParameterMapping
            )
          : null,
      isActive:
        rule.isActive !== false
    };

    setSaving(true);

    try {
      if (rule.id) {
        await api.put(
          `/integrations/${integrationId}/eduzz-rules/${rule.id}`,
          payload
        );
      } else {
        await api.post(
          `/integrations/${integrationId}/eduzz-rules`,
          payload
        );
      }

      toast.success(
        rule.id
          ? "Regra Eduzz atualizada."
          : "Regra Eduzz criada."
      );

      await loadRules();
      resetRule();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async value => {
    try {
      await navigator.clipboard.writeText(
        value
      );

      toast.success(
        "Copiado para a \u00e1rea de transfer\u00eancia."
      );
    } catch (err) {
      toast.error("N\u00e3o foi poss\u00edvel copiar.");
    }
  };

  const resetCredentialForm = () => {
    setCredentialForm({
      id: null,
      name: "",
      secret: "",
      isDefault: credentials.length === 0,
      isActive: true
    });

    setCredentialEditing(false);
  };

  const handleNewCredential = () => {
    setCredentialForm({
      id: null,
      name: "",
      secret: "",
      isDefault: credentials.length === 0,
      isActive: true
    });

    setCredentialEditing(true);
  };

  const handleEditCredential = item => {
    setCredentialForm({
      id: item.id,
      name: item.name || "",
      secret: "",
      isDefault: item.isDefault === true,
      isActive: item.isActive !== false
    });

    setCredentialEditing(true);
  };

  const handleSaveCredential = async () => {
    const name = credentialForm.name.trim();
    const secret = credentialForm.secret.trim();

    if (!name) {
      toast.error("Informe o nome da credencial.");
      return;
    }

    if (!credentialForm.id && !secret) {
      toast.error("Informe a Secret gerada pela Eduzz.");
      return;
    }

    const payload = {
      name,
      type: "HMAC_SECRET",
      isDefault: credentialForm.isDefault === true,
      isActive: credentialForm.isActive !== false
    };

    if (secret) {
      payload.secret = secret;
    }

    setCredentialSaving(true);

    try {
      if (credentialForm.id) {
        await api.put(
          `/integrations/${integrationId}/credentials/${credentialForm.id}`,
          payload
        );
      } else {
        await api.post(
          `/integrations/${integrationId}/credentials`,
          payload
        );
      }

      toast.success(
        credentialForm.id
          ? "Credencial atualizada."
          : "Credencial adicionada."
      );

      await loadCredentials();

      setCredentialForm({
        id: null,
        name: "",
        secret: "",
        isDefault: false,
        isActive: true
      });

      setCredentialEditing(false);
    } catch (err) {
      toastError(err);
    } finally {
      setCredentialSaving(false);
    }
  };

  const handleDeleteCredential = async item => {
    if (
      !window.confirm(
        `Excluir a credencial "${item.name}"?`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/integrations/${integrationId}/credentials/${item.id}`
      );

      toast.success("Credencial excluída.");
      await loadCredentials();

      if (
        Number(credentialForm.id) ===
        Number(item.id)
      ) {
        setCredentialEditing(false);
      }
    } catch (err) {
      toastError(err);
    }
  };

  const renderCredentialSummary = item => (
    <Paper
      key={item.id}
      variant="outlined"
      style={{
        padding: 12,
        marginTop: 10
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap"
        }}
      >
        <div>
          <Typography variant="subtitle2">
            {item.name}
          </Typography>

          <Typography
            variant="body2"
            color="textSecondary"
          >
            HMAC SHA-256
            {" • "}
            {item.maskedSecret || "********"}
          </Typography>
        </div>

        <div>
          {item.isDefault && (
            <Chip
              size="small"
              color="primary"
              label="Padrão"
              style={{ marginRight: 6 }}
            />
          )}

          <Chip
            size="small"
            label={
              item.isActive === false
                ? "Inativa"
                : "Ativa"
            }
            style={{ marginRight: 6 }}
          />

          <IconButton
            size="small"
            onClick={() =>
              handleEditCredential(item)
            }
          >
            <Edit fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            onClick={() =>
              handleDeleteCredential(item)
            }
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        </div>
      </div>
    </Paper>
  );
  const renderRuleSummary = item => {
    const whatsapp = whatsApps.find(
      connection =>
        Number(connection.id) ===
        Number(item.whatsappId)
    );

    const user = users.find(
      candidate =>
        Number(candidate.id) ===
        Number(item.userId)
    );

    return (
      <Paper
        key={item.id}
        variant="outlined"
        style={{
          padding: 12,
          marginBottom: 10
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap"
          }}
        >
          <div>
            <Typography variant="subtitle2">
              {item.eventName}
            </Typography>

            <Typography
              variant="body2"
              color="textSecondary"
            >
              Produto:{" "}
              {item.productId || "Todos"}
              {" \u2022 "}
              {" \u2014 "}
              {whatsapp?.name ||
                `#${item.whatsappId}`}
              {" \u2022 "}
              {" \u2014 "}
              {user?.name ||
                `#${item.userId}`}
            </Typography>
          </div>

          <div>
            <Chip
              size="small"
              label={
                item.messageMode === "template"
                  ? "Template Meta"
                  : "Texto"
              }
              style={{ marginRight: 6 }}
            />

            <Chip
              size="small"
              label={
                item.isActive === false
                  ? "Inativa"
                  : "Ativa"
              }
              style={{ marginRight: 6 }}
            />

            <IconButton
              size="small"
              onClick={() =>
                handleEditRule(item)
              }
            >
              <Edit fontSize="small" />
            </IconButton>

            <IconButton
              size="small"
              onClick={() =>
                handleDeleteRule(item)
              }
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </div>
        </div>
      </Paper>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {"Configura\u00e7\u00e3o Eduzz"}
        {integration?.name
          ? ` \u2014 ${integration.name}`
          : ""}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: 30
            }}
          >
            <CircularProgress />
          </div>
        ) : (
          <>
            <Typography
              variant="subtitle1"
              gutterBottom
            >
              Webhook
            </Typography>

            <TextField
              label="URL do webhook"
              value={webhookUrl}
              fullWidth
              margin="dense"
              variant="outlined"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Tooltip title="Copiar">
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleCopy(webhookUrl)
                      }
                    >
                      <FileCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginTop: 14,
                flexWrap: "wrap"
              }}
            >
              <div>
                <Typography variant="subtitle1">
                  Credencial HMAC
                </Typography>

                <Typography
                  variant="caption"
                  color="textSecondary"
                >
                  Cadastre aqui a Secret criada na Eduzz.
                  O valor completo não é exibido novamente
                  depois de salvo.
                </Typography>
              </div>

              {!credentialEditing && (
                <Button
                  color="primary"
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleNewCredential}
                >
                  Adicionar chave existente
                </Button>
              )}
            </div>

            {credentials.length === 0 ? (
              <Typography
                variant="body2"
                color="textSecondary"
                style={{ marginTop: 12 }}
              >
                Nenhuma credencial HMAC configurada.
              </Typography>
            ) : (
              credentials.map(renderCredentialSummary)
            )}

            {credentialEditing && (
              <Paper
                variant="outlined"
                style={{
                  padding: 14,
                  marginTop: 12
                }}
              >
                <Typography
                  variant="subtitle2"
                  gutterBottom
                >
                  {credentialForm.id
                    ? "Editar credencial"
                    : "Adicionar credencial"}
                </Typography>

                <TextField
                  label="Nome da credencial"
                  value={credentialForm.name}
                  onChange={event => {
                    const value = event.target.value;

                    setCredentialForm(previous => ({
                      ...previous,
                      name: value
                    }));
                  }}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  placeholder="EVENTO JULIA LOPES"
                />

                <TextField
                  label={
                    credentialForm.id
                      ? "Nova Secret (opcional)"
                      : "Secret da Eduzz"
                  }
                  value={credentialForm.secret}
                  onChange={event => {
                    const value = event.target.value;

                    setCredentialForm(previous => ({
                      ...previous,
                      secret: value
                    }));
                  }}
                  type="password"
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  autoComplete="new-password"
                  helperText={
                    credentialForm.id
                      ? "Deixe vazio para manter a Secret atual."
                      : "Cole a Secret criada em Webhooks > Chaves de acesso na Eduzz."
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={
                        credentialForm.isDefault === true
                      }
                      onChange={event => {
                        const checked = event.target.checked;

                        setCredentialForm(previous => ({
                          ...previous,
                          isDefault: checked
                        }));
                      }}
                      color="primary"
                    />
                  }
                  label="Usar como credencial padrão"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={
                        credentialForm.isActive !== false
                      }
                      onChange={event => {
                        const checked = event.target.checked;

                        setCredentialForm(previous => ({
                          ...previous,
                          isActive: checked
                        }));
                      }}
                      color="primary"
                    />
                  }
                  label="Credencial ativa"
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginTop: 8
                  }}
                >
                  <Button
                    onClick={() =>
                      setCredentialEditing(false)
                    }
                    disabled={credentialSaving}
                  >
                    Cancelar
                  </Button>

                  <Button
                    color="primary"
                    variant="contained"
                    onClick={handleSaveCredential}
                    disabled={credentialSaving}
                  >
                    {credentialSaving
                      ? "Salvando..."
                      : "Salvar credencial"}
                  </Button>
                </div>
              </Paper>
            )}

            <Typography
              variant="caption"
              color="textSecondary"
              style={{
                display: "block",
                marginTop: 10
              }}
            >
              No painel da Eduzz, selecione a mesma
              Secret na configuração deste webhook.
              O SamaChat valida a assinatura HMAC
              SHA-256 usando a credencial padrão ativa.
            </Typography>
<Divider
              style={{
                margin: "18px 0"
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12
              }}
            >
              <Typography variant="subtitle1">
                Regras de envio
              </Typography>

              <Button
                color="primary"
                variant="contained"
                startIcon={<Add />}
                onClick={handleNewRule}
              >
                Nova regra
              </Button>
            </div>

            {rules.length === 0 ? (
              <Typography
                variant="body2"
                color="textSecondary"
              >
                Nenhuma regra configurada.
              </Typography>
            ) : (
              rules.map(renderRuleSummary)
            )}

            {editing && (
              <>
                <Divider
                  style={{
                    margin: "18px 0"
                  }}
                />

                <Typography
                  variant="subtitle1"
                  gutterBottom
                >
                  {rule.id
                    ? "Editar regra"
                    : "Nova regra"}
                </Typography>

                <TextField
                  label="Evento Eduzz"
                  value={rule.eventName}
                  onChange={event => {
                    const value = event.target.value;

                    setRule(previous => ({
                      ...previous,
                      eventName: value
                    }));
                  }}
                  fullWidth
                  variant="outlined"
                  margin="dense"
                  helperText="Ex.: myeduzz.invoice_paid ou blinket.attendance_added"
                />

                <TextField
                  label="ID do produto"
                  value={rule.productId}
                  onChange={event => {
                    const value = event.target.value;

                    setRule(previous => ({
                      ...previous,
                      productId: value
                    }));
                  }}
                  fullWidth
                  variant="outlined"
                  margin="dense"
                  helperText="Deixe vazio para aceitar todos os produtos deste evento."
                />

                <FormControl
                  fullWidth
                  margin="dense"
                  variant="outlined"
                >
                  <InputLabel>
                    {"Conex\u00e3o WhatsApp"}
                  </InputLabel>

                  <Select
                    value={rule.whatsappId}
                    label={"Conex\u00e3o WhatsApp"}
                    onChange={event => {
                      const value = event.target.value;

                      setRule(previous => ({
                        ...previous,
                        whatsappId: value,
                        metaTemplateName: "",
                        metaTemplateLanguage: "",
                        metaTemplateComponents:
                          null
                      }));
                    }}
                  >
                    {whatsApps.map(item => (
                      <MenuItem
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                        {" \u2014 "}
                        {item.providerType ===
                        "official"
                          ? "Meta Oficial"
                          : "Web"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl
                  fullWidth
                  margin="dense"
                  variant="outlined"
                >
                  <InputLabel>
                    {"Respons\u00e1vel"}
                  </InputLabel>

                  <Select
                    value={rule.userId}
                    label={"Respons\u00e1vel"}
                    onChange={event => {
                      const value = event.target.value;

                      setRule(previous => ({
                        ...previous,
                        userId: value
                      }));
                    }}
                  >
                    {users.map(item => (
                      <MenuItem
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {!isOfficial ? (
                  <>
                  <TextField
                    label={"Mensagem autom\u00e1tica"}
                    value={rule.messageBody}
                    onChange={event => {
                      const value = event.target.value;

                      setRule(previous => ({
                        ...previous,
                        messageBody: value
                      }));
                    }}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    multiline
                    minRows={5}
                    helperText={"Clique em uma vari\u00e1vel abaixo para inseri-la na mensagem."}
                  />

                  <MessageVariablesHelper
                    variables={messageVariables}
                    onInsertVariable={token =>
                      setRule(previous => ({
                        ...previous,
                        messageBody: appendMessageVariable(
                          previous.messageBody,
                          token
                        )
                      }))
                    }
                  />
                  </>
                ) : (
                  <>
                    <FormControl
                      fullWidth
                      margin="dense"
                      variant="outlined"
                    >
                      <InputLabel>
                        Template Meta aprovado
                      </InputLabel>

                      <Select
                        value={
                          rule.metaTemplateName
                        }
                        label="Template Meta aprovado"
                        onChange={
                          handleTemplateChange
                        }
                        disabled={
                          loadingTemplates
                        }
                      >
                        {approvedTemplates.map(
                          template => (
                            <MenuItem
                              key={`${template.name}-${template.language}`}
                              value={
                                template.name
                              }
                            >
                              {template.name}
                              {" \u2014 "}
                              {template.language}
                            </MenuItem>
                          )
                        )}
                      </Select>
                    </FormControl>

                    {loadingTemplates && (
                      <Typography
                        variant="caption"
                        color="textSecondary"
                      >
                        Carregando templates aprovados...
                      </Typography>
                    )}

                    <TextField
                      label="Idioma do template"
                      value={
                        rule.metaTemplateLanguage
                      }
                      fullWidth
                      variant="outlined"
                      margin="dense"
                      InputProps={{
                        readOnly: true
                      }}
                    />

                    {hasUnsupportedDynamicComponent && (
                      <Typography
                        variant="body2"
                        color="error"
                        style={{ marginTop: 8 }}
                      >
                        Este template possui par\u00e2metro din\u00e2mico fora dos componentes HEADER/BODY de texto. O envio autom\u00e1tico fica bloqueado para evitar payload Meta incorreto.
                      </Typography>
                    )}

                    {!hasUnsupportedDynamicComponent &&
                      templateSlots.filter(
                        slot => !slot.unsupported
                      ).map(slot => {
                        const mapKey =
                          `${slot.componentType}:${slot.position}`;

                        return (
                          <FormControl
                            key={mapKey}
                            fullWidth
                            margin="dense"
                            variant="outlined"
                          >
                            <InputLabel>
                              {`${slot.componentType.toUpperCase()} {{${slot.position}}}`}
                            </InputLabel>

                            <Select
                              value={
                                templateParameterMapping[mapKey] || ""
                              }
                              label={`${slot.componentType.toUpperCase()} {{${slot.position}}}`}
                              onChange={event => {
                                const value = event.target.value;

                                setTemplateParameterMapping(
                                  previous => ({
                                    ...previous,
                                    [mapKey]: value
                                  })
                                );
                              }}
                            >
                              {messageVariables.map(variable => (
                                <MenuItem
                                  key={variable.key}
                                  value={variable.key}
                                >
                                  {`${variable.sequence}. ${variable.label} \u2014 {{${variable.key}}}`}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        );
                      })}

                    {!hasUnsupportedDynamicComponent &&
                      selectedTemplate &&
                      templateSlots.filter(
                        slot => !slot.unsupported
                      ).length === 0 && (
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          display="block"
                          style={{ marginTop: 8 }}
                        >
                          {"Este template n\u00e3o possui par\u00e2metros posicionais de texto."}
                        </Typography>
                      )}
                  </>
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={
                        rule.isActive !== false
                      }
                      onChange={event => {
                        const checked = event.target.checked;

                        setRule(previous => ({
                          ...previous,
                          isActive: checked
                        }));
                      }}
                      color="primary"
                    />
                  }
                  label="Regra ativa"
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginTop: 12
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={resetRule}
                  >
                    Cancelar
                  </Button>

                  <Button
                    variant="contained"
                    color="primary"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving
                      ? "Salvando..."
                      : "Salvar regra"}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          color="primary"
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EduzzRuleConfigModal;
