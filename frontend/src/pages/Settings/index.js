import React, { useState, useEffect } from "react";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		alignItems: "center",
		padding: theme.spacing(4),
	},
	pageHeader: {
		marginBottom: theme.spacing(2),
	},
	pageSubtitle: {
		color: theme.palette.text.secondary,
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

	return (
		<div className={classes.root}>
			<Container className={classes.container} maxWidth="sm">
				<div className={classes.pageHeader}>
					<Typography variant="h6">{i18n.t("settings.title")}</Typography>
					<Typography variant="body2" className={classes.pageSubtitle}>
						{i18n.t("settings.description")}
					</Typography>
				</div>
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

			</Container>
		</div>
	);
};

export default Settings;
