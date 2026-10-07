import { toZonedParts } from "./timezone";

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado"
];

export interface PromptContext {
  now: Date;
  timeZone: string;
  contactName?: string | null;
  contactNumber?: string | null;
  companyName?: string | null;
}

const formatDateBR = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// Preenche as variaveis {{ ... }} do prompt (mesmas da BIA SDR). Variavel
// desconhecida e mantida como esta, para o erro ficar visivel no texto.
export const renderPrompt = (template: string, ctx: PromptContext): string => {
  const { date, time } = toZonedParts(ctx.now, ctx.timeZone);
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

  const values: Record<string, string> = {
    data_hora: `${formatDateBR(date)} ${time}`,
    data: formatDateBR(date),
    hora: time,
    dia_semana: weekday,
    cliente_nome: ctx.contactName || "",
    cliente_telefone: ctx.contactNumber || "",
    empresa: ctx.companyName || ""
  };

  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, key) =>
    key in values ? values[key] : whole
  );
};
