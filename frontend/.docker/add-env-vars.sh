_writeFrontendEnvVars() {
    if [ -n "${REACT_APP_BACKEND_URL}" ] && [ -z "${VITE_BACKEND_URL}" ]; then
        export VITE_BACKEND_URL="${REACT_APP_BACKEND_URL}";
    fi
    ENV_JSON="$(jq --compact-output --null-input 'env | with_entries(select(.key | startswith("REACT_APP_")))')"
    VITE_JSON="$(jq --compact-output --null-input 'env | with_entries(select(.key | startswith("VITE_")))')"
    ENV_JSON="$(jq --compact-output --null-input --argjson a "${ENV_JSON}" --argjson b "${VITE_JSON}" '$a + $b')"
    ENV_JSON_ESCAPED="$(printf "%s" "${ENV_JSON}" | sed -e 's/[\&/]/\\&/g')"
    sed -i "s/<noscript id=\"env-insertion-point\"><\/noscript>/<script>var ENV=${ENV_JSON_ESCAPED}<\/script>/g" ${PUBLIC_HTML}index.html
}

_writeNginxEnvVars() {
    dockerize -template /etc/nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf
}

_addSslConfig() {
    SSL_CERTIFICATE=/etc/nginx/ssl/${1}/fullchain.pem;
    SSL_CERTIFICATE_KEY=/etc/nginx/ssl/${1}/privkey.pem;
    FILE_CONF=/etc/nginx/sites.d/${1}.conf
    FILE_SSL_CONF=/etc/nginx/conf.d/00-ssl-redirect.conf;

    # Remove previously appended SSL/listen directives to keep idempotent restarts.
    sed -i '/listen 80;/d' ${FILE_CONF};
    sed -i '/include include.d\/ssl\.conf;/d' ${FILE_CONF};
    sed -i '/ssl_certificate /d' ${FILE_CONF};
    sed -i '/ssl_certificate_key /d' ${FILE_CONF};
    if [ -f ${FILE_SSL_CONF} ]; then
        sed -i '/include include.d\/ssl-redirect\.conf;/d' ${FILE_SSL_CONF};
    fi

    if [ -f ${SSL_CERTIFICATE} ] && [ -f ${SSL_CERTIFICATE_KEY} ]; then
        echo "saving ssl config in ${FILE_CONF}"
        echo 'include include.d/ssl-redirect.conf;' >> ${FILE_SSL_CONF};
        echo 'include "include.d/ssl.conf";' >> ${FILE_CONF};
        echo "ssl_certificate ${SSL_CERTIFICATE};" >> ${FILE_CONF};
        echo "ssl_certificate_key ${SSL_CERTIFICATE_KEY};" >> ${FILE_CONF};
    else
        echo 'listen 80;' >> ${FILE_CONF};
        echo "ssl ${1} not found >> ${SSL_CERTIFICATE} -> ${SSL_CERTIFICATE_KEY}"
    fi;
}

_writeFrontendEnvVars;
_writeNginxEnvVars;

_addSslConfig 'backend'
_addSslConfig 'frontend'