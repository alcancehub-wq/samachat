import React, { useState, useEffect, useRef, useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";
import IconButton from "@material-ui/core/IconButton";
import Checkbox from "@material-ui/core/Checkbox";
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
		margin: theme.spacing(0.85, 1.25),
		padding: theme.spacing(1.35, 1.5, 1.15, 2),
		borderRadius: theme.shape.borderRadius + 2,
		border: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.paper,
		alignItems: "flex-start",
		transition: "border-color 0.18s ease, background-color 0.18s ease",
		"&:hover": {
			borderColor: theme.palette.type === "dark" ? "rgba(255, 90, 95, 0.26)" : "rgba(229, 57, 53, 0.14)",
			backgroundColor: theme.custom.tableHover,
		},
		"&.Mui-selected": {
			backgroundColor: theme.custom.dangerSoft,
			borderColor: theme.palette.type === "dark" ? "rgba(255, 90, 95, 0.26)" : "rgba(229, 57, 53, 0.18)",
		},
	},

	pendingTicket: {
		cursor: "unset",
		opacity: 0.98,
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
		color: theme.palette.text.secondary,
		fontSize: "14px",
		lineHeight: "1.4",
	},

	noTicketsTitle: {
		textAlign: "center",
		color: theme.palette.text.primary,
		fontSize: "16px",
		fontWeight: "600",
		margin: "0px",
	},

	ticketBody: {
		flex: 1,
		minWidth: 0,
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(0.5),
		paddingTop: theme.spacing(0.15),
		minHeight: 78,
	},

	headerRow: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: theme.spacing(1),
		minWidth: 0,
	},

	titleRow: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(0.75),
		minWidth: 0,
		flex: 1,
	},

	headerActions: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(0.35),
		flexShrink: 0,
	},

	messageRow: {
		minWidth: 0,
	},

	footerRow: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		gap: theme.spacing(0.75),
		minWidth: 0,
		marginTop: "auto",
	},

	footerMeta: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(0.75),
		minWidth: 0,
		flexWrap: "wrap",
	},

	footerActions: {
		display: "flex",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: theme.spacing(0.75),
		flexShrink: 0,
		minWidth: 0,
	},

	lastMessageTime: {
		fontSize: "0.8rem",
		fontWeight: 700,
		whiteSpace: "nowrap",
		flexShrink: 0,
		color: theme.palette.text.secondary,
	},

	closedBadge: {
		alignSelf: "center",
		justifySelf: "flex-end",
		marginRight: 8,
		marginLeft: "auto",
	},

	contactLastMessage: {
		display: "block",
		fontSize: "0.83rem",
		lineHeight: 1.45,
		maxWidth: "100%",
	},

	newMessagesCount: {
		marginRight: 2,
	},

	badgeStyle: {
		color: "white",
		backgroundColor: green[500],
		fontWeight: 700,
	},

	acceptButton: {
		borderRadius: 4,
		textTransform: "none",
		fontWeight: 600,
		boxShadow: "none !important",
		backgroundColor: "#FF1919 !important",
		color: "#FFFFFF !important",
		whiteSpace: "nowrap",
		"&:hover": {
			backgroundColor: "#E11414 !important",
			boxShadow: "none !important",
		},
	},

	selectCheckbox: {
		padding: 6,
		marginRight: -6,
		color: theme.palette.type === "dark" ? "rgba(243, 246, 252, 0.42)" : "rgba(15, 23, 42, 0.28)",
		"&.Mui-checked": {
			color: "#FF1919",
		},
	},

	ticketQueueColor: {
		flex: "none",
		width: "6px",
		height: "100%",
		position: "absolute",
		top: "0%",
		left: "0%",
		borderTopLeftRadius: theme.shape.borderRadius + 2,
		borderBottomLeftRadius: theme.shape.borderRadius + 2,
	},

	userTag: {
		background: theme.palette.background.default,
		color: theme.palette.text.primary,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "none",
		padding: "3px 8px",
		borderRadius: 999,
		fontSize: "0.7rem",
		fontWeight: 600,
		maxWidth: 140,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	contactAvatar: {
		width: 46,
		height: 46,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "none",
	},
	contactName: {
		fontWeight: 700,
		fontSize: "0.98rem",
		lineHeight: 1.2,
		minWidth: 0,
		flex: 1,
	},
	closedStatus: {
		padding: "4px 8px",
		borderRadius: 999,
		fontSize: "0.68rem",
		fontWeight: 700,
		textTransform: "uppercase",
		letterSpacing: "0.04em",
		color: "#ffffff",
		backgroundColor: theme.palette.text.secondary,
	},
	tagList: {
		display: "flex",
		flexWrap: "wrap",
		gap: 6,
		alignItems: "center",
		marginTop: 6,
	},

	footerTagList: {
		marginTop: 0,
		justifyContent: "flex-end",
		maxWidth: 260,
	},
	tagChip: {
		background: theme.custom.dangerSoft,
		color: theme.palette.text.primary,
		borderRadius: 999,
		padding: "4px 8px",
		fontSize: "0.7rem",
		whiteSpace: "nowrap",
		fontWeight: 600,
		border: `1px solid ${theme.palette.type === "dark" ? "rgba(255, 90, 95, 0.18)" : "rgba(229, 57, 53, 0.10)"}`,
	},
	tagButton: {
		padding: 6,
		backgroundColor: theme.custom.softBackground,
		border: `1px solid ${theme.palette.divider}`,
	},
}));

