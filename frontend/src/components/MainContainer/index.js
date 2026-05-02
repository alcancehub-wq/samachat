import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    flex: 1,
    padding: theme.spacing(2),
    height: "100%",
    minHeight: 0,
    backgroundColor: theme.palette.background.default,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5, 1),
    },
  },

  contentWrapper: {
    height: "100%",
    overflowY: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius + 4,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  },
}));

const MainContainer = ({ children, className, ...rest }) => {
  const classes = useStyles();
  const containerClassName = [classes.mainContainer, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Container className={containerClassName} maxWidth={false} {...rest}>
      <div className={classes.contentWrapper}>{children}</div>
    </Container>
  );
};

export default MainContainer;
