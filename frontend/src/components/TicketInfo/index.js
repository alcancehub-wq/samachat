import React from "react";

import { Avatar, CardHeader } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
	cardHeader: {
		padding: 0,
		margin: 0,
		minWidth: 0,
		alignItems: "center",
		"& .MuiCardHeader-content": {
			minWidth: 0,
		},
	},
	avatar: {
		width: 44,
		height: 44,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
	},
	title: {
		fontWeight: 700,
		fontSize: "0.98rem",
		lineHeight: 1.25,
		color: theme.palette.text.primary,
	},
	subtitle: {
		marginTop: theme.spacing(0.25),
		fontSize: "0.82rem",
		lineHeight: 1.45,
		color: theme.palette.text.secondary,
	},
}));

const TicketInfo = ({ contact, ticket, onClick }) => {
	const classes = useStyles();
	return (
		<CardHeader
			onClick={onClick}
			style={{ cursor: "pointer" }}
			className={classes.cardHeader}
			titleTypographyProps={{ noWrap: true, className: classes.title }}
			subheaderTypographyProps={{ noWrap: true, className: classes.subtitle }}
			avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" className={classes.avatar} />}
			title={`${contact.name} #${ticket.id}`}
			subheader={
				ticket.user &&
				`${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
			}
		/>
	);
};

export default TicketInfo;
