import React, { useState, useEffect, useRef, useContext } from "react";

import * as Yup from "yup";
import { Formik, FieldArray, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CircularProgress from "@material-ui/core/CircularProgress";
import MenuItem from "@material-ui/core/MenuItem";
import Autocomplete from "@material-ui/lab/Autocomplete";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import TagSelect from "../TagSelect";
import ContactSelect from "../ContactSelect";
import { CONTACT_REFERRAL_TYPES } from "../../utils/contactRegistration";
import { AuthContext } from "../../context/Auth/AuthContext";

const CONTACT_NOTES_FIELD = "__contact_notes__";

const normalizeExtraInfo = extraInfo =>
	(Array.isArray(extraInfo) ? extraInfo : []).filter(
		info => info?.name !== CONTACT_NOTES_FIELD
	);

const extractNotes = extraInfo =>
	(Array.isArray(extraInfo) ? extraInfo : []).find(
		info => info?.name === CONTACT_NOTES_FIELD
	)?.value || "";

const normalizeContactValues = source => ({
    name: source?.name || "",
    number: source?.number || "",
    email: source?.email || "",
    city: source?.city || "",
    state: source?.state || "",
    captureChannel: source?.captureChannel || "",
    wasReferred:
        typeof source?.wasReferred === "boolean"
            ? source.wasReferred
            : null,
    referralType: source?.referralType || "",
    referralContactId: source?.referralContactId || null,
    referralUserId: source?.referralUserId || null,
    referralPartnerName: source?.referralPartnerName || "",
    referralNote: source?.referralNote || "",
    allowMultipleConversations: Boolean(source?.allowMultipleConversations),
    tagIds: source?.tagIds || source?.tags?.map(tag => tag.id) || [],
    extraInfo: normalizeExtraInfo(source?.extraInfo),
    notes: extractNotes(source?.extraInfo),
});

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	dialogPaper: {
		borderRadius: 12,
		padding: theme.spacing(1),
	},
	dialogTitle: {
		fontWeight: 700,
		fontSize: "1.05rem",
		color: "#0f172a",
	},
	dialogContent: {
		backgroundColor: "#f8fafc",
	},
	dialogActions: {
		padding: theme.spacing(2),
	},
	textField: {
		marginRight: theme.spacing(1),
		flex: 1,
	},

	extraAttr: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
	},
	sectionTitle: {
		fontWeight: 700,
		color: "#0f172a",
	},

	btnWrapper: {
		position: "relative",
	},
	primaryButton: {
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
	secondaryButton: {
		borderRadius: 4,
		textTransform: "none",
		fontWeight: 500,
		backgroundColor: "#F3F4F6",
		borderColor: "rgba(15, 23, 42, 0.12)",
		color: "#111827",
		"&:hover": {
			backgroundColor: "#E5E7EB",
			borderColor: "rgba(15, 23, 42, 0.16)",
		},
	},

	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
}));

