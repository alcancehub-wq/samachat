import React from "react";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	contactsHeader: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: theme.spacing(2),
		flexWrap: "wrap",
		padding: theme.spacing(2.5, 3),
		borderBottom: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.paper,
		[theme.breakpoints.down("sm")]: {
			padding: theme.spacing(2, 2),
			gap: theme.spacing(1.5),
		},
		"& > :first-child": {
			flex: "1 1 280px",
			minWidth: 0,
		},
		"& > :last-child": {
			flex: "0 1 auto",
			minWidth: 0,
			marginLeft: "auto",
		},
		[theme.breakpoints.down("sm")]: {
			"& > :last-child": {
				marginLeft: 0,
				width: "100%",
			},
		},
	},
}));

const MainHeader = ({ children }) => {
	const classes = useStyles();

	return <div className={classes.contactsHeader}>{children}</div>;
};

export default MainHeader;
