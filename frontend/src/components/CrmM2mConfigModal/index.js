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
  MenuItem,
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

  const [
    commercialOptions,
    setCommercialOptions
  ] = useState({ pipelines: [] });

  const [loadingOptions, setLoadingOptions] =
    useState(false);

  useEffect(() => {
    if (!open || !integration?.id) {
      return undefined;
    }

    let active = true;

    setLoading(true);
    setLoadingOptions(true);

    Promise.all([
      api.get(
        "/integrations/" +
          integration.id +
          "/crm-m2m-config"
      ),
      api.get(
        "/integrations/" +
          integration.id +
          "/crm-m2m-options"
      )
    ])
      .then(([configResponse, optionsResponse]) => {
        if (!active) return;

        const data = configResponse.data;
        const options =
          optionsResponse.data || { pipelines: [] };

        setCommercialOptions(options);

        const configuredPipeline =
          data.commercialPipelineName ||
          "SDR";

        const selectedPipeline =
          (options.pipelines || []).find(
            item =>
              item.name === configuredPipeline
          );

        const pipelineName =
          selectedPipeline?.name ||
          options.pipelines?.[0]?.name ||
          configuredPipeline;

        const pipeline =
          (options.pipelines || []).find(
            item => item.name === pipelineName
          );

        const configuredStage =
          data.commercialStageName ||
          "NOVO LEAD";

        const stageName =
          pipeline?.stages?.some(
            item =>
              item.name === configuredStage
          )
            ? configuredStage
            : pipeline?.stages?.[0]?.name ||
              configuredStage;

        const configuredOwner =
          data.commercialOwnerEmail || "";

        const ownerEmail =
          pipeline?.owners?.some(
            item =>
              item.email === configuredOwner
          )
            ? configuredOwner
            : "";

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
            pipelineName,

          commercialStageName:
            stageName,

          commercialOwnerEmail:
            ownerEmail
        });
      })
      .catch(err => {
        if (active) toastError(err);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setLoadingOptions(false);
        }
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

  const selectedPipeline =
    commercialOptions.pipelines.find(
      item =>
        item.name ===
        configuration.commercialPipelineName
    );

  const changePipeline = name => {
    const pipeline =
      commercialOptions.pipelines.find(
        item => item.name === name
      );

    setConfiguration(current => ({
      ...current,
      commercialPipelineName: name,
      commercialStageName:
        pipeline?.stages?.[0]?.name || "",
      commercialOwnerEmail: ""
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
              select
              fullWidth
              margin="normal"
              label="Funil de entrada"
              value={
                configuration
                  .commercialPipelineName
              }
              disabled={loadingOptions}
              onChange={event =>
                changePipeline(
                  event.target.value
                )
              }
              helperText={
                loadingOptions
                  ? "Carregando funis do CRM..."
                  : "Selecione o funil de entrada."
              }
            >
              {commercialOptions.pipelines.map(
                pipeline => (
                  <MenuItem
                    key={pipeline.name}
                    value={pipeline.name}
                  >
                    {pipeline.name}
                  </MenuItem>
                )
              )}
            </TextField>

            <TextField
              select
              fullWidth
              margin="normal"
              label="Etapa inicial"
              value={
                configuration
                  .commercialStageName
              }
              disabled={
                loadingOptions ||
                !selectedPipeline
              }
              onChange={event =>
                updateField(
                  "commercialStageName",
                  event.target.value
                )
              }
              helperText="Selecione a etapa inicial do funil."
            >
              {(selectedPipeline?.stages || [])
                .map(stage => (
                  <MenuItem
                    key={stage.name}
                    value={stage.name}
                  >
                    {stage.name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              select
              fullWidth
              margin="normal"
              label="Responsável SDR"
              value={
                configuration
                  .commercialOwnerEmail
              }
              disabled={
                loadingOptions ||
                !selectedPipeline
              }
              onChange={event =>
                updateField(
                  "commercialOwnerEmail",
                  event.target.value
                )
              }
              helperText="Opcional. Mostra apenas responsáveis SDR elegíveis para o funil."
            >
              <MenuItem value="">
                Sem responsável definido
              </MenuItem>

              {(selectedPipeline?.owners || [])
                .map(owner => (
                  <MenuItem
                    key={owner.email}
                    value={owner.email}
                  >
                    {owner.name} — {owner.email}
                  </MenuItem>
                ))}
            </TextField>
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