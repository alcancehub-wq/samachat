interface Request {
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  invoiceId?: string | null;
  productIds?: string[] | null;
  eventId?: string | null;
  eventName?: string | null;
  blinketEventId?: string | null;
  blinketEventName?: string | null;
  blinketTicketName?: string | null;
  blinketParticipantId?: string | null;
  blinketInviteKey?: string | null;
  blinketParticipantName?: string | null;
  blinketParticipantEmail?: string | null;
  blinketParticipantPhone?: string | null;
  blinketParticipantStatus?: string | null;
}

type Response = Record<string, string>;

const normalize = (value?: string | null): string => {
  return String(value || "").trim();
};

const BuildEduzzMessageExtraDataService = ({
  buyerName,
  buyerEmail,
  buyerPhone,
  invoiceId,
  productIds,
  eventId,
  eventName,
  blinketEventId,
  blinketEventName,
  blinketTicketName,
  blinketParticipantId,
  blinketInviteKey,
  blinketParticipantName,
  blinketParticipantEmail,
  blinketParticipantPhone,
  blinketParticipantStatus
}: Request): Response => {
  return {
    eduzz_comprador_nome: normalize(buyerName),
    eduzz_comprador_email: normalize(buyerEmail),
    eduzz_comprador_telefone: normalize(buyerPhone),
    eduzz_fatura_id: normalize(invoiceId),
    eduzz_produto_id: Array.isArray(productIds)
      ? productIds.map(normalize).filter(Boolean).join(", ")
      : "",
    eduzz_evento_id: normalize(eventId),
    eduzz_evento_nome: normalize(eventName),
    blinket_evento_id: normalize(blinketEventId),
    blinket_evento_nome: normalize(blinketEventName),
    blinket_participante_id: normalize(blinketParticipantId),
    blinket_invite_key: normalize(blinketInviteKey),
    blinket_ingresso_nome: normalize(blinketTicketName),
    blinket_participante_nome: normalize(blinketParticipantName),
    blinket_participante_email: normalize(blinketParticipantEmail),
    blinket_participante_telefone: normalize(blinketParticipantPhone),
    blinket_participante_status: normalize(blinketParticipantStatus)
  };
};

export default BuildEduzzMessageExtraDataService;
