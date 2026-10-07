import React from "react";

import ButtonBase from "@material-ui/core/ButtonBase";
import { makeStyles } from "@material-ui/core/styles";

// Abas padrao do SamaChat (estilo da BIA): contêiner arredondado, ícone + texto,
// aba ativa em destaque. Usada em Configurações e Treinamento da IA.
//   tabs: [{ id, label, icon }]
const useStyles = makeStyles(theme => ({
  nav: {
    display: "inline-flex",
    alignSelf: "flex-start",
    gap: 4,
    padding: 4,
    marginBottom: theme.spacing(2),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.action.hover,
    maxWidth: "100%",
    overflowX: "auto"
  },
  item: {
    gap: theme.spacing(1),
    padding: theme.spacing(0.9, 2),
    borderRadius: 9,
    fontFamily: theme.typography.fontFamily,
    fontSize: "0.875rem",
    fontWeight: 600,
    color: theme.palette.text.secondary,
    whiteSpace: "nowrap",
    transition: "background-color 0.15s, color 0.15s",
    "&:hover": { color: theme.palette.text.primary }
  },
  active: {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.35)",
    "& svg": { color: "#FF1919" }
  }
}));

const PillTabs = ({ tabs, value, onChange }) => {
  const classes = useStyles();

  return (
    <nav className={classes.nav}>
      {tabs.map(tab => (
        <ButtonBase
          key={tab.id}
          className={`${classes.item} ${value === tab.id ? classes.active : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </ButtonBase>
      ))}
    </nav>
  );
};

export default PillTabs;
