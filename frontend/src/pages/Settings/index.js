import React, { useState, useEffect } from "react";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Select from "@material-ui/core/Select";
import Autocomplete from "@material-ui/lab/Autocomplete";
import TextField from "@material-ui/core/TextField";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";
import OpenAI from "../OpenAI";
import ApiAdmin from "../ApiAdmin";
import Integrations from "../Integrations";

const LOST_TICKET_PURGE_DEFAULTS = {
	lostTicketPurgeEnabled: "false",
	lostTicketPurgeAmount: "90",
	lostTicketPurgeUnit: "days",
};

const LOST_TICKET_PURGE_SETTING_KEYS = Object.keys(LOST_TICKET_PURGE_DEFAULTS);

const CONTACT_VISIBILITY_DEFAULTS = {
	showAllContactsToAllUsers: "false",
	showMultipleConversationContactsToAllUsers: "false",
	fullContactsVisibilityUserIds: "[]",
};

const CONTACT_VISIBILITY_SETTING_KEYS = Object.keys(CONTACT_VISIBILITY_DEFAULTS);

const parseSelectedUserIds = value => {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.map(Number).filter(item => Number.isInteger(item) && item > 0) : [];
	} catch (err) {
		return [];
	}
};


const getSettingValueFromList = (settingsList, key, fallback = "") => {
	const setting = settingsList.find(item => item.key === key);
	return setting ? setting.value : fallback;
};

const useStyles = makeStyles(theme => ({
	root: {
		display: "block",
		width: "100%",
	},
	container: {
		maxWidth: "none",
		width: "100%",
		padding: "0 !important",
		margin: 0,
	},
	headerBlock: {
		flex: "1 1 100%",
		minWidth: 0,
		marginRight: "auto",
	},
	pageHeader: {
		marginBottom: theme.spacing(2),
	},
	pageSubtitle: {
		color: "#111111",
		fontSize: "0.9375rem",
		fontWeight: 300,
		lineHeight: 1.6,
	},
	pageContent: {
		flex: 1,
		minHeight: 0,
		overflowY: "auto",
		padding: theme.spacing(0, 2, 2),
		[theme.breakpoints.down("sm")]: {
			padding: theme.spacing(0, 1, 1),
		},
	},
	tabsShell: {
		marginBottom: theme.spacing(2),
		padding: theme.spacing(0.75),
		borderRadius: 14,
		border: "1px solid rgba(15, 23, 42, 0.08)",
		boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
		backgroundColor: "#ffffff",
	},
	tabsRoot: {
		minHeight: 0,
	},
	tabRoot: {
		minHeight: 42,
		borderRadius: 10,
		paddingLeft: theme.spacing(2),
		paddingRight: theme.spacing(2),
	},
	tabPanel: {
		padding: theme.spacing(2),
		borderRadius: 12,
		border: "1px solid rgba(15, 23, 42, 0.08)",
		boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
		backgroundColor: "#ffffff",
		backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
		marginBottom: theme.spacing(2),
		width: "100%",
		boxSizing: "border-box",
	},
	tabPanelTitle: {
		fontWeight: 700,
		color: theme.palette.text.primary,
	},
	tabPanelText: {
		marginTop: theme.spacing(0.75),
		color: "#111111",
		fontSize: "0.9375rem",
		fontWeight: 300,
		lineHeight: 1.6,
	},

	paper: {
		padding: theme.spacing(2),
		display: "flex",
		alignItems: "center",
		marginBottom: 12,
		borderRadius: 12,
		border: "1px solid rgba(15, 23, 42, 0.08)",
		boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
		backgroundColor: "#ffffff",
		backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
	},
	stackPaper: {
		flexDirection: "column",
		alignItems: "stretch",
		gap: theme.spacing(2),
	},
	settingMeta: {
		display: "flex",
		flexDirection: "column",
		gap: 2,
	},
	settingHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: theme.spacing(2),
		[theme.breakpoints.down("sm")]: {
			flexDirection: "column",
		},
	},
	governanceControls: {
		display: "grid",
		gridTemplateColumns: "minmax(220px, 1.4fr) minmax(160px, 0.8fr) minmax(180px, 1fr)",
		gap: theme.spacing(2),
		alignItems: "start",
		[theme.breakpoints.down("sm")]: {
			gridTemplateColumns: "1fr",
		},
	},
	settingField: {
		width: "100%",
	},
	settingHint: {
		marginTop: theme.spacing(0.5),
	},
	warningBox: {
		padding: theme.spacing(1.5),
		borderRadius: 12,
		border: "1px solid rgba(180, 83, 9, 0.16)",
		backgroundColor: "rgba(255, 247, 237, 0.9)",
	},
	warningTitle: {
		fontWeight: 700,
		marginBottom: theme.spacing(0.5),
	},

	settingOption: {
		marginLeft: "auto",
		minWidth: 180,
		[theme.breakpoints.down("sm")]: {
			marginLeft: 0,
			width: "100%",
		},
	},
	margin: {
		margin: theme.spacing(1),
	},

}));

