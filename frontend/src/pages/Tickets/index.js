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
    padding: theme.spacing(1.5),
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      padding: 0,
    },
  },

  chatPapper: {
    display: "flex",
    height: "100%",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius + 4,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
    position: "relative",
    [theme.breakpoints.down("sm")]: {
      borderRadius: 0,
      borderLeft: 0,
      borderRight: 0,
      boxShadow: "none",
    },
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
    minHeight: 0,
    backgroundColor: theme.palette.background.paper,
  },
  contactsWrapperSmall: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
    minHeight: 0,
    backgroundColor: theme.palette.background.paper,
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  messagessWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    borderLeft: `1px solid ${theme.palette.divider}`,
    boxSizing: "border-box",
    minHeight: 0,
    background: "linear-gradient(180deg, rgba(250, 251, 252, 0.65) 0%, rgba(255, 255, 255, 1) 22%)",
    [theme.breakpoints.down("sm")]: {
      borderLeft: 0,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  },
  conversationWrapper: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    padding: theme.spacing(1.5),
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1, 0, 0),
    },
  },
  welcomeMsg: {
    background: "linear-gradient(180deg, rgba(250, 251, 252, 1) 0%, rgba(255, 255, 255, 1) 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
    borderRadius: theme.shape.borderRadius + 4,
    color: theme.palette.text.secondary,
    fontWeight: 500,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
    padding: theme.spacing(4),
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "rgba(229, 57, 53, 0.10)",
      marginBottom: theme.spacing(2),
      boxShadow: "inset 0 0 0 10px rgba(229, 57, 53, 0.06)",
    },
    "& span": {
      maxWidth: 320,
      fontSize: "0.98rem",
      lineHeight: 1.6,
    },
    [theme.breakpoints.down("sm")]: {
      minHeight: "100%",
      borderRadius: 0,
      borderLeft: 0,
      borderRight: 0,
      boxShadow: "none",
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