const TicketListItem = ({ ticket, selectable = false, selectedInBulk = false, onToggleSelect }) => {
	const classes = useStyles();
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const { ticketId } = useParams();
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);
	const [tagsModalOpen, setTagsModalOpen] = useState(false);
	const assigneeLabel = ticket.user?.name || ticket.whatsapp?.name;
	const assigneeTitle = ticket.user?.name
		? i18n.t("messagesList.header.assignedTo")
		: i18n.t("ticketsList.connectionTitle");
	const ticketTimestamp = ticket.status === "pending"
		? ticket.pendingSince || ticket.updatedAt || ticket.createdAt
		: ticket.updatedAt;
	const formattedTicketTimestamp = ticketTimestamp
		? ticket.status === "pending"
			? format(parseISO(ticketTimestamp), "dd/MM HH:mm")
			: isSameDay(parseISO(ticketTimestamp), new Date())
				? format(parseISO(ticketTimestamp), "HH:mm")
				: format(parseISO(ticketTimestamp), "dd/MM/yyyy")
		: null;

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
				selected={(ticketId && +ticketId === ticket.id) || selectedInBulk}
				className={clsx(classes.ticket, {
					[classes.pendingTicket]: ticket.status === "pending",
				})}
			>
				{selectable && (
					<></>
				)}
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
					<Avatar src={ticket?.contact?.profilePicUrl} className={classes.contactAvatar} />
				</ListItemAvatar>
				<div className={classes.ticketBody}>
					<div className={classes.headerRow}>
						<div className={classes.titleRow}>
							<Typography
								noWrap
								component="span"
								variant="body2"
								color="textPrimary"
								className={classes.contactName}
							>
								{ticket.contact.name}
							</Typography>
							{ticket.status === "closed" && (
								<Badge
									className={classes.closedBadge}
									badgeContent={"closed"}
									color="primary"
									classes={{ badge: classes.closedStatus }}
								/>
							)}
						</div>
						<div className={classes.headerActions}>
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
							{selectable && (
								<Checkbox
									className={classes.selectCheckbox}
									checked={selectedInBulk}
									onClick={e => e.stopPropagation()}
									onChange={() => onToggleSelect && onToggleSelect(ticket.id)}
								/>
							)}
						</div>
					</div>
					<div className={classes.messageRow}>
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
					</div>
					<div className={classes.footerRow}>
						<div className={classes.footerMeta}>
							{formattedTicketTimestamp && (
								<Typography
									className={classes.lastMessageTime}
									component="span"
									variant="body2"
								>
									{formattedTicketTimestamp}
								</Typography>
							)}
							{assigneeLabel && (
								<div className={classes.userTag} title={assigneeTitle}>{assigneeLabel}</div>
							)}
						</div>
						<div className={classes.footerActions}>
							{ticket.status !== "pending" && ticket.tags && ticket.tags.length > 0 && (
								<span className={clsx(classes.tagList, classes.footerTagList)}>
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
							{ticket.unreadMessages > 0 && (
								<Badge
									className={classes.newMessagesCount}
									badgeContent={ticket.unreadMessages}
									classes={{
										badge: classes.badgeStyle,
									}}
								/>
							)}
							{ticket.status === "pending" && (
								<ButtonWithSpinner
									variant="contained"
									className={classes.acceptButton}
									size="small"
									loading={loading}
									onClick={e => {
										e.stopPropagation();
										handleAcepptTicket(ticket.id);
									}}
								>
									{i18n.t("ticketsList.buttons.accept")}
								</ButtonWithSpinner>
							)}
						</div>
					</div>
				</div>
			</ListItem>
			<Divider variant="inset" component="li" style={{ marginLeft: 32, marginRight: 24, opacity: 0.45 }} />
		</React.Fragment>
	);
};

export default TicketListItem;
