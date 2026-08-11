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
	linkedUserIds: [],
	sharingSettings: {
		isShared: false,
		distributionEnabled: false,
		distributionMode: null,
		distributionUserIds: [],
	},
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
				const linkedUsers = Array.isArray(data.users) ? data.users : [];
				const linkedUserIds = linkedUsers
					.map(linkedUser => Number(linkedUser.id))
					.filter(linkedUserId => Number.isInteger(linkedUserId) && linkedUserId > 0);
				const legacyLinkedUserId =
					linkedUserIds.length === 1 ? linkedUserIds[0] : "";
				const sharingSettings = {
					isShared: Boolean(data.sharingSettings?.isShared),
					distributionEnabled: Boolean(
						data.sharingSettings?.isShared &&
						data.sharingSettings?.distributionEnabled
					),
					distributionMode:
						data.sharingSettings?.distributionMode === "random" ||
						data.sharingSettings?.distributionMode === "round_robin"
							? data.sharingSettings.distributionMode
							: null,
					distributionUserIds: Array.isArray(
						data.sharingSettings?.distributionUserIds
					)
						? data.sharingSettings.distributionUserIds
							.map(userId => Number(userId))
							.filter(
								userId =>
									Number.isInteger(userId) &&
									userId > 0 &&
									linkedUserIds.includes(userId)
							)
						: [],
				};

				setWhatsApp({
					...INITIAL_STATE,
					...data,
					linkedUserId: legacyLinkedUserId,
					linkedUserIds,
					sharingSettings:
						data.providerType === "official"
							? INITIAL_STATE.sharingSettings
							: sharingSettings,
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
        const providerType = values.providerType || "web";

        const normalizedLinkedUserIds = Array.from(
            new Set(
                (Array.isArray(values.linkedUserIds) ? values.linkedUserIds : [])
                    .map(userId => Number(userId))
                    .filter(userId => Number.isInteger(userId) && userId > 0)
            )
        );

        const isShared =
            providerType === "web" &&
            Boolean(values.sharingSettings?.isShared);

        const effectiveLinkedUserIds = isShared
            ? normalizedLinkedUserIds
            : normalizedLinkedUserIds.slice(0, 1);

        const distributionEnabled =
            isShared &&
            Boolean(values.sharingSettings?.distributionEnabled);

        const distributionMode =
            distributionEnabled &&
            (
                values.sharingSettings?.distributionMode === "random" ||
                values.sharingSettings?.distributionMode === "round_robin"
            )
                ? values.sharingSettings.distributionMode
                : null;

        const distributionUserIds = distributionEnabled
            ? Array.from(
                new Set(
                    (
                        Array.isArray(values.sharingSettings?.distributionUserIds)
                            ? values.sharingSettings.distributionUserIds
                            : []
                    )
                        .map(userId => Number(userId))
                        .filter(
                            userId =>
                                Number.isInteger(userId) &&
                                userId > 0 &&
                                effectiveLinkedUserIds.includes(userId)
                        )
                )
            )
            : [];

        const whatsappData = {
            ...values,
            providerType,
            queueIds: selectedQueueIds,
        };

        if (providerType === "web") {
            whatsappData.linkedUserIds = effectiveLinkedUserIds;
            whatsappData.linkedUserId =
                effectiveLinkedUserIds.length === 1
                    ? effectiveLinkedUserIds[0]
                    : null;

            whatsappData.sharingSettings = {
                isShared,
                distributionEnabled,
                distributionMode,
                distributionUserIds,
            };
        } else {
            delete whatsappData.linkedUserIds;
            delete whatsappData.linkedUserId;
            delete whatsappData.sharingSettings;
        }
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
					{({ values, touched, errors, isSubmitting, setFieldValue }) => (
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
                                {canManageLinkedUserSignature && values.providerType !== "official" && (
                                    <div className={classes.signatureSection}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    color="primary"
                                                    checked={Boolean(values.sharingSettings?.isShared)}
                                                    onChange={event => {
                                                        const nextIsShared = event.target.checked;

                                                        setFieldValue(
                                                            "sharingSettings.isShared",
                                                            nextIsShared
                                                        );

                                                        if (!nextIsShared) {
                                                            const firstLinkedUser =
                                                                Array.isArray(values.linkedUserIds) &&
                                                                values.linkedUserIds.length > 0
                                                                    ? [values.linkedUserIds[0]]
                                                                    : [];

                                                            setFieldValue(
                                                                "linkedUserIds",
                                                                firstLinkedUser
                                                            );

                                                            setFieldValue(
                                                                "sharingSettings.distributionEnabled",
                                                                false
                                                            );

                                                            setFieldValue(
                                                                "sharingSettings.distributionMode",
                                                                null
                                                            );

                                                            setFieldValue(
                                                                "sharingSettings.distributionUserIds",
                                                                []
                                                            );
                                                        }
                                                    }}
                                                />
                                            }
                                            label={i18n.t("whatsappModal.form.shareConnection")}
                                        />

                                        <FormHelperText className={classes.signatureHelper}>
                                            {i18n.t("whatsappModal.form.shareConnectionHelper")}
                                        </FormHelperText>

                                        <FormControl
                                            variant="outlined"
                                            margin="dense"
                                            fullWidth
                                        >
                                            <InputLabel>
                                                {values.sharingSettings?.isShared
                                                    ? i18n.t("whatsappModal.form.authorizedUsers")
                                                    : i18n.t("whatsappModal.form.linkedUser")}
                                            </InputLabel>

                                            {values.sharingSettings?.isShared ? (
                                                <Select
                                                    multiple
                                                    value={values.linkedUserIds || []}
                                                    label={i18n.t("whatsappModal.form.authorizedUsers")}
                                                    onChange={event => {
                                                        const nextIds = Array.from(
                                                            new Set(
                                                                (event.target.value || [])
                                                                    .map(userId => Number(userId))
                                                                    .filter(
                                                                        userId =>
                                                                            Number.isInteger(userId) &&
                                                                            userId > 0
                                                                    )
                                                            )
                                                        );

                                                        setFieldValue("linkedUserIds", nextIds);

                                                        const currentDistributionUsers =
                                                            values.sharingSettings
                                                                ?.distributionUserIds || [];

                                                        setFieldValue(
                                                            "sharingSettings.distributionUserIds",
                                                            currentDistributionUsers.filter(userId =>
                                                                nextIds.includes(Number(userId))
                                                            )
                                                        );
                                                    }}
                                                    renderValue={selected =>
                                                        (selected || [])
                                                            .map(selectedId => {
                                                                const selectedUser = availableUsers.find(
                                                                    availableUser =>
                                                                        Number(availableUser.id) ===
                                                                        Number(selectedId)
                                                                );

                                                                return selectedUser?.name || selectedId;
                                                            })
                                                            .join(", ")
                                                    }
                                                >
                                                    {availableUsers.map(availableUser => (
                                                        <MenuItem
                                                            key={availableUser.id}
                                                            value={availableUser.id}
                                                        >
                                                            {availableUser.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            ) : (
                                                <Select
                                                    value={
                                                        Array.isArray(values.linkedUserIds) &&
                                                        values.linkedUserIds.length > 0
                                                            ? values.linkedUserIds[0]
                                                            : ""
                                                    }
                                                    label={i18n.t("whatsappModal.form.linkedUser")}
                                                    onChange={event => {
                                                        const selectedId = Number(event.target.value);

                                                        setFieldValue(
                                                            "linkedUserIds",
                                                            Number.isInteger(selectedId) &&
                                                            selectedId > 0
                                                                ? [selectedId]
                                                                : []
                                                        );
                                                    }}
                                                >
                                                    <MenuItem value="">
                                                        <em>
                                                            {i18n.t("whatsappModal.form.noLinkedUser")}
                                                        </em>
                                                    </MenuItem>

                                                    {availableUsers.map(availableUser => (
                                                        <MenuItem
                                                            key={availableUser.id}
                                                            value={availableUser.id}
                                                        >
                                                            {availableUser.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            )}

                                            <FormHelperText>
                                                {loadingUsers
                                                    ? i18n.t("whatsappModal.form.loadingLinkedUsers")
                                                    : values.sharingSettings?.isShared
                                                        ? i18n.t(
                                                            "whatsappModal.form.authorizedUsersHelper"
                                                        )
                                                        : i18n.t(
                                                            "whatsappModal.form.linkedUserHelper"
                                                        )}
                                            </FormHelperText>
                                        </FormControl>

                                        {values.sharingSettings?.isShared && (
                                            <>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            color="primary"
                                                            checked={Boolean(
                                                                values.sharingSettings
                                                                    ?.distributionEnabled
                                                            )}
                                                            onChange={event => {
                                                                const enabled = event.target.checked;

                                                                setFieldValue(
                                                                    "sharingSettings.distributionEnabled",
                                                                    enabled
                                                                );

                                                                if (enabled) {
                                                                    setFieldValue(
                                                                        "sharingSettings.distributionMode",
                                                                        values.sharingSettings
                                                                            ?.distributionMode || "random"
                                                                    );
                                                                } else {
                                                                    setFieldValue(
                                                                        "sharingSettings.distributionMode",
                                                                        null
                                                                    );

                                                                    setFieldValue(
                                                                        "sharingSettings.distributionUserIds",
                                                                        []
                                                                    );
                                                                }
                                                            }}
                                                        />
                                                    }
                                                    label={i18n.t(
                                                        "whatsappModal.form.distributionEnabled"
                                                    )}
                                                />

                                                <FormHelperText className={classes.signatureHelper}>
                                                    {i18n.t(
                                                        "whatsappModal.form.distributionEnabledHelper"
                                                    )}
                                                </FormHelperText>

                                                {values.sharingSettings?.distributionEnabled && (
                                                    <>
                                                        <FormControl
                                                            variant="outlined"
                                                            margin="dense"
                                                            fullWidth
                                                        >
                                                            <InputLabel>
                                                                {i18n.t(
                                                                    "whatsappModal.form.distributionMode"
                                                                )}
                                                            </InputLabel>

                                                            <Select
                                                                value={
                                                                    values.sharingSettings
                                                                        ?.distributionMode || "random"
                                                                }
                                                                label={i18n.t(
                                                                    "whatsappModal.form.distributionMode"
                                                                )}
                                                                onChange={event =>
                                                                    setFieldValue(
                                                                        "sharingSettings.distributionMode",
                                                                        event.target.value
                                                                    )
                                                                }
                                                            >
                                                                <MenuItem value="random">
                                                                    {i18n.t(
                                                                        "whatsappModal.form.distributionModeRandom"
                                                                    )}
                                                                </MenuItem>

                                                                <MenuItem value="round_robin">
                                                                    {i18n.t(
                                                                        "whatsappModal.form.distributionModeRoundRobin"
                                                                    )}
                                                                </MenuItem>
                                                            </Select>
                                                        </FormControl>

                                                        <FormControl
                                                            variant="outlined"
                                                            margin="dense"
                                                            fullWidth
                                                        >
                                                            <InputLabel>
                                                                {i18n.t(
                                                                    "whatsappModal.form.distributionUsers"
                                                                )}
                                                            </InputLabel>

                                                            <Select
                                                                multiple
                                                                value={
                                                                    values.sharingSettings
                                                                        ?.distributionUserIds || []
                                                                }
                                                                label={i18n.t(
                                                                    "whatsappModal.form.distributionUsers"
                                                                )}
                                                                onChange={event => {
                                                                    const authorizedIds = (
                                                                        values.linkedUserIds || []
                                                                    ).map(userId => Number(userId));

                                                                    const eligibleIds = Array.from(
                                                                        new Set(
                                                                            (event.target.value || [])
                                                                                .map(userId =>
                                                                                    Number(userId)
                                                                                )
                                                                                .filter(
                                                                                    userId =>
                                                                                        Number.isInteger(userId) &&
                                                                                        userId > 0 &&
                                                                                        authorizedIds.includes(
                                                                                            userId
                                                                                        )
                                                                                )
                                                                        )
                                                                    );

                                                                    setFieldValue(
                                                                        "sharingSettings.distributionUserIds",
                                                                        eligibleIds
                                                                    );
                                                                }}
                                                                renderValue={selected =>
                                                                    (selected || [])
                                                                        .map(selectedId => {
                                                                            const selectedUser =
                                                                                availableUsers.find(
                                                                                    availableUser =>
                                                                                        Number(
                                                                                            availableUser.id
                                                                                        ) ===
                                                                                        Number(selectedId)
                                                                                );

                                                                            return (
                                                                                selectedUser?.name ||
                                                                                selectedId
                                                                            );
                                                                        })
                                                                        .join(", ")
                                                                }
                                                            >
                                                                {availableUsers
                                                                    .filter(availableUser =>
                                                                        (values.linkedUserIds || [])
                                                                            .map(userId =>
                                                                                Number(userId)
                                                                            )
                                                                            .includes(
                                                                                Number(
                                                                                    availableUser.id
                                                                                )
                                                                            )
                                                                    )
                                                                    .map(availableUser => (
                                                                        <MenuItem
                                                                            key={availableUser.id}
                                                                            value={availableUser.id}
                                                                        >
                                                                            {availableUser.name}
                                                                        </MenuItem>
                                                                    ))}
                                                            </Select>

                                                            <FormHelperText>
                                                                {i18n.t(
                                                                    "whatsappModal.form.distributionUsersHelper"
                                                                )}
                                                            </FormHelperText>
                                                        </FormControl>
                                                    </>
                                                )}
                                            </>
                                        )}
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
