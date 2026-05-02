import React from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";

import { i18n } from "../../translate/i18n";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
	cancelButton: {
		borderRadius: 4,
		textTransform: "none",
		fontWeight: 500,
		boxShadow: "none",
		backgroundColor: "#F3F4F6",
		color: "#111827",
		"&:hover": {
			backgroundColor: "#E5E7EB",
			boxShadow: "none",
		},
	},
	confirmButton: {
		borderRadius: 4,
		textTransform: "none",
		fontWeight: 500,
		boxShadow: "none",
		backgroundColor: "#FF1919",
		color: "#FFFFFF",
		"&:hover": {
			backgroundColor: "#E11414",
			boxShadow: "none",
		},
	},
}));

const ConfirmationModal = ({ title, children, open, onClose, onConfirm }) => {
	const classes = useStyles();
	return (
		<Dialog
			open={open}
			onClose={() => onClose(false)}
			aria-labelledby="confirm-dialog"
		>
			<DialogTitle id="confirm-dialog">{title}</DialogTitle>
			<DialogContent dividers>
				<Typography>{children}</Typography>
			</DialogContent>
			<DialogActions>
				<Button
					variant="contained"
					onClick={() => onClose(false)}
					color="default"
					className={classes.cancelButton}
				>
					{i18n.t("confirmationModal.buttons.cancel")}
				</Button>
				<Button
					variant="contained"
					onClick={() => {
						onClose(false);
						onConfirm();
					}}
					color="secondary"
					className={classes.confirmButton}
				>
					{i18n.t("confirmationModal.buttons.confirm")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default ConfirmationModal;
