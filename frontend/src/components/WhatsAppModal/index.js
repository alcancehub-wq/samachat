import React, { useState, useEffect, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import {
	Dialog,
	DialogContent,
	DialogTitle,
	Button,
	DialogActions,
	CircularProgress,
	TextField,
	Switch,
	FormControlLabel,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormHelperText,
} from "@material-ui/core";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import { AuthContext } from "../../context/Auth/AuthContext";
import { userHasPermission } from "../../utils/permissions";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},

	multFieldLine: {
		display: "flex",
		"& > *:not(:last-child)": {
			marginRight: theme.spacing(1),
		},
	},

	btnWrapper: {
		position: "relative",
	},

	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},

	signatureSection: {
		marginTop: theme.spacing(2),
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1),
	},

	signatureHelper: {
		marginTop: 0,
	},

	cloudApiSection: {
		marginTop: theme.spacing(2),
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1),
	},
}));

const SessionSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
});

const INITIAL_STATE = {
	name: "",
	greetingMessage: "",
	farewellMessage: "",
	isDefault: false,
	linkedUserId: "",
	providerType: "web",
	wabaId: "",
	phoneNumberId: "",
	businessAccountId: "",
	accessToken: "",
	verifyToken: "",
	appSecret: "",
	apiVersion: "v20.0",
};

