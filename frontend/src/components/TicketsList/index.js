import React, { useState, useEffect, useReducer, useContext } from "react";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Paper from "@material-ui/core/Paper";
import Checkbox from "@material-ui/core/Checkbox";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

import TicketListItem from "../TicketListItem";
import TicketsListSkeleton from "../TicketsListSkeleton";
import { Can } from "../Can";

import useTickets from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const FOLLOW_UP_TAG_NAME = "Follow up";

const useStyles = makeStyles(theme => ({
	ticketsListWrapper: {
		position: "relative",
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflow: "hidden",
		borderTopRightRadius: 0,
		borderBottomRightRadius: 0,
		[theme.breakpoints.down("sm")]: {
			backgroundColor: theme.palette.background.paper,
			borderRadius: 0,
			boxShadow: "none",
		},
	},

	ticketsList: {
		flex: 1,
		overflowY: "scroll",
		...theme.scrollbarStyles,
		borderTop: `1px solid ${theme.palette.divider}`,
		[theme.breakpoints.down("sm")]: {
			borderTop: 0,
			paddingBottom: theme.spacing(10),
		},
	},

	ticketsListHeader: {
		color: theme.palette.text.primary,
		zIndex: 2,
		backgroundColor: theme.palette.background.paper,
		borderBottom: `1px solid ${theme.palette.divider}`,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},

	ticketsCount: {
		fontWeight: "normal",
		color: theme.palette.text.secondary,
		marginLeft: "8px",
		fontSize: "14px",
	},

	noTicketsText: {
		textAlign: "center",
		color: theme.palette.text.secondary,
		fontSize: "15px",
		fontWeight: 300,
		lineHeight: 1.6,
	},

	noTicketsTitle: {
		textAlign: "center",
		color: theme.palette.text.primary,
		fontSize: "18px",
		fontWeight: 700,
		lineHeight: 1.25,
		margin: "0px",
	},

	noTicketsDiv: {
		display: "flex",
		height: "100px",
		margin: 40,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},

	pendingActionsBar: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		padding: theme.spacing(1, 1.25),
		borderBottom: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.paper,
		flexWrap: "wrap",
		[theme.breakpoints.down("sm")]: {
			position: "sticky",
			top: 0,
			zIndex: 3,
			padding: theme.spacing(0.85, 1),
			gap: theme.spacing(0.75),
		},
	},

	selectAllControl: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(0.5),
		fontSize: "0.85rem",
		color: theme.palette.text.secondary,
		fontWeight: 600,
	},

	pendingActions: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		flexWrap: "wrap",
	},

	bulkAcceptButton: {
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
		"&.Mui-disabled": {
			backgroundColor: "rgba(255, 25, 25, 0.18) !important",
			color: "rgba(255, 255, 255, 0.72) !important",
		},
		[theme.breakpoints.down("sm")]: {
			borderRadius: 999,
		},
	},

	bulkDeleteButton: {
		borderRadius: 4,
		textTransform: "none",
		fontWeight: 600,
		boxShadow: "none !important",
		backgroundColor: `${theme.custom.neutralButtonBackground} !important`,
		borderColor: `${theme.custom.panelBorderStrong} !important`,
		color: `${theme.custom.neutralButtonText} !important`,
		"&:hover": {
			backgroundColor: `${theme.custom.neutralButtonBackgroundHover} !important`,
			borderColor: `${theme.custom.panelBorderStrong} !important`,
			boxShadow: "none !important",
		},
		[theme.breakpoints.down("sm")]: {
			borderRadius: 999,
		},
	},

	selectAllCheckbox: {
		color: "rgba(15, 23, 42, 0.28)",
		"&.Mui-checked": {
			color: "#FF1919",
		},
		"&.MuiCheckbox-indeterminate": {
			color: "#FF1919",
		},
	},
}));

