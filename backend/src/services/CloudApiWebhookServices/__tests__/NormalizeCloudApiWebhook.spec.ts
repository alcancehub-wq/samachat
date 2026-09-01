import NormalizeCloudApiWebhook from "../NormalizeCloudApiWebhook";

describe("NormalizeCloudApiWebhook", () => {
  it("preserves the existing official text contract", () => {
    const result = NormalizeCloudApiWebhook(
      {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  contacts: [
                    {
                      profile: {
                        name: "Cliente Teste"
                      },
                      wa_id: "5511999999999"
                    }
                  ],
                  metadata: {
                    phone_number_id: "629748506897910"
                  },
                  messages: [
                    {
                      id: "wamid.text.1",
                      from: "5511999999999",
                      timestamp: "1770000000",
                      type: "text",
                      text: {
                        body: "Mensagem texto"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      35
    );

    expect(result).toHaveLength(1);

    expect(result[0]).toEqual(
      expect.objectContaining({
        contactPayload: {
          name: "Cliente Teste",
          number: "5511999999999",
          isGroup: false
        },
        messagePayload: expect.objectContaining({
          id: "wamid.text.1",
          body: "Mensagem texto",
          fromMe: false,
          hasMedia: false,
          type: "chat",
          from: "5511999999999@c.us",
          to: "629748506897910@c.us",
          ack: 0
        }),
        contextPayload: {
          whatsappId: 35,
          unreadMessages: 1
        }
      })
    );

    expect(result[0].cloudMedia).toBeUndefined();
  });

  it("normalizes inbound official audio preserving media id", () => {
    const result = NormalizeCloudApiWebhook(
      {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  contacts: [
                    {
                      profile: {
                        name: "Cliente Audio"
                      },
                      wa_id: "5511988887777"
                    }
                  ],
                  metadata: {
                    phone_number_id: "629748506897910"
                  },
                  messages: [
                    {
                      id: "wamid.audio.1",
                      from: "5511988887777",
                      timestamp: "1770000001",
                      type: "audio",
                      audio: {
                        id: "meta-media-audio-1",
                        mime_type: "audio/ogg",
                        sha256: "abc123",
                        voice: true
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      35
    );

    expect(result).toHaveLength(1);

    expect(result[0].messagePayload).toEqual(
      expect.objectContaining({
        id: "wamid.audio.1",
        body: "",
        fromMe: false,
        hasMedia: true,
        type: "audio"
      })
    );

    expect(result[0].cloudMedia).toEqual({
      id: "meta-media-audio-1",
      type: "audio",
      mimetype: "audio/ogg",
      filename: undefined,
      caption: undefined
    });
  });

  it("normalizes inbound official document filename and caption", () => {
    const result = NormalizeCloudApiWebhook(
      {
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: {
                    phone_number_id: "629748506897910"
                  },
                  messages: [
                    {
                      id: "wamid.document.1",
                      from: "5511977776666",
                      timestamp: "1770000002",
                      type: "document",
                      document: {
                        id: "meta-document-1",
                        mime_type: "application/pdf",
                        filename: "contrato.pdf",
                        caption: "Contrato assinado"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      35
    );

    expect(result).toHaveLength(1);

    expect(result[0].messagePayload).toEqual(
      expect.objectContaining({
        body: "Contrato assinado",
        hasMedia: true,
        type: "document"
      })
    );

    expect(result[0].cloudMedia).toEqual({
      id: "meta-document-1",
      type: "document",
      mimetype: "application/pdf",
      filename: "contrato.pdf",
      caption: "Contrato assinado"
    });
  });

  it("ignores unsupported message types", () => {
    const result = NormalizeCloudApiWebhook(
      {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: "wamid.sticker.1",
                      from: "5511966665555",
                      timestamp: "1770000003",
                      type: "sticker"
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      35
    );

    expect(result).toHaveLength(0);
  });

  it("ignores media without media id", () => {
    const result = NormalizeCloudApiWebhook(
      {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: "wamid.audio.noid",
                      from: "5511955554444",
                      timestamp: "1770000004",
                      type: "audio",
                      audio: {
                        mime_type: "audio/ogg"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      35
    );

    expect(result).toHaveLength(0);
  });
});
describe("NormalizeCloudApiWebhook coexistence message echoes", () => {
  it("normalizes outbound message sent from WhatsApp Business App", () => {
    const result = NormalizeCloudApiWebhook(
      {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "smb_message_echoes",
                value: {
                  metadata: {
                    display_phone_number: "+55 11 98190-1577",
                    phone_number_id: "629748506897910"
                  },
                  message_echoes: [
                    {
                      from: "5511981901577",
                      to: "553287072428",
                      id: "wamid.coex.echo.1",
                      timestamp: "1770000100",
                      type: "text",
                      text: {
                        body: "Resposta enviada pelo celular"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      35
    );

    expect(result).toHaveLength(1);

    expect(result[0]).toEqual(
      expect.objectContaining({
        contactPayload: {
          name: "553287072428",
          number: "553287072428",
          isGroup: false
        },
        messagePayload: expect.objectContaining({
          id: "wamid.coex.echo.1",
          body: "Resposta enviada pelo celular",
          fromMe: true,
          hasMedia: false,
          type: "chat",
          timestamp: 1770000100,
          from: "5511981901577@c.us",
          to: "553287072428@c.us"
        }),
        contextPayload: {
          whatsappId: 35,
          unreadMessages: 0
        },
        isCoexistenceMessageEcho: true
      })
    );
  });

  it("rejects echoes without a provider WAMID or timestamp", () => {
    const result = NormalizeCloudApiWebhook(
      {
        entry: [
          {
            changes: [
              {
                field: "smb_message_echoes",
                value: {
                  message_echoes: [
                    {
                      from: "5511981901577",
                      to: "553287072428",
                      type: "text",
                      text: { body: "Sem identidade do provider" }
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      35
    );

    expect(result).toHaveLength(0);
  });
});
