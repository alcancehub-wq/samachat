import React, { useState, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
	Button,
	TableBody,
	TableRow,
	TableCell,
	IconButton,
	Table,
	TableHead,
	Paper,
	Tooltip,
	Typography,
	CircularProgress,
} from "@material-ui/core";
import {
	Edit,
	CheckCircle,
	SignalCellularConnectedNoInternet2Bar,
	SignalCellularConnectedNoInternet0Bar,
	SignalCellular4Bar,
	CropFree,
	DeleteOutline,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1.25, 1, 0),
		overflowY: "scroll",
		...theme.scrollbarStyles,
		borderRadius: 16,
		border: `1px solid ${theme.custom.panelBorder}`,
		boxShadow: "none",
		backgroundColor: theme.palette.background.paper,
		backgroundImage: theme.custom.panelGradient,
	},
	headerTitle: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		gap: theme.spacing(0.5),
	},
	pageSubtitle: {
		color: theme.palette.text.secondary,
		fontSize: "0.9375rem",
		fontWeight: 300,
		lineHeight: 1.6,
	},
	primaryAction: {
		borderRadius: 4,
		textTransform: "none",
		fontWeight: 500,
		boxShadow: "none",
		backgroundImage: "none",
		backgroundColor: "#FF1919",
		color: "#FFFFFF",
		"&:hover": {
			backgroundColor: "#E11414",
			boxShadow: "none",
		},
	},
	statusPill: {
		minWidth: 42,
		height: 32,
		borderRadius: 999,
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: theme.custom.softBackground,
	},
	actionGroup: {
		display: "flex",
		gap: theme.spacing(1),
		flexWrap: "wrap",
		justifyContent: "center",
	},
	actionButton: {
		borderRadius: 10,
		textTransform: "none",
		fontWeight: 600,
		boxShadow: "none",
		borderColor: theme.custom.panelBorderStrong,
	},
	actionIconButton: {
		backgroundColor: theme.custom.iconButtonBackground,
		marginLeft: theme.spacing(0.5),
		borderRadius: 10,
		color: theme.palette.text.secondary,
	},
	table: {
		borderCollapse: "separate",
		borderSpacing: "0 8px",
	},
	tableHeadCell: {
		color: theme.palette.text.primary,
		fontWeight: 700,
		fontSize: "0.78rem",
		textTransform: "uppercase",
		letterSpacing: 1.1,
		borderBottom: "none",
	},
	tableRow: {
		backgroundColor: theme.palette.background.paper,
		boxShadow: "none",
		borderRadius: 12,
		"& > td": {
			borderBottom: "none",
		},
		"& td:first-child": {
			borderTopLeftRadius: 12,
			borderBottomLeftRadius: 12,
		},
		"& td:last-child": {
			borderTopRightRadius: 12,
			borderBottomRightRadius: 12,
		},
		"&:hover": {
			backgroundColor: theme.custom.tableHover,
		},
	},
	tableCell: {
		paddingTop: theme.spacing(1.25),
		paddingBottom: theme.spacing(1.25),
	},
	customTableCell: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	tooltip: {
		backgroundColor: theme.palette.background.paper,
		color: theme.palette.text.primary,
		fontSize: theme.typography.pxToRem(14),
		border: `1px solid ${theme.palette.divider}`,
		maxWidth: 450,
	},
	tooltipPopper: {
		textAlign: "center",
	},
	buttonProgress: {
		color: green[500],
	},
}));

const CustomToolTip = ({ title, content, children }) => {
	const classes = useStyles();

	return (
		<Tooltip
			arrow
			classes={{
				tooltip: classes.tooltip,
				popper: classes.tooltipPopper,
			}}
			title={
				<React.Fragment>
					<Typography gutterBottom color="inherit">
						{title}
					</Typography>
					{content && <Typography>{content}</Typography>}
				</React.Fragment>
			}
		>
			{children}
		</Tooltip>
	);
};

