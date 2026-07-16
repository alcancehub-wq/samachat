const FACEBOOK_SDK_ID = "facebook-jssdk";
const FACEBOOK_SDK_URL =
    "https://connect.facebook.net/pt_BR/sdk.js";

let sdkPromise = null;

const normalizeRequiredConfig = (value, errorCode) => {
    const normalized =
        typeof value === "string" ? value.trim() : "";

    if (!normalized) {
        throw new Error(errorCode);
    }

    return normalized;
};

export const getMetaEmbeddedSignupConfig = () => ({
    appId: normalizeRequiredConfig(
        import.meta.env.VITE_META_EMBEDDED_SIGNUP_APP_ID,
        "ERR_META_EMBEDDED_SIGNUP_APP_ID_NOT_CONFIGURED"
    ),
    configId: normalizeRequiredConfig(
        import.meta.env.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID,
        "ERR_META_EMBEDDED_SIGNUP_CONFIG_ID_NOT_CONFIGURED"
    ),
    apiVersion:
        (import.meta.env.VITE_META_GRAPH_API_VERSION || "v25.0").trim() ||
        "v25.0",
});


export const getMetaEmbeddedSignupTargetWhatsappId = () =>
    (
        import.meta.env.VITE_META_EMBEDDED_SIGNUP_WHATSAPP_ID || ""
    ).trim();
export const loadMetaJavaScriptSdk = () => {
    if (window.FB) {
        return Promise.resolve(window.FB);
    }

    if (sdkPromise) {
        return sdkPromise;
    }

    const { appId, apiVersion } = getMetaEmbeddedSignupConfig();

    sdkPromise = new Promise((resolve, reject) => {
        const previousAsyncInit = window.fbAsyncInit;

        window.fbAsyncInit = () => {
            if (typeof previousAsyncInit === "function") {
                previousAsyncInit();
            }

            if (!window.FB) {
                reject(
                    new Error("ERR_META_EMBEDDED_SIGNUP_SDK_UNAVAILABLE")
                );
                return;
            }

            window.FB.init({
                appId,
                cookie: true,
                xfbml: false,
                version: apiVersion,
            });

            resolve(window.FB);
        };

        const existingScript = document.getElementById(FACEBOOK_SDK_ID);

        if (existingScript) {
            existingScript.addEventListener(
                "error",
                () => {
                    sdkPromise = null;
                    reject(
                        new Error("ERR_META_EMBEDDED_SIGNUP_SDK_LOAD_FAILED")
                    );
                },
                { once: true }
            );

            return;
        }

        const script = document.createElement("script");
        script.id = FACEBOOK_SDK_ID;
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        script.src = FACEBOOK_SDK_URL;

        script.onerror = () => {
            sdkPromise = null;
            reject(
                new Error("ERR_META_EMBEDDED_SIGNUP_SDK_LOAD_FAILED")
            );
        };

        document.body.appendChild(script);
    });

    return sdkPromise;
};

export const launchMetaEmbeddedSignup = async ({
    onAuthorizationCode,
    onSessionInfo,
    onCancel,
    onError,
}) => {
    const FB = await loadMetaJavaScriptSdk();
    const { configId } = getMetaEmbeddedSignupConfig();

    const sessionInfoListener = event => {
        if (
            event.origin !== "https://www.facebook.com" &&
            event.origin !== "https://web.facebook.com"
        ) {
            return;
        }

        let payload = event.data;

        if (typeof payload === "string") {
            try {
                payload = JSON.parse(payload);
            } catch (_) {
                return;
            }
        }

        if (
            !payload ||
            payload.type !== "WA_EMBEDDED_SIGNUP"
        ) {
            return;
        }

        if (payload.event === "FINISH") {
            const data = payload.data || {};

            onSessionInfo({
                wabaId: data.waba_id || "",
                phoneNumberId: data.phone_number_id || "",
                businessAccountId: data.business_id || "",
            });

            return;
        }

        if (payload.event === "CANCEL") {
            onCancel(payload.data || {});
        }
    };

    window.addEventListener("message", sessionInfoListener);

    try {
        FB.login(
            response => {
                const code = response?.authResponse?.code;

                if (code) {
                    onAuthorizationCode(code);
                    return;
                }

                onCancel({
                    reason: "authorization_code_not_returned",
                });
            },
            {
                config_id: configId,
                response_type: "code",
                override_default_response_type: true,
                extras: {
                    featureType: "whatsapp_business_app_onboarding",
                    sessionInfoVersion: "3",
                    version: "v4",
                },
            }
        );
    } catch (error) {
        window.removeEventListener("message", sessionInfoListener);
        onError(error);
    }

    return () => {
        window.removeEventListener("message", sessionInfoListener);
    };
};
export const completeMetaEmbeddedSignup = () =>
    new Promise(async (resolve, reject) => {
        let authorizationCode = "";
        let sessionInfo = null;
        let cleanup = () => {};
        let settled = false;

        const timeoutId = window.setTimeout(() => {
            if (settled) return;

            settled = true;
            cleanup();
            reject(
                new Error("ERR_META_EMBEDDED_SIGNUP_TIMEOUT")
            );
        }, 5 * 60 * 1000);

        const settleWithError = error => {
            if (settled) return;

            settled = true;
            window.clearTimeout(timeoutId);
            cleanup();
            reject(error);
        };

        const tryResolve = () => {
            if (
                settled ||
                !authorizationCode ||
                !sessionInfo
            ) {
                return;
            }

            settled = true;
            window.clearTimeout(timeoutId);
            cleanup();

            resolve({
                code: authorizationCode,
                sessionInfo,
            });
        };

        try {
            cleanup = await launchMetaEmbeddedSignup({
                onAuthorizationCode: code => {
                    authorizationCode = code;
                    tryResolve();
                },
                onSessionInfo: data => {
                    sessionInfo = data;
                    tryResolve();
                },
                onCancel: data => {
                    const reason =
                        data?.reason ||
                        "embedded_signup_cancelled";

                    settleWithError(
                        new Error(
                            `ERR_META_EMBEDDED_SIGNUP_CANCELLED:${reason}`
                        )
                    );
                },
                onError: error => {
                    settleWithError(error);
                },
            });

            if (settled) {
                cleanup();
            }
        } catch (error) {
            settleWithError(error);
        }
    });