const buildContactSchema = requireCompleteRegistration =>
    Yup.object().shape({
        name: Yup.string()
            .min(2, "Too Short!")
            .max(50, "Too Long!")
            .required("Required"),
        number: requireCompleteRegistration
            ? Yup.string()
                .min(8, "Too Short!")
                .max(50, "Too Long!")
                .required("Required")
            : Yup.string().min(8, "Too Short!").max(50, "Too Long!"),
        email: Yup.string().email("Invalid email"),
        captureChannel: requireCompleteRegistration
            ? Yup.string().trim().required("Required")
            : Yup.string(),
        wasReferred: Yup.mixed()
            .nullable()
            .test(
                "referral-decision-required",
                "Required",
                value =>
                    !requireCompleteRegistration ||
                    typeof value === "boolean"
            ),
        referralType: Yup.string()
            .nullable()
            .test(
                "referral-type-required",
                "Required",
                function (value) {
                    if (
                        !requireCompleteRegistration ||
                        this.parent.wasReferred !== true
                    ) {
                        return true;
                    }

                    return CONTACT_REFERRAL_TYPES.includes(
                        String(value || "").trim().toLowerCase()
                    );
                }
            ),
        referralContactId: Yup.mixed()
            .nullable()
            .test(
                "referral-contact-required",
                "Required",
                function (value) {
                    if (
                        !requireCompleteRegistration ||
                        this.parent.wasReferred !== true ||
                        this.parent.referralType !== "cliente"
                    ) {
                        return true;
                    }

                    return (
                        Number.isInteger(Number(value)) &&
                        Number(value) > 0
                    );
                }
            ),
        referralUserId: Yup.mixed()
            .nullable()
            .test(
                "referral-user-required",
                "Required",
                function (value) {
                    if (
                        !requireCompleteRegistration ||
                        this.parent.wasReferred !== true ||
                        this.parent.referralType !== "usuario"
                    ) {
                        return true;
                    }

                    return (
                        Number.isInteger(Number(value)) &&
                        Number(value) > 0
                    );
                }
            ),
        referralPartnerName: Yup.string()
            .nullable()
            .test(
                "referral-partner-required",
                "Required",
                function (value) {
                    if (
                        !requireCompleteRegistration ||
                        this.parent.wasReferred !== true ||
                        this.parent.referralType !== "parceiro"
                    ) {
                        return true;
                    }

                    return (
                        typeof value === "string" &&
                        value.trim().length > 0
                    );
                }
            ),
    });

