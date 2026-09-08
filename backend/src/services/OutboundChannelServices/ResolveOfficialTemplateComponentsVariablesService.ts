import AppError from "../../errors/AppError";
import ResolveMessageVariablesService, {
  SYSTEM_MESSAGE_VARIABLES
} from "../Variables/ResolveMessageVariablesService";

type ContactLike = {
  id?: number;
  name?: string | null;
  number?: string | null;
  email?: string | null;
};

type UserLike = {
  id?: number;
  name?: string | null;
};

type QueueLike = {
  id?: number;
  name?: string | null;
};

type TicketLike = {
  id?: number;
  contact?: ContactLike | null;
  user?: UserLike | null;
  queue?: QueueLike | null;
};

interface Request {
  components?: Array<Record<string, unknown>>;
  contact?: ContactLike | null;
  ticket?: TicketLike | null;
  user?: UserLike | null;
  now?: Date;
}

const resolveKnownVariables = (
  value: string,
  context: Omit<Request, "components">
): string => {
  let resolvedValue = value;

  SYSTEM_MESSAGE_VARIABLES.forEach(variable => {
    const pattern = new RegExp(
      `{{\\s*${variable}\\s*}}`,
      "g"
    );

    if (!pattern.test(resolvedValue)) {
      return;
    }

    pattern.lastIndex = 0;

    const result = ResolveMessageVariablesService({
      template: `{{${variable}}}`,
      contact: context.contact,
      ticket: context.ticket,
      user: context.user,
      now: context.now
    });

    if (!result.text) {
      throw new AppError(
        `ERR_META_TEMPLATE_VARIABLE_EMPTY:${variable}`,
        400
      );
    }

    resolvedValue = resolvedValue.replace(
      pattern,
      result.text
    );
  });

  return resolvedValue;
};

export const hasOfficialTemplateSystemVariables = (
  components?: Array<Record<string, unknown>>
): boolean => {
  if (!components) {
    return false;
  }

  return components.some(component => {
    const parameters = component.parameters;

    if (!Array.isArray(parameters)) {
      return false;
    }

    return parameters.some(parameter => {
      if (
        !parameter ||
        typeof parameter !== "object"
      ) {
        return false;
      }

      const typedParameter =
        parameter as Record<string, unknown>;

      if (
        typedParameter.type !== "text" ||
        typeof typedParameter.text !== "string"
      ) {
        return false;
      }

      return SYSTEM_MESSAGE_VARIABLES.some(variable =>
        new RegExp(
          `{{\\s*${variable}\\s*}}`
        ).test(typedParameter.text as string)
      );
    });
  });
};
const ResolveOfficialTemplateComponentsVariablesService = ({
  components,
  contact,
  ticket,
  user,
  now
}: Request): Array<Record<string, unknown>> | undefined => {
  if (!components) {
    return undefined;
  }

  return components.map(component => {
    const parameters = component.parameters;

    if (!Array.isArray(parameters)) {
      return component;
    }

    return {
      ...component,
      parameters: parameters.map(parameter => {
        if (
          !parameter ||
          typeof parameter !== "object"
        ) {
          return parameter;
        }

        const typedParameter =
          parameter as Record<string, unknown>;

        if (
          typedParameter.type !== "text" ||
          typeof typedParameter.text !== "string"
        ) {
          return parameter;
        }

        return {
          ...typedParameter,
          text: resolveKnownVariables(
            typedParameter.text,
            {
              contact,
              ticket,
              user,
              now
            }
          )
        };
      })
    };
  });
};

export default ResolveOfficialTemplateComponentsVariablesService;