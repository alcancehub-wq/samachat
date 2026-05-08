import { format } from "date-fns";

type ContactLike = {
  id?: number;
  name?: string | null;
  number?: string | null;
  email?: string | null;
};

type QueueLike = {
  id?: number;
  name?: string | null;
};

type UserLike = {
  id?: number;
  name?: string | null;
};

type TicketLike = {
  id?: number;
  contact?: ContactLike | null;
  user?: UserLike | null;
  queue?: QueueLike | null;
};

type CompanyLike = {
  name?: string | null;
};

type VariableMap = Record<string, string>;

interface Request {
  template: string;
  contact?: ContactLike | null;
  ticket?: TicketLike | null;
  user?: UserLike | null;
  company?: CompanyLike | null;
  extraData?: Record<string, unknown> | null;
  now?: Date;
}

interface Response {
  text: string;
  foundVariables: string[];
  unresolvedVariables: string[];
}

export const SYSTEM_MESSAGE_VARIABLES = [
  "nome",
  "telefone",
  "email",
  "ticket_id",
  "responsavel",
  "fila",
  "data_atual",
  "hora_atual"
] as const;

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

const normalizeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const collectTemplateVariables = (template: string): string[] => {
  const foundVariables = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    foundVariables.add(match[1]);
  }

  VARIABLE_PATTERN.lastIndex = 0;

  return Array.from(foundVariables);
};

const buildVariableMap = ({
  contact,
  ticket,
  user,
  extraData,
  now
}: Omit<Request, "template" | "company">): VariableMap => {
  const currentDate = now || new Date();
  const resolvedContact = contact || ticket?.contact || null;
  const resolvedUser = user || ticket?.user || null;
  const resolvedQueue = ticket?.queue || null;

  const systemValues: VariableMap = {
    nome: normalizeValue(resolvedContact?.name),
    name: normalizeValue(resolvedContact?.name),
    telefone: normalizeValue(resolvedContact?.number),
    email: normalizeValue(resolvedContact?.email),
    ticket_id: normalizeValue(ticket?.id),
    responsavel: normalizeValue(resolvedUser?.name),
    fila: normalizeValue(resolvedQueue?.name),
    data_atual: format(currentDate, "dd/MM/yyyy"),
    hora_atual: format(currentDate, "HH:mm")
  };

  if (!extraData) {
    return systemValues;
  }

  const customValues = Object.entries(extraData).reduce<VariableMap>(
    (accumulator, [key, value]) => {
      accumulator[key] = normalizeValue(value);
      return accumulator;
    },
    {}
  );

  return {
    ...systemValues,
    ...customValues
  };
};

const ResolveMessageVariablesService = ({
  template,
  contact,
  ticket,
  user,
  company: _company,
  extraData,
  now
}: Request): Response => {
  const safeTemplate = normalizeValue(template);
  const foundVariables = collectTemplateVariables(safeTemplate);
  const variableMap = buildVariableMap({ contact, ticket, user, extraData, now });

  const unresolvedVariables = foundVariables.filter(
    variable => !(variable in variableMap)
  );

  const text = safeTemplate.replace(
    VARIABLE_PATTERN,
    (_match, variableName: string) => {
      if (!(variableName in variableMap)) {
        return "";
      }

      return variableMap[variableName];
    }
  );

  VARIABLE_PATTERN.lastIndex = 0;

  return {
    text,
    foundVariables,
    unresolvedVariables
  };
};

export default ResolveMessageVariablesService;