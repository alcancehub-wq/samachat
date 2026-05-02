import React from "react";
import Skeleton from "@material-ui/lab/Skeleton";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
	headerCard: {
		borderRadius: theme.shape.borderRadius,
		padding: theme.spacing(2, 1.5),
		boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
	},
	detailsCard: {
		borderRadius: theme.shape.borderRadius,
		paddingTop: theme.spacing(1),
		backgroundColor: "transparent",
	},
	extraInfoCard: {
		borderRadius: theme.shape.borderRadius,
		backgroundColor: theme.palette.background.paper,
		boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
	},
	title: {
		color: theme.palette.text.secondary,
		fontWeight: 600,
		paddingBottom: theme.spacing(0.5),
	},
	skeletonLine: {
		borderRadius: 8,
		transform: "none",
	},
}));

const ContactDrawerSkeleton = ({ classes }) => {
	const localClasses = useStyles();
	return (
		<div className={classes.content}>
			<Paper
				square
				variant="outlined"
				className={`${classes.contactHeader} ${localClasses.headerCard}`}
			>
				<Skeleton
					animation="wave"
					variant="circle"
					width={160}
					height={160}
					className={classes.contactAvatar}
				/>
				<Skeleton animation="wave" height={24} width={110} className={localClasses.skeletonLine} />
				<Skeleton animation="wave" height={18} width={96} className={localClasses.skeletonLine} />
				<Skeleton animation="wave" height={18} width={88} className={localClasses.skeletonLine} />
			</Paper>
			<Paper square className={`${classes.contactDetails} ${localClasses.detailsCard}`}>
				<Typography variant="subtitle1" className={localClasses.title}>
					{i18n.t("contactDrawer.extraInfo")}
				</Typography>
				<Paper
					square
					variant="outlined"
					className={`${classes.contactExtraInfo} ${localClasses.extraInfoCard}`}
				>
					<Skeleton animation="wave" height={16} width={72} className={localClasses.skeletonLine} />
					<Skeleton animation="wave" height={18} width={180} className={localClasses.skeletonLine} />
				</Paper>
				<Paper
					square
					variant="outlined"
					className={`${classes.contactExtraInfo} ${localClasses.extraInfoCard}`}
				>
					<Skeleton animation="wave" height={16} width={84} className={localClasses.skeletonLine} />
					<Skeleton animation="wave" height={18} width={168} className={localClasses.skeletonLine} />
				</Paper>
				<Paper
					square
					variant="outlined"
					className={`${classes.contactExtraInfo} ${localClasses.extraInfoCard}`}
				>
					<Skeleton animation="wave" height={16} width={64} className={localClasses.skeletonLine} />
					<Skeleton animation="wave" height={18} width={154} className={localClasses.skeletonLine} />
				</Paper>
			</Paper>
		</div>
	);
};

export default ContactDrawerSkeleton;
