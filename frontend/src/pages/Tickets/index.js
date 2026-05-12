import React from "react";
import { useParams } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";

import { i18n } from "../../translate/i18n";
import Hidden from "@material-ui/core/Hidden";

const useStyles = makeStyles((theme) => ({
  chatContainer: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(0.5, 0.5, 0),
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      padding: 0,
      backgroundColor: theme.palette.background.paper,
    },
  },

  chatPapper: {
    display: "flex",
    height: "100%",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 16,
    boxShadow: "none",
    overflow: "hidden",
    position: "relative",
    backgroundImage: theme.custom.panelGradientSoft,
    [theme.breakpoints.down("sm")]: {
      border: 0,
      borderRadius: 0,
      backgroundColor: theme.palette.background.paper,
      backgroundImage: "none",
    },
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
    minHeight: 0,
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      borderRight: 0,
    },
  },
  contactsWrapperSmall: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
    minHeight: 0,
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  messagessWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    minWidth: 0,
    borderLeft: 0,
    boxSizing: "border-box",
    minHeight: 0,
    background: theme.custom.panelGradientSoft,
    [theme.breakpoints.down("sm")]: {
      borderLeft: 0,
      borderTop: 0,
      background: theme.palette.background.paper,
    },
  },
  conversationWrapper: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    padding: theme.spacing(1.25, 1, 0),
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      padding: 0,
    },
  },
  welcomeMsg: {
    background: theme.custom.panelGradient,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
    borderRadius: 12,
    color: theme.palette.text.secondary,
    fontWeight: 500,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
    padding: theme.spacing(5),
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: theme.custom.dangerSoft,
      marginBottom: theme.spacing(2),
    },
    "& span": {
      maxWidth: 320,
      fontSize: "0.98rem",
      lineHeight: 1.6,
    },
    [theme.breakpoints.down("sm")]: {
      minHeight: "100%",
      padding: theme.spacing(3, 2),
    },
  },
  ticketsManager: {},
  ticketsManagerClosed: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
}));

const Chat = () => {
  const classes = useStyles();
  const { ticketId } = useParams();

  const showConversationPane = Boolean(ticketId);

  return (
    <div className={classes.chatContainer}>
      <div className={classes.chatPapper}>
        <Grid container spacing={0}>
          {/* <Grid item xs={4} className={classes.contactsWrapper}> */}
          <Grid
            item
            xs={12}
            md={4}
            className={
              ticketId ? classes.contactsWrapperSmall : classes.contactsWrapper
            }
          >
            <TicketsManager />
          </Grid>
          <Grid
            item
            xs={12}
            md={8}
            className={classes.messagessWrapper}
            style={{ display: showConversationPane ? "flex" : "none" }}
          >
            {/* <Grid item xs={8} className={classes.messagessWrapper}> */}
            {ticketId ? (
              <div className={classes.conversationWrapper}>
                <Ticket />
              </div>
            ) : (
              <Hidden only={["sm", "xs"]}>
                <div className={classes.conversationWrapper}>
                  <Paper className={classes.welcomeMsg}>
                    <span>{i18n.t("chat.noTicketMessage")}</span>
                  </Paper>
                </div>
              </Hidden>
            )}
          </Grid>
          {!showConversationPane && (
            <Grid item xs={12} className={classes.messagessWrapper}>
              <Hidden only={["sm", "xs"]}>
                <div className={classes.conversationWrapper}>
                  <Paper className={classes.welcomeMsg}>
                    <span>{i18n.t("chat.noTicketMessage")}</span>
                  </Paper>
                </div>
              </Hidden>
            </Grid>
          )}
        </Grid>
      </div>
    </div>
  );
};

export default Chat;
