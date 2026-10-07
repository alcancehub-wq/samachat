import React, { useEffect, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";

import api from "../../services/api";

const COLORS = {
  connected: "#10B981",
  configured: "#F59E0B",
  rejected: "#EF4444",
  unreachable: "#EF4444"
};

const useStyles = makeStyles(theme => ({
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: "0.75rem",
    fontWeight: 600,
    borderRadius: 10,
    padding: "1px 10px",
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: theme.palette.text.disabled
  }
}));

// Status em tempo real de uma integracao: confere com o servico de verdade ao
// abrir, depois de salvar (refreshKey muda) e a cada minuto com a aba visivel.
export const useLiveStatus = (url, refreshKey = 0, intervalMs = 60000) => {
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!url) {
      setChecking(false);
      return undefined;
    }
    let alive = true;

    const check = async () => {
      setChecking(true);
      try {
        const { data } = await api.get(url);
        if (alive) setStatus(data);
      } catch (err) {
        if (alive) setStatus({ state: "unreachable", label: "Sem resposta" });
      }
      if (alive) setChecking(false);
    };

    check();
    const timer = setInterval(() => {
      if (!document.hidden) check();
    }, intervalMs);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [url, refreshKey, intervalMs]);

  return { status, checking };
};

export const StatusChip = ({ status, checking }) => {
  const classes = useStyles();
  const color = status ? COLORS[status.state] : undefined;
  const label = !status ? "Verificando..." : status.label;

  return (
    <span
      className={classes.chip}
      style={color ? { color, borderColor: color } : undefined}
      title={checking && status ? "Atualizando..." : undefined}
    >
      <span
        className={classes.dot}
        style={color ? { backgroundColor: color } : undefined}
      />
      {label}
    </span>
  );
};
