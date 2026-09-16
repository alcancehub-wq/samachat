import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography
} from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const extractParameters = component => {
  const componentType = String(
    component?.type || ""
  ).toUpperCase();

  const text = String(component?.text || "");
  const pattern = /{{(\d+)}}/g;

  const seen = new Set();
  const parameters = [];

  let match;

  while ((match = pattern.exec(text)) !== null) {
    const position = Number(match[1]);
    const key = `${componentType}:${position}`;

    if (
      !Number.isInteger(position) ||
      position <= 0 ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    parameters.push({
      key,
      componentType,
      position
    });
  }

  return parameters.sort(
    (left, right) => left.position - right.position
  );
};

const getTemplateParameters = template =>
  (template?.components || []).flatMap(
    extractParameters
  );

const buildMappingIndex = template => {
  const entries = Array.isArray(
    template?.samachatVariableMapping
  )
    ? template.samachatVariableMapping
    : [];

  return entries.reduce((result, entry) => {
    const componentType = String(
      entry?.componentType || ""
    ).toUpperCase();

    const position = Number(entry?.position);
    const variableKey = String(
      entry?.variableKey || ""
    ).trim();

    if (
      componentType &&
      Number.isInteger(position) &&
      position > 0 &&
      variableKey
    ) {
      result[
        `${componentType}:${position}`
      ] = variableKey;
    }

    return result;
  }, {});
};

const buildMappedTemplateComponents = template => {
  const mappingIndex =
    buildMappingIndex(template);

  const grouped = [];

  for (const component of template?.components || []) {
    const parameters =
      extractParameters(component);

    if (parameters.length === 0) {
      continue;
    }

    const resolvedParameters = [];

    for (const parameter of parameters) {
      const variableKey =
        mappingIndex[parameter.key];

      if (!variableKey) {
        return null;
      }

      resolvedParameters.push({
        type: "text",
        text: `{{${variableKey}}}`
      });
    }

    grouped.push({
      type: String(
        component.type || ""
      ).toLowerCase(),
      parameters: resolvedParameters
    });
  }

  return grouped;
};

const formatComponentsForConsumer = components =>
  JSON.stringify(components);

const sameComponentsValue = (
  left,
  right
) => {
  if (
    Array.isArray(left) ||
    Array.isArray(right)
  ) {
    return JSON.stringify(left || []) ===
      JSON.stringify(right || []);
  }

  return String(left || "") ===
    String(right || "");
};

const renderTemplatePreview = template => {
  const mappingIndex =
    buildMappingIndex(template);

  return (template?.components || [])
    .filter(component => component?.text)
    .map(component => {
      const componentType = String(
        component.type || ""
      ).toUpperCase();

      return String(component.text).replace(
        /{{(\d+)}}/g,
        (placeholder, rawPosition) => {
          const position =
            Number(rawPosition);

          const variableKey =
            mappingIndex[
              `${componentType}:${position}`
            ];

          return variableKey
            ? `{{${variableKey}}}`
            : placeholder;
        }
      );
    })
    .join("\n");
};

const templateMappingIsComplete = template => {
  const parameters =
    getTemplateParameters(template);

  if (parameters.length === 0) {
    return true;
  }

  return (
    buildMappedTemplateComponents(template) !== null
  );
};

const OfficialOutboundConfig = ({
  value,
  onChange,
  requireQueue = true
}) => {
  const [connections, setConnections] =
    useState([]);

  const [queues, setQueues] =
    useState([]);

  const [templates, setTemplates] =
    useState([]);

  useEffect(() => {
    if (value.outboundMode !== "OFFICIAL") {
      return;
    }

    api
      .get(
        "/meta-message-templates/authorized-connections"
      )
      .then(connectionResponse => {
        setConnections(
          (connectionResponse.data || []).filter(
            connection =>
              connection.providerType === "official"
          )
        );
      })
      .catch(toastError);

    api
      .get("/queue")
      .then(response =>
        setQueues(response.data || [])
      )
      .catch(() => setQueues([]));
  }, [value.outboundMode]);

  useEffect(() => {
    if (!value.deliveryWhatsappId) {
      setTemplates([]);
      return;
    }

    api
      .get(
        `/meta-message-templates/${value.deliveryWhatsappId}`
      )
      .then(response =>
        setTemplates(
          (
            response.data?.data ||
            response.data ||
            []
          ).filter(
            template =>
              String(
                template.status
              ).toUpperCase() === "APPROVED"
          )
        )
      )
      .catch(toastError);
  }, [value.deliveryWhatsappId]);

  const selectedTemplate =
    templates.find(
      template =>
        template.name === value.templateName &&
        template.language ===
          value.templateLanguage
    );

  const parameters =
    getTemplateParameters(
      selectedTemplate
    );

  const mappedComponents =
    selectedTemplate
      ? buildMappedTemplateComponents(
          selectedTemplate
        )
      : null;

  const mappingComplete =
    Boolean(selectedTemplate) &&
    (
      parameters.length === 0 ||
      mappedComponents !== null
    );

  const mappedSignature =
    JSON.stringify(
      mappedComponents
    );

  const update = patch =>
    onChange({
      ...value,
      ...patch
    });

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    const nextComponents =
      mappedComponents === null
        ? (
            Array.isArray(
              value.templateComponents
            )
              ? []
              : ""
          )
        : formatComponentsForConsumer(
            mappedComponents,
            value.templateComponents
          );

    if (
      !sameComponentsValue(
        value.templateComponents,
        nextComponents
      )
    ) {
      update({
        templateComponents:
          nextComponents
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTemplate,
    mappedSignature
  ]);

  return (
    <>
      <FormControl
        fullWidth
        margin="dense"
        variant="outlined"
      >
        <InputLabel>
          Tipo de envio
        </InputLabel>

        <Select
          value={
            value.outboundMode ||
            "STANDARD"
          }
          onChange={event =>
            update({
              outboundMode:
                event.target.value
            })
          }
          label="Tipo de envio"
        >
          <MenuItem value="STANDARD">
            Envio padrão
          </MenuItem>

          <MenuItem value="OFFICIAL">
            WhatsApp Oficial
          </MenuItem>
        </Select>
      </FormControl>

      {value.outboundMode ===
        "OFFICIAL" && (
        <>
          {requireQueue && (
            <FormControl
              fullWidth
              margin="dense"
              variant="outlined"
            >
              <InputLabel>
                Setor responsável
              </InputLabel>

              <Select
                value={
                  value.ownerQueueId ||
                  ""
                }
                onChange={event =>
                  update({
                    ownerQueueId:
                      event.target.value
                  })
                }
                label="Setor responsável"
              >
                <MenuItem value="">
                  Selecione o setor responsável
                </MenuItem>

                {queues.map(queue => (
                  <MenuItem
                    key={queue.id}
                    value={queue.id}
                  >
                    {queue.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl
            fullWidth
            margin="dense"
            variant="outlined"
            disabled={
              requireQueue &&
              !value.ownerQueueId
            }
          >
            <InputLabel>
              Número oficial
            </InputLabel>

            <Select
              value={
                value.deliveryWhatsappId ||
                ""
              }
              onChange={event =>
                update({
                  deliveryWhatsappId:
                    event.target.value,
                  templateName: "",
                  templateLanguage: "",
                  templateComponents:
                    Array.isArray(
                      value.templateComponents
                    )
                      ? []
                      : ""
                })
              }
              label="Número oficial"
            >
              <MenuItem value="">
                Selecione o número oficial
              </MenuItem>

              {connections.map(
                connection => (
                  <MenuItem
                    key={connection.id}
                    value={connection.id}
                  >
                    {[
                      connection.name,
                      connection.phoneNumber
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>

          <FormControl
            fullWidth
            margin="dense"
            variant="outlined"
            disabled={
              !value.deliveryWhatsappId
            }
          >
            <InputLabel>
              Modelo de mensagem
            </InputLabel>

            <Select
              value={
                selectedTemplate
                  ? `${selectedTemplate.name}:${selectedTemplate.language}`
                  : ""
              }
              onChange={event => {
                const template =
                  templates.find(
                    item =>
                      `${item.name}:${item.language}` ===
                      event.target.value
                  );

                const nextMapped =
                  template
                    ? buildMappedTemplateComponents(
                        template
                      )
                    : [];

                update({
                  templateName:
                    template?.name || "",
                  templateLanguage:
                    template?.language || "",
                  templateComponents:
                    nextMapped === null
                      ? (
                          Array.isArray(
                            value.templateComponents
                          )
                            ? []
                            : ""
                        )
                      : formatComponentsForConsumer(
                          nextMapped,
                          value.templateComponents
                        )
                });
              }}
              label="Modelo de mensagem"
            >
              <MenuItem value="">
                Selecione um modelo de mensagem
              </MenuItem>

              {templates.map(template => {
                const complete =
                  templateMappingIsComplete(
                    template
                  );

                const hasParameters =
                  getTemplateParameters(
                    template
                  ).length > 0;

                return (
                  <MenuItem
                    key={`${template.name}:${template.language}`}
                    value={`${template.name}:${template.language}`}
                    disabled={
                      hasParameters &&
                      !complete
                    }
                  >
                    {[
                      template.name,
                      template.category,
                      template.language,
                      hasParameters &&
                      !complete
                        ? "mapear variáveis em Templates Meta"
                        : null
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {selectedTemplate &&
            parameters.length > 0 &&
            mappingComplete && (
              <Typography
                variant="body2"
                style={{
                  marginTop: 12
                }}
              >
                Variáveis dinâmicas configuradas automaticamente:{" "}
                {parameters
                  .map(parameter => {
                    const variableKey =
                      buildMappingIndex(
                        selectedTemplate
                      )[parameter.key];

                    return variableKey
                      ? `{{${variableKey}}}`
                      : "";
                  })
                  .filter(Boolean)
                  .join(", ")}
              </Typography>
            )}

          {selectedTemplate &&
            parameters.length > 0 &&
            !mappingComplete && (
              <Typography
                variant="body2"
                color="error"
                style={{
                  marginTop: 12
                }}
              >
                Este template ainda não possui mapeamento completo de variáveis SamaChat. Configure uma vez em Templates Meta.
              </Typography>
            )}

          {selectedTemplate?.components?.some(
            component =>
              component.text
          ) && (
            <>
              <Typography
                variant="subtitle2"
                style={{
                  marginTop: 12
                }}
              >
                Prévia da mensagem
              </Typography>

              <Typography variant="body2">
                {renderTemplatePreview(
                  selectedTemplate
                )}
              </Typography>
            </>
          )}
        </>
      )}
    </>
  );
};

export default OfficialOutboundConfig;