const reducer = (state, action) => {
	if (action.type === "LOAD_TICKETS") {
		const newTickets = action.payload;

		newTickets.forEach(ticket => {
			const ticketIndex = state.findIndex(t => t.id === ticket.id);
			if (ticketIndex !== -1) {
				state[ticketIndex] = ticket;
				if (ticket.unreadMessages > 0) {
					state.unshift(state.splice(ticketIndex, 1)[0]);
				}
			} else {
				state.push(ticket);
			}
		});

		return [...state];
	}

	if (action.type === "RESET_UNREAD") {
		const ticketId = action.payload;

		const ticketIndex = state.findIndex(t => t.id === ticketId);
		if (ticketIndex !== -1) {
			state[ticketIndex].unreadMessages = 0;
		}

		return [...state];
	}

	if (action.type === "UPDATE_TICKET") {
		const ticket = action.payload;

		const ticketIndex = state.findIndex(t => t.id === ticket.id);
		if (ticketIndex !== -1) {
			state[ticketIndex] = ticket;
		} else {
			state.unshift(ticket);
		}

		return [...state];
	}

	if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
		const ticket = action.payload;

		const ticketIndex = state.findIndex(t => t.id === ticket.id);
		if (ticketIndex !== -1) {
			state[ticketIndex] = ticket;
			state.unshift(state.splice(ticketIndex, 1)[0]);
		} else {
			state.unshift(ticket);
		}

		return [...state];
	}

	if (action.type === "UPDATE_TICKET_CONTACT") {
		const contact = action.payload;
		const ticketIndex = state.findIndex(t => t.contactId === contact.id);
		if (ticketIndex !== -1) {
			state[ticketIndex].contact = contact;
		}
		return [...state];
	}

	if (action.type === "DELETE_TICKET") {
		const ticketId = action.payload;
		const ticketIndex = state.findIndex(t => t.id === ticketId);
		if (ticketIndex !== -1) {
			state.splice(ticketIndex, 1);
		}

		return [...state];
	}

	if (action.type === "RESET") {
		return [];
	}
};

	const TicketsList = (props) => {
		const { status, searchParam, showAll, selectedQueueIds, selectedTagIds, updateCount, style, followUp } =
			props;
	const classes = useStyles();
	const [pageNumber, setPageNumber] = useState(1);
	const [ticketsList, dispatch] = useReducer(reducer, []);
	const { user } = useContext(AuthContext);
	const [selectedTicketIds, setSelectedTicketIds] = useState([]);
	const [bulkAccepting, setBulkAccepting] = useState(false);
	const [bulkDeleting, setBulkDeleting] = useState(false);
	const isPendingList = status === "pending";
	const permissions = user?.permissions || [];
	const isAdmin = user?.profile?.toLowerCase() === "admin";
	const canShowAllTickets = isAdmin && Boolean(showAll);
	const canBulkDelete =
		isAdmin ||
		permissions.includes("ticket-options:deleteTicket") ||
		permissions.includes("tickets.delete");

	useEffect(() => {
		dispatch({ type: "RESET" });
		setPageNumber(1);
		setSelectedTicketIds([]);
	}, [status, searchParam, dispatch, showAll, selectedQueueIds, selectedTagIds]);

	const { tickets, hasMore, loading } = useTickets({
		pageNumber,
		searchParam,
		status,
		showAll: canShowAllTickets,
		queueIds: JSON.stringify(selectedQueueIds),
		tagIds: JSON.stringify(selectedTagIds || []),
		followUp,
	});

	useEffect(() => {
		if (!status && !searchParam) return;
		dispatch({
			type: "LOAD_TICKETS",
			payload: tickets,
		});
	}, [tickets]);

	useEffect(() => {
		const socket = openSocket();
		const normalizedSearchParam = String(searchParam || "").trim().toLowerCase();

		const hasTagMatch = ticket => {
			if (!selectedTagIds || selectedTagIds.length === 0) return true;
			if (!ticket.tags || ticket.tags.length === 0) return false;
			return ticket.tags.some(tag => selectedTagIds.indexOf(tag.id) > -1);
		};

		const matchesSearchParam = ticket => {
			if (!normalizedSearchParam) {
				return true;
			}

			const searchableValues = [
				ticket.contact?.name,
				ticket.contact?.number,
				ticket.lastMessage,
				ticket.user?.name,
				ticket.queue?.name,
				String(ticket.id || "")
			].filter(Boolean);

			return searchableValues.some(value =>
				String(value).toLowerCase().includes(normalizedSearchParam)
			);
		};

		const hasFollowUpMatch = ticket => {
			if (followUp !== "true") return true;
			return ticket.tags?.some(tag => tag.name === FOLLOW_UP_TAG_NAME);
		};

		const canAccessTicketInCurrentList = ticket => {
			if (user?.whatsappId && Number(ticket.whatsappId) !== Number(user.whatsappId)) {
				return false;
			}

			if (canShowAllTickets) {
				return true;
			}

			if (Number(ticket.userId) === Number(user?.id)) {
				return true;
			}

			return false;
		};

		const shouldUpdateTicket = ticket =>
			matchesSearchParam(ticket) &&
			canAccessTicketInCurrentList(ticket) &&
			(!ticket.queueId || selectedQueueIds.indexOf(ticket.queueId) > -1) &&
			hasTagMatch(ticket) &&
			hasFollowUpMatch(ticket);

		const notBelongsToUserQueues = ticket =>
			ticket.queueId && selectedQueueIds.indexOf(ticket.queueId) === -1;

		const shouldRemoveFromFollowUp = ticket =>
			followUp === "true" && !hasFollowUpMatch(ticket);

		const shouldRemoveFromSearchResults = ticket =>
			Boolean(normalizedSearchParam) && !matchesSearchParam(ticket);

		socket.on("connect", () => {
			if (status) {
				socket.emit("joinTickets", {
					status,
					whatsappId: user?.whatsappId || null,
				});
			} else {
				socket.emit("joinNotification", {
					whatsappId: user?.whatsappId || null,
				});
			}
		});

		socket.on("ticket", data => {
			if (data.action === "updateUnread") {
				dispatch({
					type: "RESET_UNREAD",
					payload: data.ticketId,
				});
			}

			if (data.action === "update" && shouldUpdateTicket(data.ticket)) {
				dispatch({
					type: "UPDATE_TICKET",
					payload: data.ticket,
				});
			}

			if (data.action === "update" && notBelongsToUserQueues(data.ticket)) {
				dispatch({ type: "DELETE_TICKET", payload: data.ticket.id });
			}

				if (data.action === "update" && shouldRemoveFromSearchResults(data.ticket)) {
					dispatch({ type: "DELETE_TICKET", payload: data.ticket.id });
				}

			if (data.action === "update" && shouldRemoveFromFollowUp(data.ticket)) {
				dispatch({ type: "DELETE_TICKET", payload: data.ticket.id });
			}

			if (data.action === "delete") {
				dispatch({ type: "DELETE_TICKET", payload: data.ticketId });
			}
		});

		socket.on("appMessage", data => {
			if (data.action === "create" && shouldUpdateTicket(data.ticket)) {
				dispatch({
					type: "UPDATE_TICKET_UNREAD_MESSAGES",
					payload: data.ticket,
				});
			}
		});

		socket.on("contact", data => {
			if (data.action === "update") {
				dispatch({
					type: "UPDATE_TICKET_CONTACT",
					payload: data.contact,
				});
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [canShowAllTickets, followUp, status, searchParam, user, selectedQueueIds, selectedTagIds]);

	useEffect(() => {
    if (typeof updateCount === "function") {
			const nextCount = status === "open"
				? ticketsList.reduce(
					(total, ticket) => total + (Number(ticket.unreadMessages) > 0 ? 1 : 0),
					0
				)
				: ticketsList.length;

			updateCount(nextCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, ticketsList]);

	const loadMore = () => {
		setPageNumber(prevState => prevState + 1);
	};

	const handleToggleTicketSelection = ticketId => {
		setSelectedTicketIds(prevState =>
			prevState.includes(ticketId)
				? prevState.filter(id => id !== ticketId)
				: [...prevState, ticketId]
		);
	};

	const handleToggleSelectAll = () => {
		if (selectedTicketIds.length === ticketsList.length) {
			setSelectedTicketIds([]);
			return;
		}

		setSelectedTicketIds(ticketsList.map(ticket => ticket.id));
	};

	const handleBulkAccept = async () => {
		if (selectedTicketIds.length === 0) return;

		setBulkAccepting(true);
		try {
			await Promise.all(
				selectedTicketIds.map(ticketId =>
					api.put(`/tickets/${ticketId}`, {
						status: "open",
						userId: user?.id,
					})
				)
			);

			selectedTicketIds.forEach(ticketId => {
				dispatch({ type: "DELETE_TICKET", payload: ticketId });
			});
			setSelectedTicketIds([]);
		} catch (err) {
			toastError(err);
		} finally {
			setBulkAccepting(false);
		}
	};

	const handleBulkDelete = async () => {
		if (selectedTicketIds.length === 0) return;

		setBulkDeleting(true);
		try {
			await Promise.all(
				selectedTicketIds.map(ticketId => api.delete(`/tickets/${ticketId}`))
			);

			selectedTicketIds.forEach(ticketId => {
				dispatch({ type: "DELETE_TICKET", payload: ticketId });
			});
			setSelectedTicketIds([]);
		} catch (err) {
			toastError(err);
		} finally {
			setBulkDeleting(false);
		}
	};

	const handleScroll = e => {
		if (!hasMore || loading) return;

		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

		if (scrollHeight - (scrollTop + 100) < clientHeight) {
			e.currentTarget.scrollTop = scrollTop - 100;
			loadMore();
		}
	};

	return (
    <Paper className={classes.ticketsListWrapper} style={style}>
			{isPendingList && ticketsList.length > 0 && (
				<div className={classes.pendingActionsBar}>
					<label className={classes.selectAllControl}>
						<Checkbox
							className={classes.selectAllCheckbox}
							checked={selectedTicketIds.length > 0 && selectedTicketIds.length === ticketsList.length}
							indeterminate={selectedTicketIds.length > 0 && selectedTicketIds.length < ticketsList.length}
							onChange={handleToggleSelectAll}
						/>
						<Typography variant="body2" component="span">
							{i18n.t("ticketsList.buttons.selectAll")}
						</Typography>
					</label>
					{selectedTicketIds.length > 0 && (
						<div className={classes.pendingActions}>
						<Button
							variant="contained"
							className={classes.bulkAcceptButton}
							disabled={selectedTicketIds.length === 0 || bulkAccepting || bulkDeleting}
							onClick={handleBulkAccept}
						>
							{i18n.t("ticketsList.buttons.acceptSelected")}
						</Button>
						{canBulkDelete && (
								<Button
									variant="outlined"
									className={classes.bulkDeleteButton}
									disabled={selectedTicketIds.length === 0 || bulkAccepting || bulkDeleting}
									onClick={handleBulkDelete}
								>
									{i18n.t("ticketsList.buttons.deleteSelected")}
								</Button>
						)}
						</div>
					)}
				</div>
			)}
			<Paper
				square
				name="closed"
				elevation={0}
				className={classes.ticketsList}
				onScroll={handleScroll}
			>
				<List style={{ paddingTop: 0 }}>
					{ticketsList.length === 0 && !loading ? (
						<div className={classes.noTicketsDiv}>
							<span className={classes.noTicketsTitle}>
								{i18n.t("ticketsList.noTicketsTitle")}
							</span>
							<p className={classes.noTicketsText}>
								{i18n.t("ticketsList.noTicketsMessage")}
							</p>
						</div>
					) : (
						<>
							{ticketsList.map(ticket => (
								<TicketListItem
									ticket={ticket}
									key={ticket.id}
									selectable={isPendingList}
									selectedInBulk={selectedTicketIds.includes(ticket.id)}
									onToggleSelect={handleToggleTicketSelection}
								/>
							))}
						</>
					)}
					{loading && <TicketsListSkeleton />}
				</List>
			</Paper>
    </Paper>
	);
};

export default TicketsList;
