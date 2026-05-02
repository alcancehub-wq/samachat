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
		boxShadow: "0 10px 22px rgba(15, 23, 42, 0.05)",
		alignItems: "flex-start",
		transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease",
		"&:hover": {
			transform: "translateY(-1px)",
			boxShadow: "0 16px 30px rgba(15, 23, 42, 0.08)",
			borderColor: "rgba(229, 57, 53, 0.14)",
			backgroundColor: "rgba(255, 255, 255, 0.98)",
		},
		"&.Mui-selected": {
			backgroundColor: "rgba(229, 57, 53, 0.08)",
			borderColor: "rgba(229, 57, 53, 0.18)",
			boxShadow: "0 18px 34px rgba(198, 40, 40, 0.10)",
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
		alignItems: "flex-start",
		gap: theme.spacing(1),
	},

	lastMessageTime: {
		justifySelf: "flex-end",
		fontSize: "0.74rem",
		fontWeight: 600,
		whiteSpace: "nowrap",
	},

	closedBadge: {
		alignSelf: "center",
		justifySelf: "flex-end",
		marginRight: 8,
		marginLeft: "auto",
	},

	contactLastMessage: {
		paddingRight: 16,
		fontSize: "0.83rem",
		lineHeight: 1.45,
	},

	newMessagesCount: {
		alignSelf: "center",
		marginRight: 2,
		marginLeft: "auto",
	},

	badgeStyle: {
		color: "white",
		backgroundColor: green[500],
		fontWeight: 700,
		boxShadow: "0 6px 12px rgba(46, 125, 50, 0.22)",
	},

	acceptButton: {
		position: "absolute",
		right: 16,
		bottom: 14,
		left: "auto",
		borderRadius: 4,
		textTransform: "none",
		fontWeight: 600,
		boxShadow: "none !important",
		backgroundColor: "#FF1919 !important",
		color: "#FFFFFF !important",
		"&:hover": {
			backgroundColor: "#E11414 !important",
			boxShadow: "none !important",
		},
	},

	selectCheckbox: {
		position: "absolute",
		top: 10,
		right: 10,
		zIndex: 2,
		color: "rgba(15, 23, 42, 0.28)",
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
		position: "absolute",
		marginRight: 5,
		right: 5,
		bottom: 5,
		background: theme.palette.background.default,
		color: theme.palette.text.primary,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
		padding: "3px 8px",
		borderRadius: 999,
		fontSize: "0.7rem",
		fontWeight: 600,
	},
	contactAvatar: {
		width: 46,
		height: 46,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
	},
	contactName: {
		fontWeight: 700,
		fontSize: "0.95rem",
		lineHeight: 1.2,
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
		marginTop: 6,
		alignItems: "center",
	},
	tagChip: {
		background: "rgba(229, 57, 53, 0.08)",
		color: theme.palette.text.primary,
		borderRadius: 999,
		padding: "4px 8px",
		fontSize: "0.7rem",
		whiteSpace: "nowrap",
		fontWeight: 600,
		border: "1px solid rgba(229, 57, 53, 0.10)",
	},
	tagButton: {
		padding: 6,
		marginLeft: 6,
		backgroundColor: theme.palette.background.default,
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
					<Checkbox
						className={classes.selectCheckbox}
						checked={selectedInBulk}
						onClick={e => e.stopPropagation()}
						onChange={() => onToggleSelect && onToggleSelect(ticket.id)}
					/>
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
				<ListItemText
					disableTypography
					primary={
						<span className={classes.contactNameWrapper}>
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
			</ListItem>
			<Divider variant="inset" component="li" style={{ marginLeft: 32, marginRight: 24, opacity: 0.45 }} />
		</React.Fragment>
	);
};

export default TicketListItem;
