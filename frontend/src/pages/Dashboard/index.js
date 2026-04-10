import React, { useContext } from "react"

import Paper from "@material-ui/core/Paper"
import Container from "@material-ui/core/Container"
import Grid from "@material-ui/core/Grid"
import { makeStyles } from "@material-ui/core/styles"
import Typography from "@material-ui/core/Typography";

import useTickets from "../../hooks/useTickets"

import { AuthContext } from "../../context/Auth/AuthContext";

import { i18n } from "../../translate/i18n";

import Chart from "./Chart"

const useStyles = makeStyles(theme => ({
	container: {
		paddingTop: theme.spacing(3),
		paddingBottom: theme.spacing(4),
	},
	pageHeader: {
		display: "flex",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: theme.spacing(2),
		marginBottom: theme.spacing(3),
	},
	pageTitle: {
		fontWeight: 700,
		fontSize: "1.6rem",
		color: "#0f172a",
		fontFamily: '"Poppins", "Segoe UI", sans-serif',
	},
	pageSubtitle: {
		color: "#64748b",
		fontSize: "0.98rem",
		marginTop: theme.spacing(0.5),
	},
	statsGrid: {
		marginBottom: theme.spacing(2),
	},
	fixedHeightPaper: {
		padding: theme.spacing(2.5),
		display: "flex",
		overflow: "auto",
		flexDirection: "column",
		height: 240,
		borderRadius: 16,
		border: "1px solid rgba(15, 23, 42, 0.08)",
		boxShadow: "0 14px 26px rgba(15, 23, 42, 0.08)",
		backgroundColor: "#ffffff",
	},
	customFixedHeightPaper: {
		padding: theme.spacing(2.5),
		display: "flex",
		overflow: "auto",
		flexDirection: "column",
		height: 120,
		borderRadius: 16,
		border: "1px solid rgba(15, 23, 42, 0.08)",
		boxShadow: "0 14px 26px rgba(15, 23, 42, 0.08)",
		backgroundColor: "#ffffff",
	},
	statCard: {
		position: "relative",
		overflow: "hidden",
	},
	statCardAccent: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: 4,
		backgroundImage: "linear-gradient(90deg, #0ea5e9, #38bdf8)",
	},
	statHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	customFixedHeightPaperLg: {
		padding: theme.spacing(2.5),
		display: "flex",
		overflow: "auto",
		flexDirection: "column",
		height: "100%",
		borderRadius: 16,
		border: "1px solid rgba(15, 23, 42, 0.08)",
		boxShadow: "0 14px 26px rgba(15, 23, 42, 0.08)",
	},
  statLabel: {
		color: "#0284c7",
    fontWeight: 700,
  },
  statValue: {
    color: "#0f172a",
    fontWeight: 700,
  },
}))

const Dashboard = () => {
	const classes = useStyles()

	const { user } = useContext(AuthContext);
	var userQueueIds = [];

	if (user.queues && user.queues.length > 0) {
		userQueueIds = user.queues.map(q => q.id);
	}

	const GetTickets = (status, showAll, withUnreadMessages) => {

		const { count } = useTickets({
			status: status,
			showAll: showAll,
			withUnreadMessages: withUnreadMessages,
			queueIds: JSON.stringify(userQueueIds)
		});
		return count;
	}

	return (
		<div>
			<Container maxWidth="lg" className={classes.container}>
				<div className={classes.pageHeader}>
					<div>
						<Typography className={classes.pageTitle}>
							{i18n.t("dashboard.title")}
						</Typography>
						<Typography className={classes.pageSubtitle}>
							{i18n.t("dashboard.subtitle")}
						</Typography>
					</div>
				</div>
				<Grid container spacing={3} className={classes.statsGrid}>
					<Grid item xs={4}>
						<Paper className={`${classes.customFixedHeightPaper} ${classes.statCard}`} style={{ overflow: "hidden" }}>
							<div className={classes.statCardAccent} />
							<div className={classes.statHeader}>
								<Typography component="h3" variant="h6" paragraph className={classes.statLabel}>
								{i18n.t("dashboard.messages.inAttendance.title")}
							</Typography>
							</div>
							<Grid item>
								<Typography component="h1" variant="h4" className={classes.statValue}>
									{GetTickets("open", "true", "false")}
								</Typography>
							</Grid>
						</Paper>
					</Grid>
					<Grid item xs={4}>
						<Paper className={`${classes.customFixedHeightPaper} ${classes.statCard}`} style={{ overflow: "hidden" }}>
							<div className={classes.statCardAccent} />
							<div className={classes.statHeader}>
								<Typography component="h3" variant="h6" paragraph className={classes.statLabel}>
								{i18n.t("dashboard.messages.waiting.title")}
							</Typography>
							</div>
							<Grid item>
								<Typography component="h1" variant="h4" className={classes.statValue}>
									{GetTickets("pending", "true", "false")}
								</Typography>
							</Grid>
						</Paper>
					</Grid>
					<Grid item xs={4}>
						<Paper className={`${classes.customFixedHeightPaper} ${classes.statCard}`} style={{ overflow: "hidden" }}>
							<div className={classes.statCardAccent} />
							<div className={classes.statHeader}>
								<Typography component="h3" variant="h6" paragraph className={classes.statLabel}>
								{i18n.t("dashboard.messages.closed.title")}
							</Typography>
							</div>
							<Grid item>
								<Typography component="h1" variant="h4" className={classes.statValue}>
									{GetTickets("closed", "true", "false")}
								</Typography>
							</Grid>
						</Paper>
					</Grid>
					<Grid item xs={12}>
						<Paper className={classes.fixedHeightPaper}>
							<Chart />
						</Paper>
					</Grid>
				</Grid>
			</Container>
		</div>
	)
}

export default Dashboard