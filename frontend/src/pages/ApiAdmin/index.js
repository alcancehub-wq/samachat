import React, { useEffect, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import TextField from "@material-ui/core/TextField";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(8, 8, 3),
  },
  pageHeader: {
    marginBottom: theme.spacing(2),
  },
  pageSubtitle: {
    color: theme.palette.text.secondary,
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    marginBottom: 12,
  },
}));

const ApiAdmin = () => {
  const classes = useStyles();
  const [settings, setSettings] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        setSettings(data);
      } catch (err) {
        toastError(err);
      }
    };

    fetchSettings();
  }, []);

  const getSettingValue = (key) => {
    const setting = settings.find((item) => item.key === key);
    return setting ? setting.value : "";
  };

  return (
    <div className={classes.root}>
      <Container className={classes.container} maxWidth="sm">
        <div className={classes.pageHeader}>
          <Typography variant="h6">{i18n.t("apiAdmin.title")}</Typography>
          <Typography variant="body2" className={classes.pageSubtitle}>
            {i18n.t("apiAdmin.description")}
          </Typography>
        </div>
        <Paper className={classes.paper}>
          <TextField
            id="api-token-setting"
            label={i18n.t("settings.apiToken.label")}
            margin="dense"
            variant="outlined"
            fullWidth
            InputProps={{ readOnly: true }}
            helperText={i18n.t("settings.apiToken.helper")}
            value={getSettingValue("userApiToken")}
          />
        </Paper>
      </Container>
    </div>
  );
};

export default ApiAdmin;
