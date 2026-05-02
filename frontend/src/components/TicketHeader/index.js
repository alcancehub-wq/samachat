import React from "react";

import { Card, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import TicketHeaderSkeleton from "../TicketHeaderSkeleton";
import ArrowBackIos from "@material-ui/icons/ArrowBackIos";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  ticketHeader: {
    display: "flex",
    alignItems: "center",
    backgroundColor: theme.palette.background.paper,
    flex: "none",
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius + 6,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
    padding: theme.spacing(1.5, 1.75),
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("sm")]: {
      flexWrap: "wrap",
      padding: theme.spacing(1, 1),
      gap: theme.spacing(1),
    },
  },
  backButton: {
    minWidth: 42,
    width: 44,
    height: 44,
    padding: 0,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    boxShadow: "none",
    flex: "none",
    "&:hover": {
      backgroundColor: "rgba(229, 57, 53, 0.08)",
      boxShadow: "none",
    },
  },
  backIcon: {
    fontSize: "1rem",
  },
  content: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      flexWrap: "wrap",
      gap: theme.spacing(1),
    },
  },
}));

const TicketHeader = ({ loading, children }) => {
  const classes = useStyles();
  const history = useHistory();
  const handleBack = () => {
    history.push("/tickets");
  };

  return (
    <>
      {loading ? (
        <TicketHeaderSkeleton />
      ) : (
        <Card className={classes.ticketHeader}>
          <Button color="primary" onClick={handleBack} className={classes.backButton}>
            <ArrowBackIos className={classes.backIcon} />
          </Button>
          <div className={classes.content}>{children}</div>
        </Card>
      )}
    </>
  );
};

export default TicketHeader;
