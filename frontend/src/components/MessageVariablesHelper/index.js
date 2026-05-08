import React from "react";

import { Button, Typography, makeStyles } from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import { AVAILABLE_MESSAGE_VARIABLES } from "../../utils/messageVariables";

const useStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(1.5)
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  descriptions: {
    marginTop: theme.spacing(1)
  },
  description: {
    display: "block",
    marginTop: theme.spacing(0.5)
  }
}));

const MessageVariablesHelper = ({ onInsertVariable }) => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Typography variant="subtitle2">
        {i18n.t("messageVariablesHelper.title")}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {i18n.t("messageVariablesHelper.hint")}
      </Typography>
      <div className={classes.actions}>
        {AVAILABLE_MESSAGE_VARIABLES.map(variable => (
          <Button
            key={variable.key}
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => onInsertVariable && onInsertVariable(variable.token)}
          >
            {variable.token}
          </Button>
        ))}
      </div>
      <div className={classes.descriptions}>
        {AVAILABLE_MESSAGE_VARIABLES.map(variable => (
          <Typography
            key={`${variable.key}-description`}
            variant="caption"
            color="textSecondary"
            className={classes.description}
          >
            {`${variable.token} - ${i18n.t(
              `messageVariablesHelper.items.${variable.descriptionKey}`
            )}`}
          </Typography>
        ))}
      </div>
    </div>
  );
};

export default MessageVariablesHelper;
