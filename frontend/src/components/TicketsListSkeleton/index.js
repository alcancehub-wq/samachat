import React from "react";

import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Divider from "@material-ui/core/Divider";
import { makeStyles } from "@material-ui/core/styles";
import Skeleton from "@material-ui/lab/Skeleton";

const useStyles = makeStyles((theme) => ({
	listItem: {
		padding: theme.spacing(1.5, 2),
		margin: theme.spacing(1, 1.5),
		border: `1px solid ${theme.palette.divider}`,
		borderRadius: theme.shape.borderRadius,
		backgroundColor: theme.palette.background.paper,
		boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
	},
	avatar: {
		width: 44,
		height: 44,
	},
	primaryLine: {
		borderRadius: 8,
		transform: "none",
	},
	secondaryLine: {
		borderRadius: 8,
		transform: "none",
		opacity: 0.82,
	},
	divider: {
		margin: theme.spacing(0, 2.5),
		backgroundColor: "transparent",
	},
}));

const TicketsSkeleton = () => {
	const classes = useStyles();
	return (
		<>
			<ListItem dense className={classes.listItem}>
				<ListItemAvatar>
					<Skeleton
						animation="wave"
						variant="circle"
						width={44}
						height={44}
						className={classes.avatar}
					/>
				</ListItemAvatar>
				<ListItemText
					primary={
						<Skeleton
							animation="wave"
							height={18}
							width="62%"
							className={classes.primaryLine}
						/>
					}
					secondary={
						<Skeleton
							animation="wave"
							height={16}
							width="78%"
							className={classes.secondaryLine}
						/>
					}
				/>
			</ListItem>
			<Divider variant="inset" className={classes.divider} />
			<ListItem dense className={classes.listItem}>
				<ListItemAvatar>
					<Skeleton
						animation="wave"
						variant="circle"
						width={44}
						height={44}
						className={classes.avatar}
					/>
				</ListItemAvatar>
				<ListItemText
					primary={
						<Skeleton
							animation="wave"
							height={18}
							width="70%"
							className={classes.primaryLine}
						/>
					}
					secondary={
						<Skeleton
							animation="wave"
							height={16}
							width="86%"
							className={classes.secondaryLine}
						/>
					}
				/>
			</ListItem>
			<Divider variant="inset" className={classes.divider} />
			<ListItem dense className={classes.listItem}>
				<ListItemAvatar>
					<Skeleton
						animation="wave"
						variant="circle"
						width={44}
						height={44}
						className={classes.avatar}
					/>
				</ListItemAvatar>
				<ListItemText
					primary={
						<Skeleton
							animation="wave"
							height={18}
							width="58%"
							className={classes.primaryLine}
						/>
					}
					secondary={
						<Skeleton
							animation="wave"
							height={16}
							width="74%"
							className={classes.secondaryLine}
						/>
					}
				/>
			</ListItem>
			<Divider variant="inset" className={classes.divider} />
		</>
	);
};

export default TicketsSkeleton;
