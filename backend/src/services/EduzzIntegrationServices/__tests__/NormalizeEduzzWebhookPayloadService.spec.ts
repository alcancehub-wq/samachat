import NormalizeEduzzWebhookPayloadService from "../NormalizeEduzzWebhookPayloadService";

describe("NormalizeEduzzWebhookPayloadService", () => {
  it("normalizes invoice_paid buyer and product data", () => {
    const result =
      NormalizeEduzzWebhookPayloadService({
        id: "evt-invoice-1",
        event: "myeduzz.invoice_paid",
        data: {
          id: "invoice-123",
          buyer: {
            name: "Cliente Teste",
            email: "cliente@example.com",
            cellphone: "5511999999999"
          },
          items: [
            {
              productId: "prod-10",
              name: "Produto 10"
            },
            {
              productId: "prod-20",
              name: "Produto 20"
            }
          ]
        }
      } as any);

    expect(result.eventId).toBe("evt-invoice-1");
    expect(result.eventName).toBe(
      "myeduzz.invoice_paid"
    );

    expect(result.invoiceId).toBe(
      "invoice-123"
    );

    expect(result.buyerName).toBe(
      "Cliente Teste"
    );

    expect(result.buyerEmail).toBe(
      "cliente@example.com"
    );

    expect(result.buyerPhone).toBe(
      "5511999999999"
    );

    expect(result.productIds).toEqual([
      "prod-10",
      "prod-20"
    ]);
  });

  it("normalizes Blinket participant data", () => {
    const result =
      NormalizeEduzzWebhookPayloadService({
        id: "evt-blinket-1",
        event: "blinket.attendance_added",
        data: {
          event: {
            id: "event-1",
            name: "Evento Teste"
          },
          ticket: {
            name: "VIP"
          },
          participant: {
            id: "participant-1",
            inviteKey: "invite-123",
            name: "Participante Teste",
            email: "p@example.com",
            phone: "5511888888888",
            status: "confirmed"
          }
        }
      } as any);

    expect(result.eventId).toBe(
      "evt-blinket-1"
    );

    expect(result.blinketEventId).toBe(
      "event-1"
    );

    expect(result.blinketEventName).toBe(
      "Evento Teste"
    );

    expect(result.blinketTicketName).toBe(
      "VIP"
    );

    expect(result.blinketParticipantId).toBe(
      "participant-1"
    );

    expect(result.blinketInviteKey).toBe(
      "invite-123"
    );

    expect(result.blinketParticipantName).toBe(
      "Participante Teste"
    );

    expect(result.blinketParticipantEmail).toBe(
      "p@example.com"
    );

    expect(result.blinketParticipantPhone).toBe(
      "5511888888888"
    );

    expect(result.blinketParticipantStatus).toBe(
      "confirmed"
    );
  });
});
