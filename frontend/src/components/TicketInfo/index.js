import React from "react";

import { Avatar, Button, Chip, CardHeader } from "@material-ui/core";
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
		width: 48,
		height: 48,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
		[theme.breakpoints.down("sm")]: {
			width: 40,
			height: 40,
			boxShadow: "none",
		},
	},
	title: {
		fontWeight: 700,
		fontSize: "1.02rem",
		lineHeight: 1.25,
		color: theme.palette.text.primary,
		[theme.breakpoints.down("sm")]: {
			fontSize: "0.98rem",
		},
	},
	subtitle: {
		marginTop: theme.spacing(0.25),
		fontSize: "0.84rem",
		lineHeight: 1.45,
		color: theme.palette.text.secondary,
		[theme.breakpoints.down("sm")]: {
			fontSize: "0.76rem",
			marginTop: 0,
		},
	},
}));

const TicketInfo = ({ contact, ticket, onClick, onConnectionDetails }) => {
	const classes = useStyles();
	const isOfficial = ticket?.whatsapp?.providerType === "official";
	const isConnected = ticket?.whatsapp?.status === "CONNECTED";
	const isActive = ["configured", "webhook_received", "message_received"].includes(
		String(ticket?.whatsapp?.cloudApiStatus || "")
	);
	return (
		<CardHeader
			onClick={onClick}
			style={{ cursor: "pointer" }}
			className={classes.cardHeader}
			titleTypographyProps={{ noWrap: true, className: classes.title }}
			subheaderTypographyProps={{ noWrap: true, className: classes.subtitle }}
			avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" className={classes.avatar} />}
			title={contact.name}
			subheader={
				<>
					{ticket.user && `${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`}
					{isOfficial && (
						<div style={{ display: "flex", gap: 6, marginTop: 4 }}>
							{isConnected && (
								<Chip
									size="small"
									label="Conectado"
									style={{ backgroundColor: "#e8f5e9", color: "#237a3b", fontWeight: 600 }}
								/>
							)}
							{isActive && (
								<Chip
									size="small"
									label="Ativa"
									style={{ backgroundColor: "#e8f5e9", color: "#237a3b", fontWeight: 600 }}
								/>
							)}
							<Button
								variant="outlined"
								size="small"
								style={{ textTransform: "none", minWidth: 0, height: 24, fontSize: "0.72rem" }}
								onClick={(event) => {
									event.stopPropagation();
									if (onConnectionDetails) onConnectionDetails();
								}}
							>
								Ver detalhes
							</Button>
						</div>
					)}
				</>
			}
		/>
	);
};

export default TicketInfo;
