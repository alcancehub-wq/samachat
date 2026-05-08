import React, { useContext, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TransferTicketModal from "../TransferTicketModal";
import ScheduleModal from "../ScheduleModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { userHasPermission } from "../../utils/permissions";

const TicketOptionsMenu = ({
	ticket,
	contactId,
	contactName,
	menuOpen,
	handleClose,
	anchorEl
}) => {
	const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
	const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);
	const history = useHistory();
	const canCreateSchedules = userHasPermission(user, "schedules.create");

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleUpdateTicket = async payload => {
		handleClose();
		setLoading(true);

		try {
			await api.put(`/tickets/${ticket.id}`, payload);

			if (payload.status === "open") {
				history.push(`/tickets/${ticket.id}`);
			} else {
				history.push("/tickets");
			}
		} catch (err) {
			toastError(err);
		} finally {
			if (isMounted.current) {
				setLoading(false);
			}
		}
	};

	const handleOpenTransferModal = e => {
		if (loading) {
			return;
		}

		setTransferTicketModalOpen(true);
		handleClose();
	};

	const handleMoveToFollowUp = () => {
		handleUpdateTicket({
			status: "closed",
			userId: ticket.userId || user?.id || null,
			followUp: true,
		});
	};

	const handleReopen = () => {
		if (ticket.status === "closed") {
			handleUpdateTicket({
				status: "open",
				userId: user?.id,
				followUp: false,
			});
			return;
		}

		handleUpdateTicket({
			status: "pending",
			userId: null,
			followUp: false,
		});
	};

	const handleCloseTransferTicketModal = () => {
		if (isMounted.current) {
			setTransferTicketModalOpen(false);
		}
	};

	const handleMarkAsUnread = async () => {
		handleClose();
		setLoading(true);

		try {
			await api.put(`/tickets/${ticket.id}/unread`);
		} catch (err) {
			toastError(err);
		} finally {
			if (isMounted.current) {
				setLoading(false);
			}
		}
	};

	const handleOpenScheduleModal = () => {
		if (loading || !ticket?.id) {
			return;
		}

		handleClose();
		setScheduleModalOpen(true);
	};

	const handleCloseScheduleModal = () => {
		if (isMounted.current) {
			setScheduleModalOpen(false);
		}
	};

	return (
		<>
			<Menu
				id="menu-appbar"
				anchorEl={anchorEl}
				getContentAnchorEl={null}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={menuOpen}
				onClose={handleClose}
			>
				<MenuItem onClick={handleOpenTransferModal} disabled={loading}>
					{i18n.t("ticketOptionsMenu.transfer")}
				</MenuItem>
				{ticket.status === "open" && (
					<MenuItem onClick={handleMoveToFollowUp} disabled={loading}>
						{i18n.t("ticketOptionsMenu.followUp")}
					</MenuItem>
				)}
				{ticket.unreadMessages === 0 && (
					<MenuItem onClick={handleMarkAsUnread} disabled={loading}>
						{i18n.t("ticketOptionsMenu.markAsUnread")}
					</MenuItem>
				)}
				{canCreateSchedules && ticket?.id && (
					<MenuItem onClick={handleOpenScheduleModal} disabled={loading}>
						{i18n.t("ticketOptionsMenu.scheduleMessage")}
					</MenuItem>
				)}
				{ticket.status !== "pending" && (
					<MenuItem onClick={handleReopen} disabled={loading}>
						{i18n.t("ticketOptionsMenu.reopen")}
					</MenuItem>
				)}
			</Menu>
			<TransferTicketModal
				modalOpen={transferTicketModalOpen}
				onClose={handleCloseTransferTicketModal}
				ticketid={ticket.id}
				ticketWhatsappId={ticket.whatsappId}
			/>
			<ScheduleModal
				open={scheduleModalOpen}
				onClose={handleCloseScheduleModal}
				initialValues={{
					assigneeId: ticket?.userId || "",
					ticketId: ticket?.id || "",
					contactId: contactId || ticket?.contactId || ticket?.contact?.id || "",
					contactName: contactName || ticket?.contact?.name || "",
					ticketLabel: contactName || ticket?.contact?.name || ""
				}}
				lockContextIds
				hideStatusField
			/>
		</>
	);
};

export default TicketOptionsMenu;
