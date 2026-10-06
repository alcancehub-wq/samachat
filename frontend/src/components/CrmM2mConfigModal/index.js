import React, {
  useEffect,
  useState
} from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";

import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const defaultConfiguration = {
  m2mEnabled: false,
  syncEnabled: false,
  commercialAdmissionEnabled: false,
  commercialPipelineName: "SDR",
  commercialStageName: "NOVO LEAD",
  commercialOwnerEmail: ""
};

const CrmM2mConfigModal = ({
  open,
  onClose,
  integration
}) => {
  const [
    configuration,
    setConfiguration
  ] = useState(defaultConfiguration);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    if (!open || !integration?.id) {
      return undefined;
    }

    let active = true;

    setLoading(true);

    api.get(
      "/integrations/" +
        integration.id +
        "/crm-m2m-config"
    )
      .then(({ data }) => {
        if (!active) return;

        setConfiguration({
          m2mEnabled:
            Boolean(data.m2mEnabled),

          syncEnabled:
            Boolean(data.syncEnabled),

          commercialAdmissionEnabled:
            Boolean(
              data.commercialAdmissionEnabled
            ),

          commercialPipelineName:
            data.commercialPipelineName ||
            "SDR",

          commercialStageName:
            data.commercialStageName ||
            "NOVO LEAD",

          commercialOwnerEmail:
            data.commercialOwnerEmail || ""
        });
      })
      .catch(err => {
        if (active) toastError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, integration]);

  const updateField = (
    field,
    value
  ) => {
    setConfiguration(current => ({
      ...current,
      [field]: value
    }));
  };

  const toggleIntegration = enabled => {
    setConfiguration(current => ({
      ...current,

      m2mEnabled: enabled,

      syncEnabled:
        enabled
          ? current.syncEnabled
          : false,

      commercialAdmissionEnabled:
        enabled
          ? current.commercialAdmissionEnabled
          : false
    }));
  };

  const toggleSync = enabled => {
    setConfiguration(current => ({
      ...current,

      syncEnabled: enabled,

      commercialAdmissionEnabled:
        enabled
          ? current.commercialAdmissionEnabled
          : false
    }));
  };

  const handleSave = async () => {
    if (
      configuration
        .commercialAdmissionEnabled &&
      (
        !configuration
          .commercialPipelineName.trim() ||
        !configuration
          .commercialStageName.trim()
      )
    ) {
      toast.error(
        "Informe o funil e a etapa inicial."
      );
      return;
    }

    try {
      setSaving(true);

      await api.put(
        "/integrations/" +
          integration.id +
          "/crm-m2m-config",
        {
          m2mEnabled:
            configuration.m2mEnabled,

          syncEnabled:
            configuration.syncEnabled,

          commercialAdmissionEnabled:
            configuration
              .commercialAdmissionEnabled,

          commercialPipelineName:
            configuration
              .commercialPipelineName
              .trim(),

          commercialStageName:
            configuration
              .commercialStageName
              .trim(),

          commercialOwnerEmail:
            configuration
              .commercialOwnerEmail
              .trim() || null
        }
      );

      toast.success(
        "Configuração do CRM salva."
      );

      onClose();

      window.location.reload();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        CRM Samacon
      </DialogTitle>

      <DialogContent>
        <Typography
          variant="body2"
          color="textSecondary"
          style={{ marginBottom: 16 }}
        >
          Gerencie a integração sem acessar
          chaves, APIs ou configurações
          técnicas do servidor.
        </Typography>

        <FormControlLabel
          control={
            <Switch
              color="primary"
              checked={
                configuration.m2mEnabled
              }
              disabled={loading}
              onChange={event =>
                toggleIntegration(
                  event.target.checked
                )
              }
            />
          }
          label="Integração CRM ativa"
        />

        <FormControlLabel
          control={
            <Switch
              color="primary"
              checked={
                configuration.syncEnabled
              }
              disabled={
                loading ||
                !configuration.m2mEnabled
              }
              onChange={event =>
                toggleSync(
                  event.target.checked
                )
              }
            />
          }
          label="Sincronizar contatos automaticamente"
        />

        <FormControlLabel
          control={
            <Switch
              color="primary"
              checked={
                configuration
                  .commercialAdmissionEnabled
              }
              disabled={
                loading ||
                !configuration.m2mEnabled ||
                !configuration.syncEnabled
              }
              onChange={event =>
                updateField(
                  "commercialAdmissionEnabled",
                  event.target.checked
                )
              }
            />
          }
          label="Criar oportunidade SDR automaticamente"
        />

        {configuration
          .commercialAdmissionEnabled && (
          <>
            <TextField
              fullWidth
              margin="normal"
              label="Funil de entrada"
              value={
                configuration
                  .commercialPipelineName
              }
              onChange={event =>
                updateField(
                  "commercialPipelineName",
                  event.target.value
                )
              }
              helperText="Exemplo: SDR"
            />

            <TextField
              fullWidth
              margin="normal"
              label="Etapa inicial"
              value={
                configuration
                  .commercialStageName
              }
              onChange={event =>
                updateField(
                  "commercialStageName",
                  event.target.value
                )
              }
              helperText="Exemplo: NOVO LEAD"
            />

            <TextField
              fullWidth
              margin="normal"
              type="email"
              label="Responsável SDR"
              value={
                configuration
                  .commercialOwnerEmail
              }
              onChange={event =>
                updateField(
                  "commercialOwnerEmail",
                  event.target.value
                )
              }
              helperText="Opcional. Ex.: agentesdr@samacon.com.br"
            />
          </>
        )}

        <Typography
          variant="caption"
          color="textSecondary"
          component="div"
          style={{ marginTop: 18 }}
        >
          Chave HMAC, endpoint e credenciais
          continuam protegidos no backend.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={
            loading ||
            saving ||
            !integration?.id
          }
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrmM2mConfigModal;