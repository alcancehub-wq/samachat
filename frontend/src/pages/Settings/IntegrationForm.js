import React, { useCallback, useEffect, useState } from "react";

import {
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Slider,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { StatusChip, useLiveStatus } from "./LiveStatus";

const useStyles = makeStyles(theme => ({
  head: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    flexWrap: "wrap",
    marginBottom: theme.spacing(1)
  },
  status: {
    fontSize: "0.75rem",
    fontWeight: 600,
    borderRadius: 10,
    padding: "1px 9px",
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary
  },
  statusOk: {
    color: "#10B981",
    borderColor: "#10B981"
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1)
  },
  full: {
    gridColumn: "1 / -1"
  },
  sliderLabel: {
    fontSize: "0.8125rem",
    color: theme.palette.text.secondary
  },
  actions: {
    display: "flex",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    flexWrap: "wrap",
    alignItems: "center"
  },
  primary: {
    textTransform: "none",
    fontWeight: 600,
    backgroundColor: "#FF1919",
    color: "#FFFFFF",
    boxShadow: "none",
    "&:hover": { backgroundColor: "#E11414", boxShadow: "none" },
    "&.Mui-disabled": { opacity: 0.5, color: "#FFFFFF" }
  },
  outlined: {
    textTransform: "none",
    fontWeight: 600
  },
  result: {
    marginTop: theme.spacing(1.5),
    padding: theme.spacing(1.25, 1.5),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    fontSize: "0.875rem"
  },
  resultOk: { borderColor: "#10B981" },
  resultFail: { borderColor: "#EF4444" }
}));

/*
 * Formulario generico de uma integracao (Gemini, Claude, ElevenLabs).
 * fields: [{ key, label, type: text|secret|slider|switch|select, helper, options, full }]
 * - secret: nunca mostra a chave; mostra "chave salva ••••abcd". Deixar vazio
 *   mantem a chave que ja esta salva. A chave e guardada cifrada no servidor.
 */
