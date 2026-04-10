import React from "react";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  title: {
    fontWeight: 700,
    fontSize: "1rem",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
}));

const Title = props => {
	const classes = useStyles();
	return (
		<Typography component="h2" variant="h6" gutterBottom className={classes.title}>
			{props.children}
		</Typography>
	);
};

export default Title;
