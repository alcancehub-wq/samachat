import React from "react";

import {
  ButtonBase,
  Chip,
  Paper,
  Typography,
  makeStyles
} from "@material-ui/core";
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
    textAlign: "center",
    padding: theme.spacing(1.25, 1.5),
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
    "&:hover": {
      transform: "translateY(-1px)",
      borderColor: theme.palette.primary.main,
      boxShadow: "0 10px 24px rgba(37, 99, 235, 0.14)"
    }
  },
  description: {
    lineHeight: 1.35,
    fontSize: "0.95rem",
    color: theme.palette.text.secondary,
    fontWeight: 500
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
              <Typography variant="body2" className={classes.description}>
                {i18n.t(`messageVariablesHelper.items.${variable.descriptionKey}`)}
              </Typography>
            </ButtonBase>
          ))}
        </div>
      </Paper>
    </div>
  );
};

export default MessageVariablesHelper;
