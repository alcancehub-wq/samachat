import BuildEduzzMessageExtraDataService from "../BuildEduzzMessageExtraDataService";

describe("BuildEduzzMessageExtraDataService", () => {
  it("maps Eduzz and Blinket variables without collisions", () => {
    const data =
      BuildEduzzMessageExtraDataService({
        buyerName: "Cliente",
        buyerEmail: "cliente@example.com",
        buyerPhone: "5511999999999",
        invoiceId: "invoice-1",
        productIds: ["prod-1"],
        eventId: "evt-1",
        eventName: "myeduzz.invoice_paid",
        blinketEventId: "event-1",
        blinketEventName: "Evento",
        blinketTicketName: "VIP",
        blinketParticipantId: "participant-1",
        blinketInviteKey: "invite-1",
        blinketParticipantName: "Participante",
        blinketParticipantEmail: "p@example.com",
        blinketParticipantPhone: "5511888888888",
        blinketParticipantStatus: "confirmed"
      });

    expect(data.eduzz_comprador_nome).toBe(
      "Cliente"
    );

    expect(data.eduzz_comprador_email).toBe(
      "cliente@example.com"
    );

    expect(data.eduzz_comprador_telefone).toBe(
      "5511999999999"
    );

    expect(data.eduzz_fatura_id).toBe(
      "invoice-1"
    );

    expect(data.eduzz_produto_id).toBe(
      "prod-1"
    );

    expect(data.eduzz_evento_id).toBe(
      "evt-1"
    );

    expect(data.eduzz_evento_nome).toBe(
      "myeduzz.invoice_paid"
    );

    expect(data.blinket_evento_id).toBe(
      "event-1"
    );

    expect(data.blinket_evento_nome).toBe(
      "Evento"
    );

    expect(data.blinket_ingresso_nome).toBe(
      "VIP"
    );

    expect(data.blinket_participante_id).toBe(
      "participant-1"
    );

    expect(data.blinket_invite_key).toBe(
      "invite-1"
    );

    expect(data.blinket_participante_nome).toBe(
      "Participante"
    );

    expect(data.blinket_participante_email).toBe(
      "p@example.com"
    );

    expect(data.blinket_participante_telefone).toBe(
      "5511888888888"
    );

    expect(data.blinket_participante_status).toBe(
      "confirmed"
    );
  });
});
