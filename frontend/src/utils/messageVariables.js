export const AVAILABLE_MESSAGE_VARIABLES = [
  {
    key: "nome",
    token: "{{nome}}",
    descriptionKey: "name"
  },
  {
    key: "telefone",
    token: "{{telefone}}",
    descriptionKey: "phone"
  },
  {
    key: "email",
    token: "{{email}}",
    descriptionKey: "email"
  },
  {
    key: "ticket_id",
    token: "{{ticket_id}}",
    descriptionKey: "ticketId"
  },
  {
    key: "responsavel",
    token: "{{responsavel}}",
    descriptionKey: "assignee"
  },
  {
    key: "fila",
    token: "{{fila}}",
    descriptionKey: "queue"
  },
  {
    key: "bom_dia",
    token: "{{bom_dia}}",
    descriptionKey: "goodMorning"
  },
  {
    key: "boa_tarde",
    token: "{{boa_tarde}}",
    descriptionKey: "goodAfternoon"
  },
  {
    key: "boa_noite",
    token: "{{boa_noite}}",
    descriptionKey: "goodEvening"
  },
  {
    key: "data_atual",
    token: "{{data_atual}}",
    descriptionKey: "currentDate"
  },
  {
    key: "hora_atual",
    token: "{{hora_atual}}",
    descriptionKey: "currentTime"
  }
];

export const buildDialogSystemVariables = () => {
  return AVAILABLE_MESSAGE_VARIABLES.map(variable => ({
    key: variable.key,
    label: variable.token,
    example: ""
  }));
};

export const appendMessageVariable = (value, token) => {
  const currentValue = value || "";

  if (!currentValue.trim()) {
    return token;
  }

  const separator = /[\s\n]$/.test(currentValue) ? "" : " ";

  return `${currentValue}${separator}${token}`;
};
