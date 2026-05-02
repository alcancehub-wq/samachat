import React from "react";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Skeleton from "@material-ui/lab/Skeleton";
import { makeStyles } from "@material-ui/core";

const useStyles = makeStyles(theme => ({
	customTableCell: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	tableRow: {
		"& > td": {
			paddingTop: theme.spacing(1.25),
			paddingBottom: theme.spacing(1.25),
			backgroundColor: theme.palette.background.paper,
		},
		"& > td:first-child": {
			borderTopLeftRadius: theme.shape.borderRadius,
			borderBottomLeftRadius: theme.shape.borderRadius,
		},
		"& > td:last-child": {
			borderTopRightRadius: theme.shape.borderRadius,
			borderBottomRightRadius: theme.shape.borderRadius,
		},
	},
	skeletonLine: {
		borderRadius: 8,
		transform: "none",
		opacity: 0.9,
	},
	avatarCell: {
		paddingRight: 0,
		width: 56,
	},
}));

const TableRowSkeleton = ({ avatar, columns }) => {
	const classes = useStyles();
	return (
		<>
			<TableRow className={classes.tableRow}>
				{avatar && (
					<>
						<TableCell className={classes.avatarCell}>
							<Skeleton
								animation="wave"
								variant="circle"
								width={40}
								height={40}
							/>
						</TableCell>
						<TableCell>
							<Skeleton animation="wave" height={18} width={96} className={classes.skeletonLine} />
						</TableCell>
					</>
				)}
				{Array.from({ length: columns }, (_, index) => (
					<TableCell align="center" key={index}>
						<div className={classes.customTableCell}>
							<Skeleton
								align="center"
								animation="wave"
								height={18}
								width={80}
								className={classes.skeletonLine}
							/>
						</div>
					</TableCell>
				))}
			</TableRow>
		</>
	);
};

export default TableRowSkeleton;