const WhatsAppModal = ({ open, onClose, whatsAppId }) => {
	const classes = useStyles();
	const [whatsApp, setWhatsApp] = useState(INITIAL_STATE);
	const [selectedQueueIds, setSelectedQueueIds] = useState([]);
	const [availableUsers, setAvailableUsers] = useState([]);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const { user } = useContext(AuthContext);
	const canManageLinkedUserSignature = userHasPermission(user, "users.view");

	useEffect(() => {
		const fetchSession = async () => {
			if (!open || !whatsAppId) return;

			try {
				const { data } = await api.get(`whatsapp/${whatsAppId}`);
				const linkedUser =
					Array.isArray(data.users) && data.users.length === 1 ? data.users[0] : null;

				setWhatsApp({
					...INITIAL_STATE,
					...data,
					linkedUserId: linkedUser?.id || "",
					providerType: data.providerType || "web",
					wabaId: data.wabaId || "",
					phoneNumberId: data.phoneNumberId || "",
					businessAccountId: data.businessAccountId || "",
					accessToken: data.accessToken || "",
					verifyToken: data.verifyToken || "",
					appSecret: data.appSecret || "",
					apiVersion: data.apiVersion || "v20.0",
				});

				const whatsQueueIds = data.queues?.map(queue => queue.id);
				setSelectedQueueIds(whatsQueueIds);
			} catch (err) {
				toastError(err);
			}
		};

		if (open && !whatsAppId) {
			setWhatsApp(INITIAL_STATE);
			setSelectedQueueIds([]);
		}

		fetchSession();
	}, [open, whatsAppId]);

	useEffect(() => {
		let isMounted = true;

		const loadUsers = async () => {
			if (!open || !canManageLinkedUserSignature) {
				setAvailableUsers([]);
				return;
			}

			setLoadingUsers(true);

			try {
				let pageNumber = 1;
				let hasMore = true;
				const nextUsers = [];

				while (hasMore) {
					const { data } = await api.get("/users", {
						params: { searchParam: "", pageNumber },
					});

					nextUsers.push(...(Array.isArray(data.users) ? data.users : []));
					hasMore = Boolean(data.hasMore);
					pageNumber += 1;
				}

				if (isMounted) {
					const uniqueUsers = nextUsers.filter(
						(candidate, index, array) =>
							array.findIndex(userItem => userItem.id === candidate.id) === index
					);
					setAvailableUsers(uniqueUsers);
				}
			} catch (err) {
				if (isMounted) {
					toastError(err);
				}
			} finally {
				if (isMounted) {
					setLoadingUsers(false);
				}
			}
		};

		loadUsers();

		return () => {
			isMounted = false;
		};
	}, [canManageLinkedUserSignature, open]);

	const handleSaveWhatsApp = async values => {
		const whatsappData = {
			...values,
			providerType: values.providerType || "web",
			queueIds: selectedQueueIds,
			linkedUserId: values.linkedUserId ? Number(values.linkedUserId) : null,
		};

		try {
			if (whatsAppId) {
				await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
			} else {
				await api.post("/whatsapp", whatsappData);
			}
			toast.success(i18n.t("whatsappModal.success"));
			handleClose();
		} catch (err) {
			toastError(err);
		}
	};

	const handleClose = () => {
		onClose();
		setWhatsApp(INITIAL_STATE);
		setSelectedQueueIds([]);
	};

	return (
		<div className={classes.root}>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="sm"
				fullWidth
				scroll="paper"
			>
				<DialogTitle>
					{whatsAppId
						? i18n.t("whatsappModal.title.edit")
						: i18n.t("whatsappModal.title.add")}
				</DialogTitle>
				<Formik
					initialValues={whatsApp}
					enableReinitialize={true}
					validationSchema={SessionSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveWhatsApp(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, touched, errors, isSubmitting }) => (
						<Form>
							<DialogContent dividers>
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("whatsappModal.form.name")}
										autoFocus
										name="name"
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										variant="outlined"
										margin="dense"
										className={classes.textField}
									/>
									<FormControlLabel
										control={
											<Field
												as={Switch}
												color="primary"
												name="isDefault"
												checked={values.isDefault}
											/>
										}
										label={i18n.t("whatsappModal.form.default")}
									/>
								</div>
								<div className={classes.cloudApiSection}>
									<FormControl variant="outlined" margin="dense" fullWidth>
										<InputLabel>Tipo de conexão</InputLabel>
										<Field
											as={Select}
											name="providerType"
											value={values.providerType || "web"}
											label="Tipo de conexão"
										>
											<MenuItem value="web">WhatsApp Web (QR Code)</MenuItem>
											<MenuItem value="official">API Oficial (Cloud API)</MenuItem>
										</Field>
										<FormHelperText>
											Use API Oficial somente com credenciais da Meta.
										</FormHelperText>
									</FormControl>

									{values.providerType === "official" && (
										<>
											<Field
												as={TextField}
												label="Phone Number ID"
												name="phoneNumberId"
												fullWidth
												variant="outlined"
												margin="dense"
												helperText="ID do número no WhatsApp Business Platform."
											/>
											<Field
												as={TextField}
												label="Access Token"
												name="accessToken"
												fullWidth
												multiline
												rows={3}
												variant="outlined"
												margin="dense"
											/>
											<Field
												as={TextField}
												label="Verify Token"
												name="verifyToken"
												fullWidth
												variant="outlined"
												margin="dense"
												helperText="Token usado na validação GET do webhook."
											/>
											<Field
												as={TextField}
												label="App Secret"
												name="appSecret"
												fullWidth
												variant="outlined"
												margin="dense"
												helperText="Opcional, usado para validar assinatura do webhook."
											/>
											<div className={classes.multFieldLine}>
												<Field
													as={TextField}
													label="WABA ID"
													name="wabaId"
													fullWidth
													variant="outlined"
													margin="dense"
												/>
												<Field
													as={TextField}
													label="Business Account ID"
													name="businessAccountId"
													fullWidth
													variant="outlined"
													margin="dense"
												/>
											</div>
											<Field
												as={TextField}
												label="API Version"
												name="apiVersion"
												fullWidth
												variant="outlined"
												margin="dense"
												placeholder="v20.0"
											/>
										</>
									)}
								</div>

								<div>
									<Field
										as={TextField}
										label={i18n.t("queueModal.form.greetingMessage")}
										type="greetingMessage"
										multiline
										rows={5}
										fullWidth
										name="greetingMessage"
										error={
											touched.greetingMessage && Boolean(errors.greetingMessage)
										}
										helperText={
											touched.greetingMessage && errors.greetingMessage
										}
										variant="outlined"
										margin="dense"
									/>
								</div>
								<div>
									<Field
										as={TextField}
										label={i18n.t("whatsappModal.form.farewellMessage")}
										type="farewellMessage"
										multiline
										rows={5}
										fullWidth
										name="farewellMessage"
										error={
											touched.farewellMessage && Boolean(errors.farewellMessage)
										}
										helperText={
											touched.farewellMessage && errors.farewellMessage
										}
										variant="outlined"
										margin="dense"
									/>
								</div>
								<QueueSelect
									selectedQueueIds={selectedQueueIds}
									onChange={selectedIds => setSelectedQueueIds(selectedIds)}
								/>
								{canManageLinkedUserSignature && (
									<div className={classes.signatureSection}>
										<FormControl
											variant="outlined"
											margin="dense"
											fullWidth
										>
											<InputLabel>
												{i18n.t("whatsappModal.form.linkedUser")}
											</InputLabel>
											<Field
												as={Select}
												name="linkedUserId"
												value={values.linkedUserId}
												label={i18n.t("whatsappModal.form.linkedUser")}
											>
												<MenuItem value="">&nbsp;</MenuItem>
												{availableUsers.map(availableUser => (
													<MenuItem key={availableUser.id} value={availableUser.id}>
														{availableUser.name}
													</MenuItem>
												))}
											</Field>
											<FormHelperText>
												{loadingUsers
													? i18n.t("whatsappModal.form.loadingLinkedUsers")
													: i18n.t("whatsappModal.form.linkedUserHelper")}
											</FormHelperText>
										</FormControl>
									</div>
								)}
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("whatsappModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{whatsAppId
										? i18n.t("whatsappModal.buttons.okEdit")
										: i18n.t("whatsappModal.buttons.okAdd")}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default React.memo(WhatsAppModal);
