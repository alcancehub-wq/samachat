import AppError from "../../errors/AppError";

const allowedVariables = new Set([
  "nome",
  "telefone",
  "email",
  "ticket_id",
  "responsavel",
  "fila",
  "bom_dia",
  "boa_tarde",
  "boa_noite",
  "data_atual",
  "hora_atual",
  "eduzz_comprador_nome",
  "eduzz_comprador_email",
  "eduzz_comprador_telefone",
  "eduzz_fatura_id",
  "eduzz_produto_id",
  "eduzz_evento_id",
  "eduzz_evento_nome",
  "blinket_evento_id",
  "blinket_evento_nome",
  "blinket_participante_id",
  "blinket_invite_key",
  "blinket_ingresso_nome",
  "blinket_participante_nome",
  "blinket_participante_email",
  "blinket_participante_telefone",
  "blinket_participante_status"
]);

interface TemplateParameter {
  type?: unknown;
  text?: unknown;
}

interface TemplateComponent {
  type?: unknown;
  parameters?: unknown;
}

const variablePattern =
  /^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/;

const ValidateEduzzMetaTemplateComponentsService = (
  components: unknown
): Array<Record<string, unknown>> | null => {
  if (
    components === null ||
    components === undefined
  ) {
    return null;
  }

  if (!Array.isArray(components)) {
    throw new AppError(
      "ERR_EDUZZ_META_TEMPLATE_COMPONENTS_INVALID",
      422
    );
  }

  if (components.length === 0) {
    return [];
  }

  return components.map(rawComponent => {
    if (
      !rawComponent ||
      typeof rawComponent !== "object"
    ) {
      throw new AppError(
        "ERR_EDUZZ_META_TEMPLATE_COMPONENT_INVALID",
        422
      );
    }

    const component =
      rawComponent as TemplateComponent;

    const type =
      String(component.type || "")
        .trim()
        .toLowerCase();

    if (
      type !== "header" &&
      type !== "body"
    ) {
      throw new AppError(
        "ERR_EDUZZ_META_TEMPLATE_COMPONENT_TYPE_UNSUPPORTED",
        422
      );
    }

    if (!Array.isArray(component.parameters)) {
      throw new AppError(
        "ERR_EDUZZ_META_TEMPLATE_PARAMETERS_INVALID",
        422
      );
    }

    const parameters =
      component.parameters.map(
        rawParameter => {
          if (
            !rawParameter ||
            typeof rawParameter !== "object"
          ) {
            throw new AppError(
              "ERR_EDUZZ_META_TEMPLATE_PARAMETER_INVALID",
              422
            );
          }

          const parameter =
            rawParameter as TemplateParameter;

          if (
            String(parameter.type || "")
              .trim()
              .toLowerCase() !== "text"
          ) {
            throw new AppError(
              "ERR_EDUZZ_META_TEMPLATE_PARAMETER_TYPE_UNSUPPORTED",
              422
            );
          }

          const text =
            String(parameter.text || "").trim();

          const match =
            text.match(variablePattern);

          if (!match) {
            throw new AppError(
              "ERR_EDUZZ_META_TEMPLATE_VARIABLE_INVALID",
              422
            );
          }

          const variableKey = match[1];

          if (!allowedVariables.has(variableKey)) {
            throw new AppError(
              "ERR_EDUZZ_META_TEMPLATE_VARIABLE_NOT_ALLOWED",
              422
            );
          }

          return {
            type: "text",
            text: `{{${variableKey}}}`
          };
        }
      );

    return {
      type,
      parameters
    };
  });
};

export default ValidateEduzzMetaTemplateComponentsService;
