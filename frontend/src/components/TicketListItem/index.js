import React, { useState, useEffect, useRef, useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";
import IconButton from "@material-ui/core/IconButton";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import TicketTagsModal from "../TicketTagsModal";

const useStyles = makeStyles(theme => ({
	ticket: {
		position: "relative",
	},

	pendingTicket: {
		cursor: "unset",
	},

	noTicketsDiv: {
		display: "flex",
		height: "100px",
		margin: 40,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},

	noTicketsText: {
		textAlign: "center",
		color: "rgb(104, 121, 146)",
		fontSize: "14px",
		lineHeight: "1.4",
	},

	noTicketsTitle: {
		textAlign: "center",
		fontSize: "16px",
		fontWeight: "600",
		margin: "0px",
	},

	contactNameWrapper: {
		display: "flex",
		justifyContent: "space-between",
	},

	lastMessageTime: {
		justifySelf: "flex-end",
	},

	closedBadge: {
		alignSelf: "center",
		justifySelf: "flex-end",
		marginRight: 32,
		marginLeft: "auto",
	},

	contactLastMessage: {
		paddingRight: 20,
	},

	newMessagesCount: {
		alignSelf: "center",
		marginRight: 8,
		marginLeft: "auto",
	},

	badgeStyle: {
		color: "white",
		backgroundColor: green[500],
	},

	acceptButton: {
		position: "absolute",
		left: "50%",
	},

	ticketQueueColor: {
		flex: "none",
		width: "8px",
		height: "100%",
		position: "absolute",
		top: "0%",
		left: "0%",
	},

	userTag: {
		position: "absolute",
		marginRight: 5,
		right: 5,
		bottom: 5,
		background: "#3b82f6",
		color: "#ffffff",
		border: "1px solid rgba(15, 23, 42, 0.1)",
		padding: 1,
		paddingLeft: 5,
		paddingRight: 5,
		borderRadius: 10,
		fontSize: "0.9em"
	},
	tagList: {
		display: "flex",
		flexWrap: "wrap",
		gap: 4,
		marginTop: 4,
	},
	tagChip: {
		background: "#f1f5f9",
		color: "#0f172a",
		borderRadius: 10,
		padding: "2px 6px",
		fontSize: "0.7rem",
		whiteSpace: "nowrap",
	},
	tagButton: {
		padding: 6,
		marginLeft: 6,
	},
}));

const TicketListItem = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const { ticketId } = useParams();
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);
	const [tagsModalOpen, setTagsModalOpen] = useState(false);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleAcepptTicket = async id => {
		setLoading(true);
		try {
			await api.put(`/tickets/${id}`, {
				status: "open",
				userId: user?.id,
			});
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
		if (isMounted.current) {
			setLoading(false);
		}
		history.push(`/tickets/${id}`);
	};

	const handleSelectTicket = id => {
		history.push(`/tickets/${id}`);
	};

	return (
		<React.Fragment key={ticket.id}>
			<TicketTagsModal
				open={tagsModalOpen}
				onClose={() => setTagsModalOpen(false)}
				ticketId={ticket.id}
				initialTagIds={ticket.tags ? ticket.tags.map(tag => tag.id) : []}
			/>
			<ListItem
				dense
				button
				onClick={e => {
					if (ticket.status === "pending") return;
					handleSelectTicket(ticket.id);
				}}
				selected={ticketId && +ticketId === ticket.id}
				className={clsx(classes.ticket, {
					[classes.pendingTicket]: ticket.status === "pending",
				})}
			>
				<Tooltip
					arrow
					placement="right"
					title={ticket.queue?.name || "Sem fila"}
				>
					<span
						style={{ backgroundColor: ticket.queue?.color || "#7C7C7C" }}
						className={classes.ticketQueueColor}
					></span>
				</Tooltip>
				<ListItemAvatar>
					<Avatar src={ticket?.contact?.profilePicUrl} />
				</ListItemAvatar>
				<ListItemText
					disableTypography
					primary={
						<span className={classes.contactNameWrapper}>
							<Typography
								noWrap
								component="span"
								variant="body2"
								color="textPrimary"
							>
								{ticket.contact.name}
							</Typography>
							{ticket.status === "closed" && (
								<Badge
									className={classes.closedBadge}
									badgeContent={"closed"}
									color="primary"
								/>
							)}
							{ticket.lastMessage && (
								<Typography
									className={classes.lastMessageTime}
									component="span"
									variant="body2"
									color="textSecondary"
								>
									{isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
										<>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
									) : (
										<>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
									)}
								</Typography>
							)}
							{ticket.whatsappId && (
								<div className={classes.userTag} title={i18n.t("ticketsList.connectionTitle")}>{ticket.whatsapp?.name}</div>
							)}
							<IconButton
								size="small"
								className={classes.tagButton}
								onClick={e => {
									e.stopPropagation();
									setTagsModalOpen(true);
								}}
								title={i18n.t("ticketTagsModal.title")}
							>
								<LocalOfferIcon fontSize="small" />
							</IconButton>
						</span>
					}
					secondary={
						<span className={classes.contactNameWrapper}>
							<Typography
								className={classes.contactLastMessage}
								noWrap
								component="span"
								variant="body2"
								color="textSecondary"
							>
								{ticket.lastMessage ? (
									<MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>
								) : (
									<br />
								)}
							</Typography>
							{ticket.tags && ticket.tags.length > 0 && (
								<span className={classes.tagList}>
									{ticket.tags.slice(0, 2).map(tag => (
										<span key={tag.id} className={classes.tagChip}>
											{tag.name}
										</span>
									))}
									{ticket.tags.length > 2 && (
										<span className={classes.tagChip}>
											+{ticket.tags.length - 2}
										</span>
									)}
								</span>
							)}

							<Badge
								className={classes.newMessagesCount}
								badgeContent={ticket.unreadMessages}
								classes={{
									badge: classes.badgeStyle,
								}}
							/>
						</span>
					}
				/>
				{ticket.status === "pending" && (
					<ButtonWithSpinner
						color="primary"
						variant="contained"
						className={classes.acceptButton}
						size="small"
						loading={loading}
						onClick={e => handleAcepptTicket(ticket.id)}
					>
						{i18n.t("ticketsList.buttons.accept")}
					</ButtonWithSpinner>
				)}
			</ListItem>
			<Divider variant="inset" component="li" />
		</React.Fragment>
	);
};

export default TicketListItem;
