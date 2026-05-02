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
		paddingTop: theme.spacing(4),
		paddingBottom: theme.spacing(5),
		paddingLeft: theme.spacing(1),
		paddingRight: theme.spacing(1),
		[theme.breakpoints.down("sm")]: {
			paddingTop: theme.spacing(2),
			paddingBottom: theme.spacing(3),
			paddingLeft: 0,
			paddingRight: 0,
		},
	},
	pageHeader: {
		display: "flex",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: theme.spacing(2),
		marginBottom: theme.spacing(3.5),
		padding: theme.spacing(0, 0.5),
	},
	pageTitle: {
		fontWeight: 700,
		fontSize: "2.1rem",
		lineHeight: 1.1,
		letterSpacing: "-0.03em",
		color: theme.palette.text.primary,
		[theme.breakpoints.down("sm")]: {
			fontSize: "1.75rem",
		},
	},
	pageSubtitle: {
		color: theme.palette.text.secondary,
		fontSize: "1rem",
		marginTop: theme.spacing(1),
		maxWidth: 620,
	},
	statsGrid: {
		marginBottom: theme.spacing(2.5),
	},
	fixedHeightPaper: {
		padding: theme.spacing(3),
		display: "flex",
		overflow: "auto",
		flexDirection: "column",
		height: 280,
		borderRadius: theme.shape.borderRadius + 6,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 16px 30px rgba(15, 23, 42, 0.08)",
		backgroundColor: theme.palette.background.paper,
		backgroundImage: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,251,252,0.9) 100%)",
		[theme.breakpoints.down("sm")]: {
			padding: theme.spacing(2),
			height: 250,
		},
	},
	customFixedHeightPaper: {
		padding: theme.spacing(3),
		display: "flex",
		overflow: "auto",
		flexDirection: "column",
		height: 156,
		borderRadius: theme.shape.borderRadius + 6,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 16px 30px rgba(15, 23, 42, 0.08)",
		backgroundColor: theme.palette.background.paper,
		backgroundImage: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,251,252,0.96) 100%)",
		[theme.breakpoints.down("sm")]: {
			padding: theme.spacing(2.25),
			height: 150,
		},
	},
	statCard: {
		position: "relative",
		overflow: "hidden",
		justifyContent: "space-between",
	},
	statCardAccent: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: 6,
		backgroundImage: "linear-gradient(90deg, #e53935 0%, #c62828 100%)",
	},
	statHeader: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: theme.spacing(1),
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
		color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: "0.9rem",
    marginBottom: 0,
  },
  statValue: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: "2.5rem",
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
	chartHeader: {
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(0.5),
		marginBottom: theme.spacing(2),
	},
	chartTitle: {
		fontWeight: 700,
		fontSize: "1.15rem",
		color: theme.palette.text.primary,
	},
	chartSubtitle: {
		fontSize: "0.92rem",
		color: theme.palette.text.secondary,
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
					<Grid item xs={12} sm={6} lg={4}>
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
					<Grid item xs={12} sm={6} lg={4}>
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
					<Grid item xs={12} sm={6} lg={4}>
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
							<div className={classes.chartHeader}>
								<Typography className={classes.chartTitle}>
									Atendimentos hoje
								</Typography>
								<Typography className={classes.chartSubtitle}>
									Acompanhe o volume operacional do dia em tempo real.
								</Typography>
							</div>
							<Chart />
						</Paper>
					</Grid>
				</Grid>
			</Container>
		</div>
	)
}

export default Dashboard