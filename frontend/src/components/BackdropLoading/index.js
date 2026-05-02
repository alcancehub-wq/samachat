import React from "react";

import Backdrop from "@material-ui/core/Backdrop";
import CircularProgress from "@material-ui/core/CircularProgress";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	backdrop: {
		zIndex: theme.zIndex.drawer + 1,
		backgroundColor: "rgba(245, 246, 248, 0.72)",
		backdropFilter: "blur(6px)",
	},
	loadingCard: {
		minWidth: 180,
		padding: theme.spacing(2.5, 3),
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: theme.spacing(1.5),
		borderRadius: theme.shape.borderRadius + 4,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
	},
	spinner: {
		color: theme.palette.primary.main,
	},
	label: {
		color: theme.palette.text.secondary,
		fontWeight: 600,
	},
}));

const BackdropLoading = () => {
	const classes = useStyles();
	return (
		<Backdrop className={classes.backdrop} open={true}>
			<Paper className={classes.loadingCard} elevation={0}>
				<CircularProgress className={classes.spinner} thickness={4.4} />
				<Typography variant="body2" className={classes.label}>
					Carregando...
				</Typography>
			</Paper>
		</Backdrop>
	);
};

export default BackdropLoading;
