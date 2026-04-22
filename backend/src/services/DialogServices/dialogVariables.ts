export interface DialogVariable {
  key: string;
  label?: string;
  example?: string;
}

const normalizeValue = (value?: string): string => {
  if (!value) {
    return "";
  }

  return value.trim();
};

export const normalizeDialogVariables = (
  variables?: DialogVariable[]
): DialogVariable[] => {
  if (!variables || !Array.isArray(variables)) {
    return [];
  }

  return variables
    .map(variable => ({
      key: normalizeValue(variable?.key),
      label: normalizeValue(variable?.label),
      example: normalizeValue(variable?.example)
    }))
    .filter(variable => !!variable.key);
};

export const stringifyDialogVariables = (
  variables?: DialogVariable[]
): string | null => {
  const normalized = normalizeDialogVariables(variables);

  if (normalized.length === 0) {
    return null;
  }

  return JSON.stringify(normalized);
};

export const parseDialogVariables = (
  value?: string | null
): DialogVariable[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeDialogVariables(parsed);
  } catch (error) {
    return [];
  }
};
