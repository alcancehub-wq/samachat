import React from "react";

import {
  ButtonBase,
  Chip,
  Paper,
  Typography,
  makeStyles
} from "@material-ui/core";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";

import { i18n } from "../../translate/i18n";
import { AVAILABLE_MESSAGE_VARIABLES } from "../../utils/messageVariables";

const useStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(2)
  },
  panel: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 16,
    padding: theme.spacing(1.5),
    backgroundColor: "#F5F6F8",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)"
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1.5)
  },
  titleBlock: {
    minWidth: 0
  },
  title: {
    fontWeight: 700,
    color: theme.palette.text.primary
  },
  hint: {
    marginTop: theme.spacing(0.25),
    lineHeight: 1.4,
    color: theme.palette.text.secondary
  },
  counter: {
    borderRadius: 999,
    fontWeight: 700,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5)
  },
  card: {
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.common.white,
    textAlign: "left",
    padding: theme.spacing(1.25),
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
    "&:hover": {
      transform: "translateY(-1px)",
      borderColor: theme.palette.primary.main,
      boxShadow: "0 10px 24px rgba(37, 99, 235, 0.14)"
    }
  },
  cardContent: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(0.75)
  },
  token: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: theme.spacing(0.375, 0.875),
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: theme.palette.primary.main,
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: 0.2
  },
  description: {
    marginTop: theme.spacing(0.75),
    lineHeight: 1.35,
    fontSize: "0.95rem",
    color: theme.palette.text.secondary
  },
  icon: {
    fontSize: 18,
    color: theme.palette.primary.main,
    opacity: 0.8
  }
}));

const MessageVariablesHelper = ({ onInsertVariable }) => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Paper elevation={0} className={classes.panel}>
        <div className={classes.header}>
          <div className={classes.titleBlock}>
            <Typography variant="subtitle2" className={classes.title}>
              {i18n.t("messageVariablesHelper.title")}
            </Typography>
            <Typography variant="body2" className={classes.hint}>
              {i18n.t("messageVariablesHelper.hint")}
            </Typography>
          </div>
          <Chip
            size="small"
            label={AVAILABLE_MESSAGE_VARIABLES.length}
            className={classes.counter}
          />
        </div>

        <div className={classes.grid}>
          {AVAILABLE_MESSAGE_VARIABLES.map(variable => (
            <ButtonBase
              key={variable.key}
              className={classes.card}
              onClick={() => onInsertVariable && onInsertVariable(variable.token)}
            >
              <div>
                <div className={classes.cardContent}>
                  <span className={classes.token}>{variable.token}</span>
                  <AddCircleOutlineIcon className={classes.icon} />
                </div>
                <Typography variant="body2" className={classes.description}>
                  {i18n.t(`messageVariablesHelper.items.${variable.descriptionKey}`)}
                </Typography>
              </div>
            </ButtonBase>
          ))}
        </div>
      </Paper>
    </div>
  );
};

export default MessageVariablesHelper;
