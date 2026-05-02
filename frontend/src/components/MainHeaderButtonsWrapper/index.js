import React from "react";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	MainHeaderButtonsWrapper: {
		flex: "none",
		display: "flex",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: theme.spacing(1.5),
		flexWrap: "wrap",
		rowGap: theme.spacing(1),
		columnGap: theme.spacing(1.5),
		[theme.breakpoints.down("sm")]: {
			width: "100%",
			justifyContent: "flex-start",
		},
		"& > *": {
			margin: 0,
			flexShrink: 0,
		},
		"& .MuiTextField-root": {
			minWidth: 220,
			[theme.breakpoints.down("sm")]: {
				minWidth: "100%",
			},
		},
		"& .MuiButton-root": {
			minHeight: 40,
		},
	},
}));

const MainHeaderButtonsWrapper = ({ children }) => {
	const classes = useStyles();

	return <div className={classes.MainHeaderButtonsWrapper}>{children}</div>;
};

export default MainHeaderButtonsWrapper;
