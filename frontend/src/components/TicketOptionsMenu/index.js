import React, { useContext, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";
import { makeStyles } from "@material-ui/core/styles";
import SwapHorizIcon from "@material-ui/icons/SwapHoriz";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import MarkunreadOutlinedIcon from "@material-ui/icons/MarkunreadOutlined";
import EventNoteOutlinedIcon from "@material-ui/icons/EventNoteOutlined";
import AssignmentTurnedInOutlinedIcon from "@material-ui/icons/AssignmentTurnedInOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import ReplayIcon from "@material-ui/icons/Replay";
import MergeTypeIcon from "@material-ui/icons/MergeType";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TransferTicketModal from "../TransferTicketModal";
import ScheduleModal from "../ScheduleModal";
import TaskModal from "../TaskModal";
import MergeContactModal from "../MergeContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { userHasPermission } from "../../utils/permissions";

const useStyles = makeStyles(theme => ({
        menuPaper: {
                borderRadius: 14,
                minWidth: 220,
        },
        menuItem: {
                display: "flex",
                alignItems: "center",
                gap: theme.spacing(1.25),
                padding: theme.spacing(1, 1.5),
                minHeight: 42,
        },
        menuIcon: {
                color: theme.palette.text.secondary,
                fontSize: "1.15rem",
                flex: "none",
        },
        menuLabel: {
                fontSize: "0.95rem",
                lineHeight: 1.2,
                color: theme.palette.text.primary,
        },
}));

const TicketOptionsMenu = ({
        ticket,
        contactId,
        contactName,
        menuOpen,
        handleClose,
        anchorEl
}) => {
        const classes = useStyles();
        const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
        const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
        const [taskModalOpen, setTaskModalOpen] = useState(false);
        const [mergeContactModalOpen, setMergeContactModalOpen] = useState(false);
        const [loading, setLoading] = useState(false);
        const isMounted = useRef(true);
        const { user } = useContext(AuthContext);
        const history = useHistory();
        const canCreateSchedules = userHasPermission(user, "schedules.create");
        const canCreateTasks = userHasPermission(user, "tasks.create");

        useEffect(() => {
                return () => {
                        isMounted.current = false;
                };
        }, []);

        const handleUpdateTicket = async payload => {
                handleClose();
                setLoading(true);

                try {
                        const { data: updatedTicket } = await api.put(`/tickets/${ticket.id}`, payload);

                        if (payload.status === "open") {
                                window.dispatchEvent(
                                        new CustomEvent("samachat:ticket-updated", {
                                                detail: { ticket: updatedTicket }
                                        })
                                );

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

        const handleOpenTransferModal = () => {
                if (loading) {
                        return;
                }

                setTransferTicketModalOpen(true);
                handleClose();
        };

        const handleMarkAsResolved = () => {
                handleUpdateTicket({
                        status: "closed",
                        userId: ticket.userId || user?.id || null,
                        suppressFarewell: true,
                });
        };

        const handleMarkAsLost = () => {
                handleUpdateTicket({
                        status: "lost",
                        userId: ticket.userId || user?.id || null,
                        suppressFarewell: true,
                });
        };

        const handleReopen = () => {
                if (ticket.status === "closed" || ticket.status === "lost") {
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
                        const { data } = await api.put(`/tickets/${ticket.id}/unread`);
                        window.dispatchEvent(
                                new CustomEvent("samachat:ticket-updated", {
                                        detail: { ticket: data }
                                })
                        );
                        history.push("/tickets");
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

        const handleOpenTaskModal = () => {
                if (loading || !ticket?.id) {
                        return;
                }

                handleClose();
                setTaskModalOpen(true);
        };

        const handleCloseTaskModal = () => {
                if (isMounted.current) {
                        setTaskModalOpen(false);
                }
        };

        const handleOpenMergeContactModal = () => {
                if (loading || !ticket?.contactId) {
                        return;
                }

                handleClose();
                setMergeContactModalOpen(true);
        };

        const handleCloseMergeContactModal = () => {
                if (isMounted.current) {
                        setMergeContactModalOpen(false);
                }
        };

        const handleContactMerged = () => {
                window.dispatchEvent(
                        new CustomEvent("samachat:ticket-updated", {
                                detail: { ticket }
                        })
                );
        };

        const renderMenuItem = (IconComponent, label, onClick) => (
                <MenuItem onClick={onClick} disabled={loading} className={classes.menuItem}>
                        <IconComponent className={classes.menuIcon} />
                        <span className={classes.menuLabel}>{label}</span>
                </MenuItem>
        );

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
                                classes={{ paper: classes.menuPaper }}
                        >
                                {renderMenuItem(
                                        SwapHorizIcon,
                                        i18n.t("ticketOptionsMenu.transfer"),
                                        handleOpenTransferModal
                                )}
                                {ticket.status === "open" && (
                                        renderMenuItem(
                                                CheckCircleOutlineIcon,
                                                i18n.t("ticketOptionsMenu.markAsResolved"),
                                                handleMarkAsResolved
                                        )
                                )}
                                {["open", "pending"].includes(ticket.status) && (
                                        renderMenuItem(
                                                HighlightOffIcon,
                                                i18n.t("ticketOptionsMenu.markAsLost"),
                                                handleMarkAsLost
                                        )
                                )}
                                {["open", "pending"].includes(ticket.status) && (
                                        renderMenuItem(
                                                MarkunreadOutlinedIcon,
                                                i18n.t("ticketOptionsMenu.markAsUnread"),
                                                handleMarkAsUnread
                                        )
                                )}
                                {renderMenuItem(
                                        MergeTypeIcon,
                                        "Mesclar contato duplicado",
                                        handleOpenMergeContactModal
                                )}
                                {canCreateTasks && ticket?.id && (
                                        renderMenuItem(
                                                AssignmentTurnedInOutlinedIcon,
                                                "Criar tarefa",
                                                handleOpenTaskModal
                                        )
                                )}
                                {canCreateSchedules && ticket?.id && (
                                        renderMenuItem(
                                                EventNoteOutlinedIcon,
                                                i18n.t("ticketOptionsMenu.scheduleMessage"),
                                                handleOpenScheduleModal
                                        )
                                )}
                                {ticket.status !== "pending" && (
                                        renderMenuItem(
                                                ReplayIcon,
                                                i18n.t("ticketOptionsMenu.reopen"),
                                                handleReopen
                                        )
                                )}
                        </Menu>
                        <TransferTicketModal
                                modalOpen={transferTicketModalOpen}
                                onClose={handleCloseTransferTicketModal}
                                ticketid={ticket.id}
                                ticketWhatsappId={ticket.whatsappId}
                        />
                        <MergeContactModal
                                open={mergeContactModalOpen}
                                onClose={handleCloseMergeContactModal}
                                targetContactId={contactId || ticket?.contactId || ticket?.contact?.id}
                                targetContactName={contactName || ticket?.contact?.name}
                                targetContactNumber={ticket?.contact?.number}
                                targetAllowMultipleConversations={ticket?.contact?.allowMultipleConversations}
                                targetUserId={ticket?.userId}
                                onMerged={handleContactMerged}
                        />
                        <TaskModal
                                open={taskModalOpen}
                                onClose={handleCloseTaskModal}
                                initialValues={{
                                        assigneeId: ticket?.userId || user?.id || "",
                                        ticketId: ticket?.id || "",
                                        contactId: contactId || ticket?.contactId || ticket?.contact?.id || ""
                                }}
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