const Connections = () => {
	const classes = useStyles();

	const { whatsApps, loading, reload } = useContext(WhatsAppsContext);
	const { user } = useContext(AuthContext);
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const [restartingIds, setRestartingIds] = useState({});
	const confirmationModalInitialState = {
		action: "",
		title: "",
		message: "",
		whatsAppId: "",
		open: false,
	};
	const [confirmModalInfo, setConfirmModalInfo] = useState(
		confirmationModalInitialState
	);
	const permissions = user?.permissions || [];
	const isAdmin = user?.profile?.toLowerCase() === "admin";
	const hasPermission = permission => isAdmin || permissions.includes(permission);
	const canCreateConnection = hasPermission("connections.create");
	const canEditConnection = hasPermission("connections.update");
	const canDeleteConnection = hasPermission("connections.delete");
	const canManageSession = hasPermission("connections.session.manage");
	const canManageOwnSession = whatsApp => {
		const ownWhatsAppId = Number(user?.whatsappId || user?.whatsapp?.id);
		const isOwnByAuthPayload =
			!Number.isNaN(ownWhatsAppId) && ownWhatsAppId === Number(whatsApp.id);
		const isOwnByLinkedUsers = Array.isArray(whatsApp.users)
			? whatsApp.users.some(linkedUser => Number(linkedUser?.id) === Number(user?.id))
			: false;

		return isOwnByAuthPayload || isOwnByLinkedUsers;
	};

	const handleStartWhatsAppSession = async whatsAppId => {
		try {
			await api.post(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleRestartWhatsAppSession = async whatsAppId => {
		try {
			setRestartingIds(prev => ({ ...prev, [whatsAppId]: true }));
			await api.post(`/whatsapp/${whatsAppId}/restart`);
			if (reload) {
				reload();
			}
			toast.success(i18n.t("connections.toasts.restarted"));
		} catch (err) {
			toastError(err);
		} finally {
			setRestartingIds(prev => {
				const next = { ...prev };
				delete next[whatsAppId];
				return next;
			});
		}
	};

	const handleRequestNewQrCode = async whatsAppId => {
		try {
			await api.put(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, [setSelectedWhatsApp, setWhatsAppModalOpen]);

	const handleOpenQrModal = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setQrModalOpen(true);
	};

	const handleCloseQrModal = useCallback(() => {
		setSelectedWhatsApp(null);
		setQrModalOpen(false);
	}, [setQrModalOpen, setSelectedWhatsApp]);

	const handleEditWhatsApp = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setWhatsAppModalOpen(true);
	};

	const handleOpenConfirmationModal = (action, whatsAppId) => {
		if (action === "disconnect") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.disconnectTitle"),
				message: i18n.t("connections.confirmationModal.disconnectMessage"),
				whatsAppId: whatsAppId,
			});
		}

		if (action === "delete") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.deleteTitle"),
				message: i18n.t("connections.confirmationModal.deleteMessage"),
				whatsAppId: whatsAppId,
			});
		}
		setConfirmModalOpen(true);
	};

	const handleSubmitConfirmationModal = async () => {
		if (confirmModalInfo.action === "disconnect") {
			try {
				await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
			} catch (err) {
				toastError(err);
			}
		}

		if (confirmModalInfo.action === "delete") {
			try {
				await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
				toast.success(i18n.t("connections.toasts.deleted"));
			} catch (err) {
				toastError(err);
			}
		}

		setConfirmModalInfo(confirmationModalInitialState);
	};

	const renderActionButtons = whatsApp => {
		const isRestarting = Boolean(restartingIds[whatsApp.id]);
		const hasQrCode = Boolean(whatsApp.qrcode);

		if (!canManageSession && !canManageOwnSession(whatsApp)) {
			return null;
		}

		return (
			<>
				<Button
					size="small"
					variant="outlined"
					color="primary"
					className={classes.actionButton}
					disabled={isRestarting}
					startIcon={
						isRestarting ? <CircularProgress size={14} /> : undefined
					}
					onClick={() => handleRestartWhatsAppSession(whatsApp.id)}
				>
					{i18n.t(
						isRestarting
							? "connections.buttons.reconnecting"
							: "connections.buttons.reconnect"
					)}
				</Button>
				{hasQrCode && (
					<Button
						size="small"
						variant="contained"
						color="primary"
						className={classes.actionButton}
						onClick={() => handleOpenQrModal(whatsApp)}
					>
						{i18n.t("connections.buttons.qrcode")}
					</Button>
				)}
				{whatsApp.status === "DISCONNECTED" && (
					<>
						<Button
							size="small"
							variant="outlined"
							color="primary"
							className={classes.actionButton}
							onClick={() => handleStartWhatsAppSession(whatsApp.id)}
						>
							{i18n.t("connections.buttons.tryAgain")}
						</Button>{" "}
						<Button
							size="small"
							variant="outlined"
							color="secondary"
							className={classes.actionButton}
							onClick={() => handleRequestNewQrCode(whatsApp.id)}
						>
							{i18n.t("connections.buttons.newQr")}
						</Button>
					</>
				)}
				{(whatsApp.status === "CONNECTED" ||
					whatsApp.status === "PAIRING" ||
					whatsApp.status === "TIMEOUT") && (
					<Button
						size="small"
						variant="outlined"
						color="secondary"
						className={classes.actionButton}
						onClick={() => {
							handleOpenConfirmationModal("disconnect", whatsApp.id);
						}}
					>
						{i18n.t("connections.buttons.disconnect")}
					</Button>
				)}
				{whatsApp.status === "OPENING" && !hasQrCode && (
					<Button
						size="small"
						variant="outlined"
						disabled
						color="default"
						className={classes.actionButton}
					>
						{i18n.t("connections.buttons.connecting")}
					</Button>
				)}
			</>
		);
	};

	const renderStatusToolTips = whatsApp => {
		const hasQrCode = Boolean(whatsApp.qrcode);

		return (
			<div className={`${classes.customTableCell} ${classes.statusPill}`}>
				{whatsApp.status === "DISCONNECTED" && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.disconnected.title")}
						content={i18n.t("connections.toolTips.disconnected.content")}
					>
						<SignalCellularConnectedNoInternet0Bar color="secondary" />
					</CustomToolTip>
				)}
				{whatsApp.status === "OPENING" && !hasQrCode && (
					<CircularProgress size={20} className={classes.buttonProgress} />
				)}
				{(whatsApp.status === "qrcode" || hasQrCode) && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.qrcode.title")}
						content={i18n.t("connections.toolTips.qrcode.content")}
					>
						<CropFree />
					</CustomToolTip>
				)}
				{whatsApp.status === "CONNECTED" && (
					<CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
						<SignalCellular4Bar style={{ color: green[500] }} />
					</CustomToolTip>
				)}
				{(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.timeout.title")}
						content={i18n.t("connections.toolTips.timeout.content")}
					>
						<SignalCellularConnectedNoInternet2Bar color="secondary" />
					</CustomToolTip>
				)}
			</div>
		);
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={confirmModalInfo.title}
				open={confirmModalOpen}
				onClose={setConfirmModalOpen}
				onConfirm={handleSubmitConfirmationModal}
			>
				{confirmModalInfo.message}
			</ConfirmationModal>
			<QrcodeModal
				open={qrModalOpen}
				onClose={handleCloseQrModal}
				whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
			/>
			<WhatsAppModal
				open={whatsAppModalOpen}
				onClose={handleCloseWhatsAppModal}
				whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
			/>
			<MainHeader>
				<div className={classes.headerTitle}>
					<Title>{i18n.t("connections.title")}</Title>
					<Typography className={classes.pageSubtitle}>
						{i18n.t("connections.subtitle")}
					</Typography>
				</div>
				<MainHeaderButtonsWrapper>
					{canCreateConnection && (
						<Button
							variant="contained"
							color="primary"
							className={classes.primaryAction}
							onClick={handleOpenWhatsAppModal}
						>
							{i18n.t("connections.buttons.add")}
						</Button>
					)}
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} variant="outlined">
				<Table size="small" className={classes.table}>
					<TableHead>
						<TableRow>
							<TableCell align="center" className={classes.tableHeadCell}>
								{i18n.t("connections.table.name")}
							</TableCell>
							<TableCell align="center" className={classes.tableHeadCell}>
								{i18n.t("connections.table.connectedNumber")}
							</TableCell>
							<TableCell align="center" className={classes.tableHeadCell}>
								{i18n.t("connections.table.status")}
							</TableCell>
							<TableCell align="center" className={classes.tableHeadCell}>
								{i18n.t("connections.table.session")}
							</TableCell>
							<TableCell align="center" className={classes.tableHeadCell}>
								{i18n.t("connections.table.lastUpdate")}
							</TableCell>
							<TableCell align="center" className={classes.tableHeadCell}>
								{i18n.t("connections.table.default")}
							</TableCell>
							<TableCell align="center" className={classes.tableHeadCell}>
								{i18n.t("connections.table.actions")}
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRowSkeleton />
						) : (
							<>
								{whatsApps?.length > 0 &&
									whatsApps.map(whatsApp => (
										<TableRow key={whatsApp.id} className={classes.tableRow}>
											<TableCell align="center" className={classes.tableCell}>
												{whatsApp.name}
											</TableCell>
											<TableCell align="center" className={classes.tableCell}>
												{whatsApp.phoneNumber || "-"}
											</TableCell>
											<TableCell align="center" className={classes.tableCell}>
												{renderStatusToolTips(whatsApp)}
											</TableCell>
											<TableCell align="center" className={classes.tableCell}>
												<div className={classes.actionGroup}>
													{renderActionButtons(whatsApp)}
												</div>
											</TableCell>
											<TableCell align="center" className={classes.tableCell}>
												{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}
											</TableCell>
											<TableCell align="center" className={classes.tableCell}>
												{whatsApp.isDefault && (
													<div className={classes.customTableCell}>
														<CheckCircle style={{ color: green[500] }} />
													</div>
												)}
											</TableCell>
											<TableCell align="center" className={classes.tableCell}>
												{canEditConnection && (
													<IconButton
														size="small"
														className={classes.actionIconButton}
														onClick={() => handleEditWhatsApp(whatsApp)}
													>
														<Edit />
													</IconButton>
												)}

												{canDeleteConnection && (
													<IconButton
														size="small"
														className={classes.actionIconButton}
														onClick={e => {
															handleOpenConfirmationModal("delete", whatsApp.id);
														}}
													>
														<DeleteOutline />
													</IconButton>
												)}
											</TableCell>
										</TableRow>
									))}
							</>
						)}
					</TableBody>
				</Table>
			</Paper>
		</MainContainer>
	);
};

export default Connections;