const IntegrationForm = ({
  provider,
  title,
  description,
  fields,
  activeLabel = "Ativar esta integração",
  activeHelper,
  onSaved
}) => {
  const classes = useStyles();
  const [data, setData] = useState(null);
  const [values, setValues] = useState({});
  const [secretInputs, setSecretInputs] = useState({});
  const [clear, setClear] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusTick, setStatusTick] = useState(0);
  const live = useLiveStatus(`/integration-settings/${provider}/status`, statusTick);
  const apply = useCallback(payload => {
    setData(payload);
    setValues(payload.values || {});
    setIsActive(Boolean(payload.isActive));
    setSecretInputs({});
    setClear([]);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: payload } = await api.get(`/integration-settings/${provider}`);
        if (alive) apply(payload);
      } catch (err) {
        toastError(err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [provider, apply]);

  if (!data) {
    return <CircularProgress size={22} />;
  }

  const secretKeys = fields.filter(f => f.type === "secret").map(f => f.key);

  // Tem tudo o que e obrigatorio (ja salvo ou digitado agora)?
  const requiredOk = fields
    .filter(f => f.required)
    .every(f =>
      f.type === "secret"
        ? Boolean(secretInputs[f.key]) ||
          (Boolean(data.secrets?.[f.key]?.set) && !clear.includes(f.key))
        : String(values[f.key] ?? "").trim() !== ""
    );

  // Por que o interruptor esta bloqueado (null = liberado). Quem ja esta ativo
  // sempre pode ser desativado.
  const blockReason = !isActive && !requiredOk ? "Cadastre as credenciais abaixo para poder ativar." : null;

  const setValue = (key, value) => setValues(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      // So os campos que este formulario mostra: dados de outras telas (como a
      // instancia padrao da Evolution) nao podem ser sobrescritos por um valor antigo.
      const payloadValues = {};
      fields
        .filter(f => f.type !== "secret")
        .forEach(f => {
          payloadValues[f.key] = values[f.key];
        });
      secretKeys.forEach(k => {
        if (secretInputs[k]) payloadValues[k] = secretInputs[k];
      });
      const { data: payload } = await api.put(`/integration-settings/${provider}`, {
        isActive,
        values: payloadValues,
        clearSecrets: clear
      });
      apply(payload);
      toast.success("Configuração salva.");
      setStatusTick(t => t + 1);
      if (onSaved) onSaved(provider);
    } catch (err) {
      toastError(err);
    }
    setSaving(false);
  };

  const dirty =
    isActive !== Boolean(data.isActive) ||
    clear.length > 0 ||
    Object.values(secretInputs).some(Boolean) ||
    fields
      .filter(f => f.type !== "secret")
      .some(f => String(values[f.key] ?? "") !== String(data.values[f.key] ?? ""));

  const renderField = field => {
    const className = field.full ? classes.full : undefined;

    if (field.type === "secret") {
      const info = data.secrets?.[field.key] || {};
      return (
        <div key={field.key} className={className}>
          <TextField
            fullWidth
            variant="outlined"
            margin="dense"
            type="password"
            label={field.label}
            value={secretInputs[field.key] || ""}
            onChange={e => {
              const typed = e.target.value; // le agora: o evento nao vale dentro do updater
              setSecretInputs(prev => ({ ...prev, [field.key]: typed }));
              setClear(prev => prev.filter(k => k !== field.key));
            }}
            placeholder={info.set ? "••••••••••••••••" : ""}
            helperText={
              info.set
                ? "Cadastrada. Por segurança, ela não é exibida. Digite outra para substituir."
                : field.helper
            }
            inputProps={{ autoComplete: "new-password" }}
          />
        </div>
      );
    }

    if (field.type === "slider") {
      return (
        <div key={field.key} className={className}>
          <Typography className={classes.sliderLabel}>
            {field.label}: {Number(values[field.key] ?? 0).toFixed(2)}
          </Typography>
          <Slider
            value={Number(values[field.key] ?? 0)}
            min={0}
            max={1}
            step={0.05}
            onChange={(e, v) => setValue(field.key, v)}
            color="primary"
          />
          {field.helper && (
            <Typography variant="caption" color="textSecondary">
              {field.helper}
            </Typography>
          )}
        </div>
      );
    }

    if (field.type === "switch") {
      return (
        <div key={field.key} className={className || classes.full}>
          <FormControlLabel
            control={
              <Switch
                color="primary"
                checked={Boolean(values[field.key])}
                onChange={e => setValue(field.key, e.target.checked)}
              />
            }
            label={field.label}
          />
          {field.helper && (
            <Typography variant="caption" color="textSecondary" display="block">
              {field.helper}
            </Typography>
          )}
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <TextField
          key={field.key}
          select
          fullWidth
          variant="outlined"
          margin="dense"
          label={field.label}
          className={className}
          value={values[field.key] ?? ""}
          onChange={e => setValue(field.key, e.target.value)}
          helperText={field.helper}
        >
          {field.options.map(o => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        key={field.key}
        fullWidth
        variant="outlined"
        margin="dense"
        label={field.label}
        className={className}
        value={values[field.key] ?? ""}
        onChange={e => setValue(field.key, e.target.value)}
        placeholder={field.placeholder}
        helperText={field.helper}
        inputProps={{ autoComplete: "off" }}
      />
    );
  };

  return (
    <div>
      <div className={classes.head}>
        <Typography style={{ fontWeight: 700 }}>{title}</Typography>
        <StatusChip status={live.status} checking={live.checking} />
      </div>
      {description && (
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
      )}

      <FormControlLabel
        style={{ marginTop: 8 }}
        control={
          <Switch
            color="primary"
            checked={isActive}
            disabled={blockReason !== null}
            onChange={e => setIsActive(e.target.checked)}
          />
        }
        label={activeLabel}
      />
      <Typography variant="caption" color="textSecondary" display="block">
        {blockReason || activeHelper}
      </Typography>

      <div className={classes.fields}>{fields.map(renderField)}</div>

      <div className={classes.actions}>
        <Button
          variant="contained"
          className={classes.primary}
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        {dirty && (
          <Typography variant="caption" color="textSecondary">
            Há alterações não salvas.
          </Typography>
        )}
      </div>

    </div>
  );
};

export default IntegrationForm;
