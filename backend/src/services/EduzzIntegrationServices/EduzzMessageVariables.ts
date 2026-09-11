export interface EduzzMessageVariableDefinition {
  sequence: number;
  key: string;
  label: string;
}

export const EDUZZ_MESSAGE_VARIABLES: EduzzMessageVariableDefinition[] = [
  {
    sequence: 12,
    key: "eduzz_comprador_nome",
    label: "Nome do comprador"
  },
  {
    sequence: 13,
    key: "eduzz_comprador_email",
    label: "E-mail do comprador"
  },
  {
    sequence: 14,
    key: "eduzz_comprador_telefone",
    label: "Telefone do comprador"
  },
  {
    sequence: 15,
    key: "eduzz_fatura_id",
    label: "ID da fatura"
  },
  {
    sequence: 16,
    key: "eduzz_produto_id",
    label: "ID do produto"
  },
  {
    sequence: 17,
    key: "eduzz_evento_id",
    label: "ID do evento Eduzz"
  },
  {
    sequence: 18,
    key: "eduzz_evento_nome",
    label: "Nome do evento Eduzz"
  },
  {
    sequence: 19,
    key: "blinket_evento_id",
    label: "ID do evento Blinket"
  },
  {
    sequence: 20,
    key: "blinket_evento_nome",
    label: "Nome do evento Blinket"
  },
  {
    sequence: 21,
    key: "blinket_participante_id",
    label: "ID do participante Blinket"
  },
  {
    sequence: 22,
    key: "blinket_invite_key",
    label: "Invite Key do ingresso"
  },
  {
    sequence: 23,
    key: "blinket_ingresso_nome",
    label: "Nome do ingresso"
  },
  {
    sequence: 24,
    key: "blinket_participante_nome",
    label: "Nome do participante"
  },
  {
    sequence: 25,
    key: "blinket_participante_email",
    label: "E-mail do participante"
  },
  {
    sequence: 26,
    key: "blinket_participante_telefone",
    label: "Telefone do participante"
  },
  {
    sequence: 27,
    key: "blinket_participante_status",
    label: "Status do participante"
  }
];

export default EDUZZ_MESSAGE_VARIABLES;
