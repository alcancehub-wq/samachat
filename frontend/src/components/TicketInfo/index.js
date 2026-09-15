import React from "react";

import { Avatar, CardHeader } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";
import isContactRegistrationComplete from "../../utils/contactRegistration";

const useStyles = makeStyles((theme) => ({
    cardHeader: {
        padding: 0,
        margin: 0,
        minWidth: 0,
        alignItems: "center",
        "& .MuiCardHeader-content": {
            minWidth: 0,
        },
    },
    avatar: {
        width: 48,
        height: 48,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
        [theme.breakpoints.down("sm")]: {
            width: 40,
            height: 40,
            boxShadow: "none",
        },
    },
    title: {
        fontWeight: 700,
        fontSize: "1.02rem",
        lineHeight: 1.25,
        color: theme.palette.text.primary,
        minWidth: 0,
        [theme.breakpoints.down("sm")]: {
            fontSize: "0.98rem",
        },
    },
    titleRow: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(0.75),
        minWidth: 0,
    },
    contactName: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    pendingBadge: {
        display: "inline-flex",
        alignItems: "center",
        flex: "none",
        padding: theme.spacing(0.25, 0.75),
        borderRadius: 999,
        fontSize: "0.68rem",
        fontWeight: 700,
        lineHeight: 1.4,
        color: "#b45309",
        backgroundColor: "rgba(245, 158, 11, 0.14)",
    },
    completeBadge: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        width: 17,
        height: 17,
        marginLeft: theme.spacing(0.25),
        backgroundColor: "#1d9bf0",
        color: "#ffffff",
        fontSize: "0.68rem",
        fontWeight: 900,
        lineHeight: 1,
        clipPath:
            "polygon(50% 0%, 61% 7%, 74% 4%, 82% 16%, 96% 24%, 93% 38%, 100% 50%, 93% 62%, 96% 76%, 82% 84%, 74% 96%, 61% 93%, 50% 100%, 39% 93%, 26% 96%, 18% 84%, 4% 76%, 7% 62%, 0% 50%, 7% 38%, 4% 24%, 18% 16%, 26% 4%, 39% 7%)",
    },
    subtitle: {
        marginTop: theme.spacing(0.25),
        fontSize: "0.84rem",
        lineHeight: 1.45,
        color: theme.palette.text.secondary,
        [theme.breakpoints.down("sm")]: {
            fontSize: "0.76rem",
            marginTop: 0,
        },
    },
}));

const TicketInfo = ({ contact, ticket, onClick }) => {
    const classes = useStyles();
    const registrationPending = !isContactRegistrationComplete(contact);

    return (
        <CardHeader
            onClick={onClick}
            style={{ cursor: "pointer" }}
            className={classes.cardHeader}
            titleTypographyProps={{
                component: "div",
                className: classes.title,
            }}
            subheaderTypographyProps={{
                noWrap: true,
                className: classes.subtitle,
            }}
            avatar={
                <Avatar
                    src={contact.profilePicUrl}
                    alt="contact_image"
                    className={classes.avatar}
                />
            }
            title={
                <div className={classes.titleRow}>
                    <span className={classes.contactName}>
                        {contact.name}
                    </span>

                    {registrationPending ? (
                        <span className={classes.pendingBadge}>
                            Cadastro pendente
                        </span>
                    ) : (
                        <span
                            className={classes.completeBadge}
                            title="Cadastro completo"
                            aria-label="Cadastro completo"
                        >
                            ✓
                        </span>
                    )}
                </div>
            }
            subheader={
                ticket.user &&
                `${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
            }
        />
    );
};

export default TicketInfo;