const Settings = () => {
	const classes = useStyles();

	const [settings, setSettings] = useState([]);
	const [activeTab, setActiveTab] = useState("general");
	const [lostTicketPurgeForm, setLostTicketPurgeForm] = useState(LOST_TICKET_PURGE_DEFAULTS);
	const [contactVisibilityForm, setContactVisibilityForm] = useState(CONTACT_VISIBILITY_DEFAULTS);
	const [users, setUsers] = useState([]);

	const syncLostTicketPurgeForm = settingsList => {
		setLostTicketPurgeForm({
			lostTicketPurgeEnabled: getSettingValueFromList(
				settingsList,
				"lostTicketPurgeEnabled",
				LOST_TICKET_PURGE_DEFAULTS.lostTicketPurgeEnabled
			),
			lostTicketPurgeAmount: getSettingValueFromList(
				settingsList,
				"lostTicketPurgeAmount",
				LOST_TICKET_PURGE_DEFAULTS.lostTicketPurgeAmount
			),
			lostTicketPurgeUnit: getSettingValueFromList(
				settingsList,
				"lostTicketPurgeUnit",
				LOST_TICKET_PURGE_DEFAULTS.lostTicketPurgeUnit
			),
		});
	};


	const syncContactVisibilityForm = settingsList => {
		setContactVisibilityForm({
			showAllContactsToAllUsers: getSettingValueFromList(
				settingsList,
				"showAllContactsToAllUsers",
				CONTACT_VISIBILITY_DEFAULTS.showAllContactsToAllUsers
			),
			showMultipleConversationContactsToAllUsers: getSettingValueFromList(
				settingsList,
				"showMultipleConversationContactsToAllUsers",
				CONTACT_VISIBILITY_DEFAULTS.showMultipleConversationContactsToAllUsers
			),
			fullContactsVisibilityUserIds: getSettingValueFromList(
				settingsList,
				"fullContactsVisibilityUserIds",
				CONTACT_VISIBILITY_DEFAULTS.fullContactsVisibilityUserIds
			),
		});
	};

	const updateSettingState = (settingKey, value) => {
		setSettings(prevState => {
			const aux = [...prevState];
			const settingIndex = aux.findIndex(s => s.key === settingKey);

			if (settingIndex === -1) {
				return [...aux, { key: settingKey, value }];
			}

			aux[settingIndex] = {
				...aux[settingIndex],
				value,
			};

			return aux;
		});
	};

	const persistSetting = async (settingKey, value) => {
		await api.put(`/settings/${settingKey}`, {
			value,
		});
		toast.success(i18n.t("settings.success"));
	};

	useEffect(() => {
		const fetchSession = async () => {
			try {
				const { data } = await api.get("/settings");
				setSettings(data);
						syncLostTicketPurgeForm(data);
						syncContactVisibilityForm(data);
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, []);
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				let pageNumber = 1;
				let hasMore = true;
				const loadedUsers = [];

				while (hasMore) {
					const { data } = await api.get("/users", {
						params: { searchParam: "", pageNumber },
					});

					loadedUsers.push(...(data.users || []));
					hasMore = Boolean(data.hasMore);
					pageNumber += 1;

					if (!data.hasMore) {
						break;
					}
				}

				setUsers(loadedUsers);
			} catch (err) {
				toastError(err);
			}
		};

		fetchUsers();
	}, []);


	useEffect(() => {
		const socket = openSocket();

		socket.on("settings", data => {
			if (data.action === "update") {
				updateSettingState(data.setting.key, data.setting.value);

				if (LOST_TICKET_PURGE_SETTING_KEYS.includes(data.setting.key)) {
					setLostTicketPurgeForm(prevState => ({
						...prevState,
						[data.setting.key]: data.setting.value,
					}));
				}

				if (CONTACT_VISIBILITY_SETTING_KEYS.includes(data.setting.key)) {
					setContactVisibilityForm(prevState => ({
						...prevState,
						[data.setting.key]: data.setting.value,
					}));
				}
			}
		});

		return () => {
			socket.disconnect();
		};
	}, []);

	const handleChangeSetting = async e => {
		const selectedValue = e.target.value;
		const settingKey = e.target.name;

		try {
			await persistSetting(settingKey, selectedValue);
		} catch (err) {
			toastError(err);
		}
	};

	const handleChangeLostTicketPurgeSetting = async e => {
		const { name, value } = e.target;

		setLostTicketPurgeForm(prevState => ({
			...prevState,
			[name]: value,
		}));

		try {
			await persistSetting(name, value);
		} catch (err) {
			setLostTicketPurgeForm(prevState => ({
				...prevState,
				[name]: getSettingValue(name, LOST_TICKET_PURGE_DEFAULTS[name]),
			}));
			toastError(err);
		}
	};


	const handleChangeContactVisibilitySetting = async e => {
		const { name, value } = e.target;

		setContactVisibilityForm(prevState => ({
			...prevState,
			[name]: value,
		}));

		try {
			await persistSetting(name, value);
		} catch (err) {
			setContactVisibilityForm(prevState => ({
				...prevState,
				[name]: getSettingValue(name, CONTACT_VISIBILITY_DEFAULTS[name]),
			}));
			toastError(err);
		}
	};

	const handleChangeFullContactsVisibilityUsers = async selectedUsers => {
		const nextValue = JSON.stringify(
			(selectedUsers || [])
				.map(userItem => Number(userItem.id))
				.filter(value => Number.isInteger(value) && value > 0)
		);
		const currentPersistedValue = getSettingValue(
			"fullContactsVisibilityUserIds",
			CONTACT_VISIBILITY_DEFAULTS.fullContactsVisibilityUserIds
		);

		setContactVisibilityForm(prevState => ({
			...prevState,
			fullContactsVisibilityUserIds: nextValue,
		}));

		try {
			await persistSetting("fullContactsVisibilityUserIds", nextValue);
		} catch (err) {
			setContactVisibilityForm(prevState => ({
				...prevState,
				fullContactsVisibilityUserIds: currentPersistedValue,
			}));
			toastError(err);
		}
	};

	const handleLostTicketPurgeAmountChange = e => {
		setLostTicketPurgeForm(prevState => ({
			...prevState,
			lostTicketPurgeAmount: e.target.value,
		}));
	};

	const handleLostTicketPurgeAmountBlur = async () => {
		const parsedValue = parseInt(lostTicketPurgeForm.lostTicketPurgeAmount, 10);
		const nextValue = Number.isNaN(parsedValue) || parsedValue < 1
			? LOST_TICKET_PURGE_DEFAULTS.lostTicketPurgeAmount
			: String(parsedValue);
		const currentPersistedValue = getSettingValue(
			"lostTicketPurgeAmount",
			LOST_TICKET_PURGE_DEFAULTS.lostTicketPurgeAmount
		);

		setLostTicketPurgeForm(prevState => ({
			...prevState,
			lostTicketPurgeAmount: nextValue,
		}));

		if (nextValue === currentPersistedValue) {
			return;
		}

		try {
			await persistSetting("lostTicketPurgeAmount", nextValue);
		} catch (err) {
			setLostTicketPurgeForm(prevState => ({
				...prevState,
				lostTicketPurgeAmount: currentPersistedValue,
			}));
			toastError(err);
		}
	};

	const getSettingValue = (key, fallback = "") => {
		return getSettingValueFromList(settings, key, fallback);
	};

	const handleChangeTab = (event, newValue) => {
		setActiveTab(newValue);
	};

	return (
		<MainContainer>
			<MainHeader>
				<div className={classes.headerBlock}>
					<div className={classes.pageHeader}>
					<Title>{i18n.t("settings.title")}</Title>
					<Typography variant="body2" className={classes.pageSubtitle}>
						{i18n.t("settings.description")}
					</Typography>
					</div>
				</div>
				<div />
			</MainHeader>
			<div className={classes.pageContent}>
				<div className={classes.root}>
				<Container className={classes.container} maxWidth={false}>

				<Paper className={classes.tabsShell}>
					<Tabs
						value={activeTab}
						onChange={handleChangeTab}
						variant="scrollable"
						scrollButtons="auto"
						className={classes.tabsRoot}
					>
						<Tab value="general" label={i18n.t("settings.tabs.general")} className={classes.tabRoot} />
						<Tab value="ia" label={i18n.t("settings.tabs.ia")} className={classes.tabRoot} />
						<Tab value="apiAdmin" label={i18n.t("settings.tabs.apiAdmin")} className={classes.tabRoot} />
						<Tab value="integrations" label={i18n.t("settings.tabs.integrations")} className={classes.tabRoot} />
					</Tabs>
				</Paper>

				{activeTab === "general" && (
					<>
						<Paper className={classes.paper}>
					<div className={classes.settingMeta}>
						<Typography variant="body1">
							{i18n.t("settings.settings.userCreation.name")}
						</Typography>
						<Typography variant="caption" className={classes.pageSubtitle}>
							{i18n.t("settings.settings.userCreation.description")}
						</Typography>
					</div>
					<Select
						margin="dense"
						variant="outlined"
						native
						id="userCreation-setting"
						name="userCreation"
						value={
							settings && settings.length > 0 && getSettingValue("userCreation")
						}
						className={classes.settingOption}
						onChange={handleChangeSetting}
					>
						<option value="enabled">
							{i18n.t("settings.settings.userCreation.options.enabled")}
						</option>
						<option value="disabled">
							{i18n.t("settings.settings.userCreation.options.disabled")}
						</option>
					</Select>

						</Paper>

						<Paper className={classes.paper}>
					<TextField
						id="api-token-setting"
						label={i18n.t("settings.apiToken.label")}
						margin="dense"
						variant="outlined"
						fullWidth
						InputProps={{ readOnly: true }}
						helperText={i18n.t("settings.apiToken.helper")}
						value={settings && settings.length > 0 && getSettingValue("userApiToken")}
					/>
						</Paper>



											<Paper className={`${classes.paper} ${classes.stackPaper}`}>
												<div className={classes.settingHeader}>
													<div className={classes.settingMeta}>
														<Typography variant="body1">
															Governança de clientes
														</Typography>
														<Typography variant="caption" className={classes.pageSubtitle}>
															Controle quais clientes aparecem na tela Clientes para usuários comuns.
														</Typography>
													</div>
												</div>

												<div className={classes.governanceControls}>
													<div className={classes.settingField}>
														<Typography variant="caption" display="block">
															Mostrar contatos com múltiplas conversas para todos
														</Typography>
														<Select
															native
															margin="dense"
															variant="outlined"
															name="showMultipleConversationContactsToAllUsers"
															value={contactVisibilityForm.showMultipleConversationContactsToAllUsers}
															className={classes.settingField}
															onChange={handleChangeContactVisibilitySetting}
														>
															<option value="false">Desativado</option>
															<option value="true">Ativado</option>
														</Select>
														<Typography variant="caption" className={`${classes.pageSubtitle} ${classes.settingHint}`}>
															Quando ativado, contatos marcados com múltiplas conversas aparecem para todos, sem liberar a lista inteira.
														</Typography>
													</div>

													<div className={classes.settingField}>
														<Typography variant="caption" display="block">
															Mostrar lista completa para todos
														</Typography>
														<Select
															native
															margin="dense"
															variant="outlined"
															name="showAllContactsToAllUsers"
															value={contactVisibilityForm.showAllContactsToAllUsers}
															className={classes.settingField}
															onChange={handleChangeContactVisibilitySetting}
														>
															<option value="false">Desativado</option>
															<option value="true">Ativado</option>
														</Select>
														<Typography variant="caption" className={`${classes.pageSubtitle} ${classes.settingHint}`}>
															Quando ativado, todos os usuários enxergam todos os clientes.
														</Typography>
													</div>

													<div className={classes.settingField}>
														<Typography variant="caption" display="block">
															Usuários liberados para lista completa
														</Typography>
														<Autocomplete
															multiple
															options={users}
															getOptionLabel={option => option.name || ""}
															value={users.filter(userItem =>
																parseSelectedUserIds(contactVisibilityForm.fullContactsVisibilityUserIds).includes(Number(userItem.id))
															)}
															onChange={(event, selectedUsers) => handleChangeFullContactsVisibilityUsers(selectedUsers)}
															renderInput={params => (
																<TextField
																	{...params}
																	variant="outlined"
																	margin="dense"
																	placeholder="Selecione os usuários"
																/>
															)}
														/>
														<Typography variant="caption" className={`${classes.pageSubtitle} ${classes.settingHint}`}>
															Selecione um ou mais usuários autorizados. Admin sempre vê tudo.
														</Typography>
													</div>
												</div>
											</Paper>

<Paper className={`${classes.paper} ${classes.stackPaper}`}>
							<div className={classes.settingHeader}>
								<div className={classes.settingMeta}>
									<Typography variant="body1">
										{i18n.t("settings.settings.lostTicketPurge.name")}
									</Typography>
									<Typography variant="caption" className={classes.pageSubtitle}>
										{i18n.t("settings.settings.lostTicketPurge.description")}
									</Typography>
								</div>
							</div>

							<div className={classes.governanceControls}>
								<div className={classes.settingField}>
									<Typography variant="caption" display="block">
										{i18n.t("settings.settings.lostTicketPurge.enabledLabel")}
									</Typography>
									<Select
										native
										margin="dense"
										variant="outlined"
										name="lostTicketPurgeEnabled"
										value={lostTicketPurgeForm.lostTicketPurgeEnabled}
										className={classes.settingField}
										onChange={handleChangeLostTicketPurgeSetting}
									>
										<option value="false">
											{i18n.t("settings.settings.lostTicketPurge.options.disabled")}
										</option>
										<option value="true">
											{i18n.t("settings.settings.lostTicketPurge.options.enabled")}
										</option>
									</Select>
								</div>

								<div className={classes.settingField}>
									<Typography variant="caption" display="block">
										{i18n.t("settings.settings.lostTicketPurge.amountLabel")}
									</Typography>
									<TextField
										type="number"
										name="lostTicketPurgeAmount"
										variant="outlined"
										margin="dense"
										value={lostTicketPurgeForm.lostTicketPurgeAmount}
										onChange={handleLostTicketPurgeAmountChange}
										onBlur={handleLostTicketPurgeAmountBlur}
										className={classes.settingField}
										inputProps={{ min: 1, step: 1 }}
										helperText={i18n.t("settings.settings.lostTicketPurge.amountHelper")}
									/>
								</div>

								<div className={classes.settingField}>
									<Typography variant="caption" display="block">
										{i18n.t("settings.settings.lostTicketPurge.unitLabel")}
									</Typography>
									<Select
										native
										margin="dense"
										variant="outlined"
										name="lostTicketPurgeUnit"
										value={lostTicketPurgeForm.lostTicketPurgeUnit}
										className={classes.settingField}
										onChange={handleChangeLostTicketPurgeSetting}
									>
										<option value="days">
											{i18n.t("settings.settings.lostTicketPurge.units.days")}
										</option>
										<option value="months">
											{i18n.t("settings.settings.lostTicketPurge.units.months")}
										</option>
									</Select>
								</div>
							</div>

							<div className={classes.warningBox}>
								<Typography variant="body2" className={classes.warningTitle}>
									{i18n.t("settings.settings.lostTicketPurge.warningTitle")}
								</Typography>
								<Typography variant="caption" className={classes.pageSubtitle}>
									{i18n.t("settings.settings.lostTicketPurge.warning")}
								</Typography>
							</div>
						</Paper>
					</>
				)}

				{activeTab === "ia" && (
					<Box className={classes.tabPanel}>
						<OpenAI embedded />
					</Box>
				)}

				{activeTab === "apiAdmin" && (
					<Box className={classes.tabPanel}>
						<ApiAdmin embedded />
					</Box>
				)}

				{activeTab === "integrations" && (
					<Box className={classes.tabPanel}>
						<Integrations embedded />
					</Box>
				)}

				</Container>
				</div>
			</div>
		</MainContainer>
	);
};

export default Settings;
