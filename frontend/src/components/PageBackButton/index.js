import React from "react";
import { useHistory } from "react-router-dom";

import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";

const useStyles = makeStyles(theme => ({
  button: {
    minHeight: 34,
    marginBottom: theme.spacing(1),
    padding: theme.spacing(0.5, 1.25),
    borderRadius: 4,
    border: "1px solid rgba(15, 23, 42, 0.12)",
    backgroundColor: "#FFFFFF",
    color: "#111111",
    fontSize: "0.8125rem",
    fontWeight: 700,
    textTransform: "none",
    boxShadow: "none",
    justifyContent: "flex-start",
    "&:hover": {
      backgroundColor: "#F9FAFB",
      borderColor: "rgba(15, 23, 42, 0.18)",
      boxShadow: "none",
    },
  },
  icon: {
    fontSize: "1rem",
  },
}));

const PageBackButton = ({ fallbackTo = "/dashboard", children = "Voltar" }) => {
  const classes = useStyles();
  const history = useHistory();

  const handleBack = () => {
    if (window.history.length > 1) {
      history.goBack();
      return;
    }

    history.push(fallbackTo);
  };

  return (
    <Button
      variant="outlined"
      onClick={handleBack}
      startIcon={<ArrowBackIcon className={classes.icon} />}
      className={classes.button}
    >
      {children}
    </Button>
  );
};

export default PageBackButton;