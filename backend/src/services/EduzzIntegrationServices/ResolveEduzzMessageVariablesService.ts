import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import ResolveMessageVariablesService from "../Variables/ResolveMessageVariablesService";

interface Request {
  value: unknown;
  ticket: Ticket;
  extraData: Record<string, unknown>;
}

interface ResolutionResult {
  value: unknown;
  unresolvedVariables: string[];
}

const resolveString = (
  value: string,
  ticket: Ticket,
  extraData: Record<string, unknown>
): ResolutionResult => {
  const result = ResolveMessageVariablesService({
    template: value,
    ticket,
    contact: ticket.contact,
    user: ticket.user,
    extraData
  });

  return {
    value: result.text,
    unresolvedVariables: result.unresolvedVariables
  };
};

const resolveValue = (
  value: unknown,
  ticket: Ticket,
  extraData: Record<string, unknown>
): ResolutionResult => {
  if (typeof value === "string") {
    return resolveString(value, ticket, extraData);
  }

  if (Array.isArray(value)) {
    const unresolvedVariables = new Set<string>();

    const resolved = value.map(item => {
      const result = resolveValue(item, ticket, extraData);

      result.unresolvedVariables.forEach(variable =>
        unresolvedVariables.add(variable)
      );

      return result.value;
    });

    return {
      value: resolved,
      unresolvedVariables: Array.from(unresolvedVariables)
    };
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const unresolvedVariables = new Set<string>();
    const resolved: Record<string, unknown> = {};

    Object.entries(value as Record<string, unknown>).forEach(
      ([key, nestedValue]) => {
        const result = resolveValue(
          nestedValue,
          ticket,
          extraData
        );

        result.unresolvedVariables.forEach(variable =>
          unresolvedVariables.add(variable)
        );

        resolved[key] = result.value;
      }
    );

    return {
      value: resolved,
      unresolvedVariables: Array.from(unresolvedVariables)
    };
  }

  return {
    value,
    unresolvedVariables: []
  };
};

const ResolveEduzzMessageVariablesService = ({
  value,
  ticket,
  extraData
}: Request): unknown => {
  const result = resolveValue(
    value,
    ticket,
    extraData
  );

  if (result.unresolvedVariables.length > 0) {
    throw new AppError(
      `ERR_EDUZZ_UNRESOLVED_VARIABLES:${result.unresolvedVariables.join(",")}`,
      422
    );
  }

  return result.value;
};

export default ResolveEduzzMessageVariablesService;