const ContactModal = ({
    open,
    onClose,
    contactId,
    initialValues,
    onSave,
    requireCompleteRegistration = false,
}) => {
	const classes = useStyles();
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);
	const isAdmin = String(user?.profile || "").toLowerCase() === "admin";
    const requiresCompleteRegistration = Boolean(
        requireCompleteRegistration || !contactId
    );

	const initialState = {
        name: "",
        number: "",
        email: "",
        city: "",
        state: "",
        captureChannel: "",
        wasReferred: null,
        referralType: "",
        referralContactId: null,
        referralUserId: null,
        referralPartnerName: "",
        referralNote: "",
        allowMultipleConversations: false,
        notes: "",
        extraInfo: [],
        tagIds: [],
    };

	const [contact, setContact] = useState(initialState);
    const [referralUsers, setReferralUsers] = useState([]);
    const [referralUsersLoading, setReferralUsersLoading] = useState(false);
    const [referralUserSearch, setReferralUserSearch] = useState("");

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	useEffect(() => {
		const fetchContact = async () => {
			if (initialValues) {
				setContact(normalizeContactValues(initialValues));
			}

			if (!contactId) return;

			try {
				const { data } = await api.get(`/contacts/${contactId}`);
				if (isMounted.current) {
					setContact(normalizeContactValues(data));
				}
			} catch (err) {
				toastError(err);
			}
		};

		fetchContact();
	}, [contactId, open, initialValues]);
    useEffect(() => {
        if (!open || referralUserSearch.trim().length < 2) {
            setReferralUsers([]);
            setReferralUsersLoading(false);
            return undefined;
        }

        let active = true;
        setReferralUsersLoading(true);

        const timer = setTimeout(async () => {
            try {
                const { data } = await api.get("/users/", {
                    params: {
                        searchParam: referralUserSearch.trim(),
                    },
                });

                if (active) {
                    setReferralUsers(data.users || []);
                }
            } catch (err) {
                if (active) {
                    toastError(err);
                }
            } finally {
                if (active) {
                    setReferralUsersLoading(false);
                }
            }
        }, 400);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [open, referralUserSearch]);

	const handleClose = () => {
		onClose();
		setContact(initialState);
	};

	const handleSaveContact = async values => {
		const normalizedExtraInfo = (values.extraInfo || []).filter(
			info => info?.name?.trim() || info?.value?.trim()
		);
		const payload = {
            ...values,
            city: values.city?.trim() || null,
            state: values.state?.trim() || null,
            captureChannel: values.captureChannel?.trim() || null,
            wasReferred:
                typeof values.wasReferred === "boolean"
                    ? values.wasReferred
                    : null,
            referralType:
                values.wasReferred === true
                    ? values.referralType || null
                    : null,
            referralContactId:
                values.wasReferred === true &&
                values.referralType === "cliente"
                    ? values.referralContactId || null
                    : null,
            referralUserId:
                values.wasReferred === true &&
                values.referralType === "usuario"
                    ? values.referralUserId || null
                    : null,
            referralPartnerName:
                values.wasReferred === true &&
                values.referralType === "parceiro"
                    ? values.referralPartnerName?.trim() || null
                    : null,
            referralNote:
                values.wasReferred === true
                    ? values.referralNote?.trim() || null
                    : null,
			extraInfo: values.notes?.trim()
				? [
					...normalizedExtraInfo,
					{ name: CONTACT_NOTES_FIELD, value: values.notes.trim() },
				]
				: normalizedExtraInfo,
		};

		if (!isAdmin) {
			delete payload.allowMultipleConversations;
		}

		delete payload.notes;

		try {
			if (contactId) {
				const { data } = await api.put(`/contacts/${contactId}`, payload);
                if (onSave) {
                    onSave(data);
                }
				handleClose();
			} else {
				const { data } = await api.post("/contacts", payload);
				if (onSave) {
					onSave(data);
				}
				handleClose();
			}
			toast.success(i18n.t("contactModal.success"));
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.root}>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="lg"
				scroll="paper"
				classes={{ paper: classes.dialogPaper }}
			>
				<DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
					{contactId
						? `${i18n.t("contactModal.title.edit")}`
						: `${i18n.t("contactModal.title.add")}`}
				</DialogTitle>
				<Formik
					initialValues={contact}
					enableReinitialize={true}
					validationSchema={buildContactSchema(requiresCompleteRegistration)}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveContact(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, errors, touched, isSubmitting, setFieldValue }) => (
						<Form>
							<DialogContent dividers className={classes.dialogContent}>
								<Typography variant="subtitle1" gutterBottom className={classes.sectionTitle}>
									{i18n.t("contactModal.form.mainInfo")}
								</Typography>
								<Field
									as={TextField}
									label={i18n.t("contactModal.form.name")}
									name="name"
									autoFocus
									error={touched.name && Boolean(errors.name)}
									helperText={
										touched.name && errors.name
											? errors.name
											: i18n.t("contactModal.form.nameHelper")
									}
									variant="outlined"
									margin="dense"
									className={classes.textField}
								/>
								<Field
									as={TextField}
									label={i18n.t("contactModal.form.number")}
									name="number"
									error={touched.number && Boolean(errors.number)}
									helperText={
										touched.number && errors.number
											? errors.number
											: i18n.t("contactModal.form.numberHelper")
									}
										placeholder={i18n.t("contactModal.form.numberPlaceholder")}
									variant="outlined"
									margin="dense"
								/>
								<div>
									<Field
										as={TextField}
										label={i18n.t("contactModal.form.email")}
										name="email"
										error={touched.email && Boolean(errors.email)}
										helperText={
											touched.email && errors.email
												? errors.email
												: i18n.t("contactModal.form.emailHelper")
										}
										placeholder="Email address"
										fullWidth
										margin="dense"
										variant="outlined"
									/>
								</div>
								                                <Typography
                                    style={{ marginBottom: 8, marginTop: 16 }}
                                    variant="subtitle1"
                                    className={classes.sectionTitle}
                                >
                                    {i18n.t("contactModal.form.registration")}
                                </Typography>

                                {requiresCompleteRegistration && contactId && (
                                    <Typography
                                        variant="body2"
                                        style={{
                                            marginBottom: 8,
                                            color: "#b45309",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {i18n.t("contactModal.form.pendingRegistration")}
                                    </Typography>
                                )}

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Field
                                        as={TextField}
                                        label={i18n.t("contactModal.form.city")}
                                        name="city"
                                        variant="outlined"
                                        margin="dense"
                                        style={{ flex: 1, minWidth: 180 }}
                                    />

                                    <Field
                                        as={TextField}
                                        label={i18n.t("contactModal.form.state")}
                                        name="state"
                                        variant="outlined"
                                        margin="dense"
                                        style={{ flex: 1, minWidth: 140 }}
                                    />
                                </div>

                                <Field
                                    as={TextField}
                                    label={i18n.t("contactModal.form.captureChannel")}
                                    name="captureChannel"
                                    error={
                                        touched.captureChannel &&
                                        Boolean(errors.captureChannel)
                                    }
                                    helperText={
                                        touched.captureChannel &&
                                        errors.captureChannel
                                            ? errors.captureChannel
                                            : i18n.t(
                                                "contactModal.form.captureChannelHelper"
                                            )
                                    }
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                />

                                <TextField
                                    select
                                    fullWidth
                                    margin="dense"
                                    variant="outlined"
                                    name="wasReferred"
                                    label={i18n.t("contactModal.form.wasReferred")}
                                    value={
                                        values.wasReferred === true
                                            ? "yes"
                                            : values.wasReferred === false
                                                ? "no"
                                                : ""
                                    }
                                    onChange={event => {
                                        const nextValue =
                                            event.target.value === "yes"
                                                ? true
                                                : event.target.value === "no"
                                                    ? false
                                                    : null;

                                        setFieldValue(
                                            "wasReferred",
                                            nextValue
                                        );

                                        if (nextValue !== true) {
                                            setFieldValue(
                                                "referralType",
                                                ""
                                            );

                                            setFieldValue(
                                                "referralContactId",
                                                null
                                            );

                                            setFieldValue(
                                                "referralUserId",
                                                null
                                            );

                                            setFieldValue(
                                                "referralPartnerName",
                                                ""
                                            );

                                            setFieldValue(
                                                "referralNote",
                                                ""
                                            );
                                        }
                                    }}
                                    error={Boolean(errors.wasReferred)}
                                    helperText={
                                        errors.wasReferred
                                            ? errors.wasReferred
                                            : i18n.t(
                                                "contactModal.form.wasReferredHelper"
                                            )
                                    }
                                >
                                    <MenuItem value="">
                                        <em>
                                            {i18n.t(
                                                "contactModal.form.selectOption"
                                            )}
                                        </em>
                                    </MenuItem>

                                    <MenuItem value="yes">
                                        {i18n.t("contactModal.form.yes")}
                                    </MenuItem>

                                    <MenuItem value="no">
                                        {i18n.t("contactModal.form.no")}
                                    </MenuItem>
                                </TextField>

                                {values.wasReferred === true && (
                                    <>
                                        <TextField
                                            select
                                            fullWidth
                                            margin="dense"
                                            variant="outlined"
                                            name="referralType"
                                            label={i18n.t(
                                                "contactModal.form.referralType"
                                            )}
                                            value={
                                                values.referralType || ""
                                            }
                                            onChange={event => {
                                                setFieldValue(
                                                    "referralType",
                                                    event.target.value
                                                );

                                                setFieldValue(
                                                    "referralContactId",
                                                    null
                                                );

                                                setFieldValue(
                                                    "referralUserId",
                                                    null
                                                );

                                                setFieldValue(
                                                    "referralPartnerName",
                                                    ""
                                                );
                                            }}
                                            error={Boolean(
                                                errors.referralType
                                            )}
                                            helperText={
                                                errors.referralType
                                                    ? errors.referralType
                                                    : i18n.t(
                                                        "contactModal.form.referralTypeHelper"
                                                    )
                                            }
                                        >
                                            <MenuItem value="">
                                                <em>
                                                    {i18n.t(
                                                        "contactModal.form.selectOption"
                                                    )}
                                                </em>
                                            </MenuItem>

                                            <MenuItem value="cliente">
                                                {i18n.t(
                                                    "contactModal.form.referralTypes.cliente"
                                                )}
                                            </MenuItem>

                                            <MenuItem value="parceiro">
                                                {i18n.t(
                                                    "contactModal.form.referralTypes.parceiro"
                                                )}
                                            </MenuItem>

                                            <MenuItem value="usuario">
                                                {i18n.t(
                                                    "contactModal.form.referralTypes.usuario"
                                                )}
                                            </MenuItem>

                                            <MenuItem value="outro">
                                                {i18n.t(
                                                    "contactModal.form.referralTypes.outro"
                                                )}
                                            </MenuItem>
                                        </TextField>

                                        {values.referralType === "cliente" && (
                                            <div style={{ marginTop: 8 }}>
                                                <Typography
                                                    variant="body2"
                                                    style={{
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    {i18n.t(
                                                        "contactModal.form.referralContact"
                                                    )}
                                                </Typography>

                                                <ContactSelect
                                                    selectedContactIds={
                                                        values.referralContactId
                                                            ? [
                                                                values.referralContactId,
                                                            ]
                                                            : []
                                                    }
                                                    onChange={ids => {
                                                        const nextId =
                                                            ids.length > 0
                                                                ? ids[
                                                                    ids.length -
                                                                        1
                                                                ]
                                                                : null;

                                                        setFieldValue(
                                                            "referralContactId",
                                                            nextId
                                                        );
                                                    }}
                                                />

                                                {errors.referralContactId && (
                                                    <Typography
                                                        variant="caption"
                                                        color="error"
                                                    >
                                                        {
                                                            errors.referralContactId
                                                        }
                                                    </Typography>
                                                )}
                                            </div>
                                        )}

                                        {values.referralType === "usuario" && (
                                            <Autocomplete
                                                options={referralUsers}
                                                loading={
                                                    referralUsersLoading
                                                }
                                                getOptionLabel={option =>
                                                    option?.name ||
                                                    `#${option?.id || ""}`
                                                }
                                                value={
                                                    referralUsers.find(
                                                        option =>
                                                            Number(
                                                                option.id
                                                            ) ===
                                                            Number(
                                                                values.referralUserId
                                                            )
                                                    ) ||
                                                    (values.referralUserId
                                                        ? {
                                                            id:
                                                                values.referralUserId,
                                                            name:
                                                                `#${values.referralUserId}`,
                                                        }
                                                        : null)
                                                }
                                                onInputChange={(
                                                    event,
                                                    newValue
                                                ) =>
                                                    setReferralUserSearch(
                                                        newValue || ""
                                                    )
                                                }
                                                onChange={(
                                                    event,
                                                    newValue
                                                ) =>
                                                    setFieldValue(
                                                        "referralUserId",
                                                        newValue?.id ||
                                                            null
                                                    )
                                                }
                                                renderInput={params => (
                                                    <TextField
                                                        {...params}
                                                        label={i18n.t(
                                                            "contactModal.form.referralUser"
                                                        )}
                                                        variant="outlined"
                                                        margin="dense"
                                                        error={Boolean(
                                                            errors.referralUserId
                                                        )}
                                                        helperText={
                                                            errors.referralUserId
                                                                ? errors.referralUserId
                                                                : i18n.t(
                                                                    "contactModal.form.referralUserHelper"
                                                                )
                                                        }
                                                    />
                                                )}
                                            />
                                        )}

                                        {values.referralType ===
                                            "parceiro" && (
                                            <Field
                                                as={TextField}
                                                label={i18n.t(
                                                    "contactModal.form.referralPartner"
                                                )}
                                                name="referralPartnerName"
                                                error={Boolean(
                                                    errors.referralPartnerName
                                                )}
                                                helperText={
                                                    errors.referralPartnerName
                                                        ? errors.referralPartnerName
                                                        : i18n.t(
                                                            "contactModal.form.referralPartnerHelper"
                                                        )
                                                }
                                                variant="outlined"
                                                margin="dense"
                                                fullWidth
                                            />
                                        )}

                                        <Field
                                            as={TextField}
                                            label={i18n.t(
                                                "contactModal.form.referralNote"
                                            )}
                                            name="referralNote"
                                            helperText={i18n.t(
                                                "contactModal.form.referralNoteHelper"
                                            )}
                                            variant="outlined"
                                            margin="dense"
                                            fullWidth
                                            multiline
                                            rows={2}
                                        />
                                    </>
                                )}
{isAdmin && (
									<>
										<Typography
											style={{ marginBottom: 8, marginTop: 12 }}
											variant="subtitle1"
											className={classes.sectionTitle}
										>
											{i18n.t("contactModal.form.allowMultipleConversations")}
										</Typography>
										<FormControlLabel
											control={
												<Checkbox
													checked={Boolean(values.allowMultipleConversations)}
													onChange={event =>
														setFieldValue(
															"allowMultipleConversations",
															event.target.checked
														)
													}
													color="primary"
												/>
											}
											label={i18n.t("contactModal.form.allowMultipleConversations")}
										/>
										<Typography variant="body2" color="textSecondary">
											{i18n.t("contactModal.form.allowMultipleConversationsHelper")}
										</Typography>
									</>
								)}
								<Typography
									style={{ marginBottom: 8, marginTop: 12 }}
									variant="subtitle1"
									className={classes.sectionTitle}
								>
									{i18n.t("contactModal.form.tags")}
								</Typography>
								<TagSelect
									selectedTagIds={values.tagIds || []}
									onChange={(ids) => setFieldValue("tagIds", ids)}
									label={i18n.t("contactModal.form.tagsPlaceholder")}
								/>
								<Typography
									style={{ marginBottom: 8, marginTop: 12 }}
									variant="subtitle1"
									className={classes.sectionTitle}
								>
									{i18n.t("contactModal.form.notes")}
								</Typography>
								<Field
									as={TextField}
									label={i18n.t("contactModal.form.notes")}
									name="notes"
									helperText={i18n.t("contactModal.form.notesHelper")}
									variant="outlined"
									margin="dense"
									fullWidth
									multiline
									rows={4}
								/>
								<Typography
									style={{ marginBottom: 8, marginTop: 12 }}
									variant="subtitle1"
									className={classes.sectionTitle}
								>
									{i18n.t("contactModal.form.extraInfo")}
								</Typography>

								<FieldArray name="extraInfo">
									{({ push, remove }) => (
										<>
											{values.extraInfo &&
												values.extraInfo.length > 0 &&
												values.extraInfo.map((info, index) => (
													<div
														className={classes.extraAttr}
														key={`${index}-info`}
													>
														<Field
															as={TextField}
															label={i18n.t("contactModal.form.extraName")}
															name={`extraInfo[${index}].name`}
															helperText={i18n.t("contactModal.form.extraNameHelper")}
															variant="outlined"
															margin="dense"
															className={classes.textField}
														/>
														<Field
															as={TextField}
															label={i18n.t("contactModal.form.extraValue")}
															name={`extraInfo[${index}].value`}
															helperText={i18n.t("contactModal.form.extraValueHelper")}
															variant="outlined"
															margin="dense"
															className={classes.textField}
														/>
														<IconButton
															size="small"
															onClick={() => remove(index)}
														>
															<DeleteOutlineIcon />
														</IconButton>
													</div>
												))}
											<div className={classes.extraAttr}>
												<Button
													style={{ flex: 1, marginTop: 8 }}
													variant="outlined"
													color="primary"
													onClick={() => push({ name: "", value: "" })}
												>
													{`+ ${i18n.t("contactModal.buttons.addExtraInfo")}`}
												</Button>
											</div>
										</>
									)}
								</FieldArray>
							</DialogContent>
							<DialogActions className={classes.dialogActions}>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
									className={classes.secondaryButton}
								>
									{i18n.t("contactModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={`${classes.btnWrapper} ${classes.primaryButton}`}
								>
									{contactId
										? `${i18n.t("contactModal.buttons.okEdit")}`
										: `${i18n.t("contactModal.buttons.okAdd")}`}
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

export default ContactModal;
