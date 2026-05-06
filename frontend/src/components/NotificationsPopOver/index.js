import React, { useState, useRef, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { format } from "date-fns";
import openSocket from "../../services/socket-io";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import ChatIcon from "@material-ui/icons/Chat";

import TicketListItem from "../TicketListItem";
import { i18n } from "../../translate/i18n";
import useTickets from "../../hooks/useTickets";
import alertSound from "../../assets/sound.mp3";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	tabContainer: {
		overflowY: "auto",
		maxHeight: 350,
		...theme.scrollbarStyles,
	},
	popoverPaper: {
		width: "100%",
		maxWidth: 350,
		marginLeft: theme.spacing(2),
		marginRight: theme.spacing(1),
		[theme.breakpoints.down("sm")]: {
			maxWidth: 270,
		},
	},
	noShadow: {
		boxShadow: "none !important",
	},
	iconButton: {
		color: theme.palette.text.primary,
	},
}));

const NotificationsPopOver = () => {
	const classes = useStyles();

	const history = useHistory();
	const { user } = useContext(AuthContext);
	const ticketIdUrl = +history.location.pathname.split("/")[2];
	const ticketIdRef = useRef(ticketIdUrl);
	const anchorEl = useRef();
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
 	const notificationsRef = useRef([]);

	const [, setDesktopNotifications] = useState([]);

	const { tickets } = useTickets({ withUnreadMessages: "true" });
	const soundAlertRef = useRef();

	const historyRef = useRef(history);
	const userQueueIds = (user?.queues || []).map(queue => queue.id);
	const canShowAllTickets = user?.profile?.toUpperCase() === "ADMIN";

	const removeNotification = ticketId => {
		setNotifications(prevState => {
			const ticketIndex = prevState.findIndex(t => t.id === ticketId);
			if (ticketIndex !== -1) {
				prevState.splice(ticketIndex, 1);
				return [...prevState];
			}
			return prevState;
		});

		setDesktopNotifications(prevState => {
			const notificationIndex = prevState.findIndex(
				n => n.tag === String(ticketId)
			);
			if (notificationIndex !== -1) {
				prevState[notificationIndex].close();
				prevState.splice(notificationIndex, 1);
				return [...prevState];
			}
			return prevState;
		});
	};

	const handleTicketReminderNotification = ticket => {
		if (!ticket) {
			return;
		}

		const options = {
			body: ticket.lastMessage || i18n.t("dashboard.recent.noMessage"),
			icon: ticket.contact?.profilePicUrl,
			tag: String(ticket.id),
			renotify: true,
		};

		const notification = new Notification(
			`${i18n.t("tickets.notification.message")} ${ticket.contact?.name || ""}`.trim(),
			options
		);

		notification.onclick = e => {
			e.preventDefault();
			window.focus();
			historyRef.current.push(`/tickets/${ticket.id}`);
		};

		setDesktopNotifications(prevState => {
			const notificationIndex = prevState.findIndex(
				n => n.tag === notification.tag
			);

			if (notificationIndex !== -1) {
				prevState[notificationIndex].close();
				prevState[notificationIndex] = notification;
				return [...prevState];
			}

			return [notification, ...prevState];
		});

		soundAlertRef.current();
	};

	const canTrackTicket = ticket => {
		if (!ticket) {
			return false;
		}

		if (
			!canShowAllTickets &&
			ticket.queueId &&
			!userQueueIds.includes(ticket.queueId)
		) {
			return false;
		}

		if (canShowAllTickets) {
			return true;
		}

		return Number(ticket.userId) === Number(user?.id);
	};

	const syncNotification = ticket => {
		setNotifications(prevState => {
			const ticketIndex = prevState.findIndex(t => t.id === ticket.id);
			if (ticketIndex !== -1) {
				prevState[ticketIndex] = ticket;
				return [...prevState];
			}
			return [ticket, ...prevState];
		});
	};

	useEffect(() => {
		soundAlertRef.current = () => {
			try {
				const audio = new Audio(alertSound);
				void audio.play().catch(() => undefined);
			} catch (_err) {
				return undefined;
			}
		};

		if (!("Notification" in window)) {
			console.log("This browser doesn't support notifications");
		} else {
			Notification.requestPermission();
		}
	}, []);

	useEffect(() => {
		setNotifications(tickets);
	}, [tickets]);

	useEffect(() => {
		notificationsRef.current = notifications;
	}, [notifications]);

	useEffect(() => {
		ticketIdRef.current = ticketIdUrl;
	}, [ticketIdUrl]);

	useEffect(() => {
		const socket = openSocket();

		socket.on("connect", () => socket.emit("joinNotification"));

		socket.on("ticket", data => {
			if (data.action === "updateUnread" || data.action === "delete") {
				removeNotification(data.ticketId);
			}

			if (data.action === "update") {
				if (canTrackTicket(data.ticket) && Number(data.ticket.unreadMessages) > 0) {
						const previousTicket = notificationsRef.current.find(
							ticket => ticket.id === data.ticket.id
						);
						const wasUnread = Number(previousTicket?.unreadMessages) > 0;
					syncNotification(data.ticket);

						if (!wasUnread) {
							handleTicketReminderNotification(data.ticket);
						}
					return;
				}

				removeNotification(data.ticket.id);
			}
		});

		socket.on("appMessage", data => {
			if (data.action === "create" && !data.message.read && canTrackTicket(data.ticket)) {
				syncNotification(data.ticket);

				const shouldNotNotificate =
					(data.message.ticketId === ticketIdRef.current &&
						document.visibilityState === "visible") ||
					(!canShowAllTickets &&
						data.ticket.userId &&
						Number(data.ticket.userId) !== Number(user?.id)) ||
					data.ticket.isGroup;

				if (shouldNotNotificate) return;

				handleNotifications(data);
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [canShowAllTickets, user]);

	const handleNotifications = data => {
		const { message, contact, ticket } = data;

		const options = {
			body: `${message.body} - ${format(new Date(), "HH:mm")}`,
			icon: contact.profilePicUrl,
			tag: ticket.id,
			renotify: true,
		};

		const notification = new Notification(
			`${i18n.t("tickets.notification.message")} ${contact.name}`,
			options
		);

		notification.onclick = e => {
			e.preventDefault();
			window.focus();
			historyRef.current.push(`/tickets/${ticket.id}`);
		};

		setDesktopNotifications(prevState => {
			const notfiticationIndex = prevState.findIndex(
				n => n.tag === notification.tag
			);
			if (notfiticationIndex !== -1) {
				prevState[notfiticationIndex] = notification;
				return [...prevState];
			}
			return [notification, ...prevState];
		});

		soundAlertRef.current();
	};

	const handleClick = () => {
		setIsOpen(prevState => !prevState);
	};

	const handleClickAway = () => {
		setIsOpen(false);
	};

	const NotificationTicket = ({ children }) => {
		return <div onClick={handleClickAway}>{children}</div>;
	};

	return (
		<>
			<IconButton
				onClick={handleClick}
				ref={anchorEl}
				aria-label="Open Notifications"
				className={classes.iconButton}
			>
				<Badge badgeContent={notifications.length} color="secondary">
					<ChatIcon />
				</Badge>
			</IconButton>
			<Popover
				disableScrollLock
				open={isOpen}
				anchorEl={anchorEl.current}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				classes={{ paper: classes.popoverPaper }}
				onClose={handleClickAway}
			>
				<List dense className={classes.tabContainer}>
					{notifications.length === 0 ? (
						<ListItem>
							<ListItemText>{i18n.t("notifications.noTickets")}</ListItemText>
						</ListItem>
					) : (
						notifications.map(ticket => (
							<NotificationTicket key={ticket.id}>
								<TicketListItem ticket={ticket} />
							</NotificationTicket>
						))
					)}
				</List>
			</Popover>
		</>
	);
};

export default NotificationsPopOver;
