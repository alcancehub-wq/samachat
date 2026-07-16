import React, { useState } from "react";
import { toast } from "react-toastify";

import {
    Button,
    CircularProgress,
} from "@material-ui/core";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import {
    completeMetaEmbeddedSignup,
    getMetaEmbeddedSignupTargetWhatsappId,
} from "../../services/metaEmbeddedSignup";

const MetaEmbeddedSignupButton = ({
    whatsApp,
    canEdit,
    reload,
    className,
}) => {
    const [loading, setLoading] = useState(false);

    const configuredWhatsappId =
        getMetaEmbeddedSignupTargetWhatsappId();

    const isExplicitTarget =
        configuredWhatsappId &&
        String(whatsApp?.id) === configuredWhatsappId;

    if (!canEdit || !isExplicitTarget) {
        return null;
    }

    const isConfigured =
        whatsApp?.cloudApiStatus === "configured" &&
        Boolean(whatsApp?.hasAccessToken);

    const handleEmbeddedSignup = async () => {
        if (loading) {
            return;
        }

        setLoading(true);

        try {
            const {
                code,
                sessionInfo,
            } = await completeMetaEmbeddedSignup();

            await api.post(
                `/whatsapp/${whatsApp.id}/embedded-signup`,
                {
                    code,
                    sessionInfo,
                }
            );

            if (reload) {
                await reload();
            }

            toast.success(
                "Conexão oficial configurada com sucesso."
            );
        } catch (error) {
            if (error?.response) {
                toastError(error);
            } else {
                toast.error(
                    error?.message ||
                        "Não foi possível concluir a conexão com a Meta."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size="small"
            variant={isConfigured ? "outlined" : "contained"}
            color="primary"
            className={className}
            disabled={loading}
            startIcon={
                loading
                    ? <CircularProgress size={14} />
                    : undefined
            }
            onClick={handleEmbeddedSignup}
        >
            {loading
                ? "Conectando com a Meta..."
                : isConfigured
                ? "Reconectar com a Meta"
                : "Conectar API Oficial"}
        </Button>
    );
};

export default React.memo(MetaEmbeddedSignupButton);
