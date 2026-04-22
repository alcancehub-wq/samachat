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
  },

  chatPapper: {
    display: "flex",
    height: "100%",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    margin: theme.spacing(2),
    overflow: "hidden",
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
  },
  contactsWrapperSmall: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
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
  },
  conversationWrapper: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    padding: theme.spacing(1.5, 1.5, 0),
    boxSizing: "border-box",
  },
  welcomeMsg: {
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
    borderRadius: 0,
    color: theme.palette.text.secondary,
    fontWeight: 500,
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
