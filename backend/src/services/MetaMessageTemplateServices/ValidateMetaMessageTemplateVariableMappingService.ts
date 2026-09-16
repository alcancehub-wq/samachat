import AppError from "../../errors/AppError";
import { SYSTEM_MESSAGE_VARIABLES } from "../Variables/ResolveMessageVariablesService";
import {
  MetaMessageTemplate,
  MetaMessageTemplateVariableMapping
} from "./types";

interface Request {
  template: MetaMessageTemplate;
  variableMapping: unknown;
  requireComplete?: boolean;
}

const ALLOWED_COMPONENT_TYPES = new Set([
  "BODY",
  "HEADER"
]);

const SUPPORTED_VARIABLES = new Set<string>(
  SYSTEM_MESSAGE_VARIABLES
);

const collectTemplateParameterPositions = (
  template: MetaMessageTemplate
): Set<string> => {
  const positions = new Set<string>();

  (template.components || []).forEach(component => {
    const componentType = String(
      component.type || ""
    )
      .trim()
      .toUpperCase();

    if (!ALLOWED_COMPONENT_TYPES.has(componentType)) {
      return;
    }

    const text = String(component.text || "");
    const pattern = /{{(\d+)}}/g;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const position = Number(match[1]);

      if (
        Number.isInteger(position) &&
        position > 0
      ) {
        positions.add(
          `${componentType}:${position}`
        );
      }
    }
  });

  return positions;
};

const ValidateMetaMessageTemplateVariableMappingService = ({
  template,
  variableMapping,
  requireComplete = false
}: Request): MetaMessageTemplateVariableMapping[] => {
  if (
    variableMapping === undefined ||
    variableMapping === null
  ) {
    if (requireComplete) {
      const required =
        collectTemplateParameterPositions(template);

      if (required.size > 0) {
        throw new AppError(
          "ERR_META_TEMPLATE_VARIABLE_MAPPING_REQUIRED",
          400
        );
      }
    }

    return [];
  }

  if (!Array.isArray(variableMapping)) {
    throw new AppError(
      "ERR_META_TEMPLATE_VARIABLE_MAPPING_INVALID",
      400
    );
  }

  const templatePositions =
    collectTemplateParameterPositions(template);

  const seen = new Set<string>();

  const normalized =
    variableMapping.map(item => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        throw new AppError(
          "ERR_META_TEMPLATE_VARIABLE_MAPPING_INVALID",
          400
        );
      }

      const record =
        item as Record<string, unknown>;

      const componentType = String(
        record.componentType || ""
      )
        .trim()
        .toUpperCase();

      const position = Number(record.position);

      const variableKey = String(
        record.variableKey || ""
      ).trim();

      if (
        !ALLOWED_COMPONENT_TYPES.has(componentType) ||
        !Number.isInteger(position) ||
        position <= 0 ||
        !variableKey
      ) {
        throw new AppError(
          "ERR_META_TEMPLATE_VARIABLE_MAPPING_INVALID",
          400
        );
      }

      if (!SUPPORTED_VARIABLES.has(variableKey)) {
        throw new AppError(
          `ERR_META_TEMPLATE_VARIABLE_MAPPING_UNSUPPORTED:${variableKey}`,
          400
        );
      }

      const identity =
        `${componentType}:${position}`;

      if (seen.has(identity)) {
        throw new AppError(
          `ERR_META_TEMPLATE_VARIABLE_MAPPING_DUPLICATE:${identity}`,
          400
        );
      }

      if (!templatePositions.has(identity)) {
        throw new AppError(
          `ERR_META_TEMPLATE_VARIABLE_MAPPING_POSITION_NOT_FOUND:${identity}`,
          400
        );
      }

      seen.add(identity);

      return {
        componentType,
        position,
        variableKey
      };
    });

  if (requireComplete) {
    const missing = Array.from(
      templatePositions
    ).filter(identity => !seen.has(identity));

    if (missing.length > 0) {
      throw new AppError(
        `ERR_META_TEMPLATE_VARIABLE_MAPPING_INCOMPLETE:${missing.join(",")}`,
        400
      );
    }
  }

  return normalized.sort((left, right) => {
    const componentComparison =
      left.componentType.localeCompare(
        right.componentType
      );

    if (componentComparison !== 0) {
      return componentComparison;
    }

    return left.position - right.position;
  });
};

export default ValidateMetaMessageTemplateVariableMappingService;