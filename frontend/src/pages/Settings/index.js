import React, { useState, useEffect } from "react";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Select from "@material-ui/core/Select";
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
	settingMeta: {
		display: "flex",
		flexDirection: "column",
		gap: 2,
	},

	settingOption: {
		marginLeft: "auto",
	},
	margin: {
		margin: theme.spacing(1),
	},

}));

const Settings = () => {
	const classes = useStyles();

	const [settings, setSettings] = useState([]);
	const [activeTab, setActiveTab] = useState("general");

	useEffect(() => {
		const fetchSession = async () => {
			try {
				const { data } = await api.get("/settings");
				setSettings(data);
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, []);

	useEffect(() => {
		const socket = openSocket();

		socket.on("settings", data => {
			if (data.action === "update") {
				setSettings(prevState => {
					const aux = [...prevState];
					const settingIndex = aux.findIndex(s => s.key === data.setting.key);
					aux[settingIndex].value = data.setting.value;
					return aux;
				});
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
			await api.put(`/settings/${settingKey}`, {
				value: selectedValue,
			});
			toast.success(i18n.t("settings.success"));
		} catch (err) {
			toastError(err);
		}
	};

	const getSettingValue = key => {
		const { value } = settings.find(s => s.key === key);
		return value;
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
