interface EduzzWebhookPayload {
  id?: unknown;
  event?: unknown;
  data?: any;
}

export interface NormalizedEduzzWebhook {
  eventId: string;
  eventName: string;
  invoiceId: string | null;
  productIds: string[];
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  blinketEventId: string | null;
  blinketEventName: string | null;
  blinketTicketName: string | null;
  blinketParticipantId: string | null;
  blinketInviteKey: string | null;
  blinketParticipantName: string | null;
  blinketParticipantEmail: string | null;
  blinketParticipantPhone: string | null;
  blinketParticipantStatus: string | null;
}

const asString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
};

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = asString(value);

    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const NormalizeEduzzWebhookPayloadService = (
  payload: EduzzWebhookPayload
): NormalizedEduzzWebhook => {
  const data = payload?.data || {};
  const buyer = data?.buyer || {};

  const eventId = asString(payload?.id);
  const eventName = asString(payload?.event);

  if (!eventId) {
    throw new Error("ERR_EDUZZ_EVENT_ID_MISSING");
  }

  if (!eventName) {
    throw new Error("ERR_EDUZZ_EVENT_NAME_MISSING");
  }

  const items = Array.isArray(data?.items)
    ? data.items
    : data?.items
      ? [data.items]
      : [];

  const productIds: string[] = Array.from(
    new Set<string>(
      items
        .map((item: any): string | null =>
          firstString(
            item?.productId,
            item?.product_id,
            item?.id
          )
        )
        .filter((value: string | null): value is string => Boolean(value))
    )
  );

  return {
    eventId,
    eventName,
    invoiceId: asString(data?.id),
    productIds,
    buyerName: asString(buyer?.name),
    buyerEmail: asString(buyer?.email),
    buyerPhone: firstString(
      buyer?.cellphone,
      buyer?.phone,
      buyer?.phone2
    ),
    blinketEventId: firstString((payload as any)?.data?.event?.id),
    blinketEventName: firstString((payload as any)?.data?.event?.name),
    blinketTicketName: firstString((payload as any)?.data?.ticket?.name),
    blinketParticipantId: firstString((payload as any)?.data?.participant?.id),
    blinketInviteKey: firstString((payload as any)?.data?.participant?.inviteKey),
    blinketParticipantName: firstString((payload as any)?.data?.participant?.name),
    blinketParticipantEmail: firstString((payload as any)?.data?.participant?.email),
    blinketParticipantPhone: firstString((payload as any)?.data?.participant?.phone),
    blinketParticipantStatus: firstString((payload as any)?.data?.participant?.status)
  };
};

export default NormalizeEduzzWebhookPayloadService;
