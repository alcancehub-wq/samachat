import NormalizeCloudApiWebhook from "../NormalizeCloudApiWebhook";

describe("Cloud API coexistence history contract", () => {
  it("does not route history messages through the normal realtime normalizer", () => {
    const historyPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "history",
              value: {
                metadata: {
                  phone_number_id: "629748506897910"
                },
                history: [
                  {
                    metadata: {
                      phase: "history",
                      chunk_order: 1,
                      progress: 50
                    },
                    threads: [
                      {
                        messages: [
                          {
                            id: "wamid.history.out.1",
                            from: "5511981901577",
                            to: "553287072428",
                            timestamp: "1769000000",
                            type: "text",
                            text: {
                              body: "Mensagem historica do celular"
                            }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const result = NormalizeCloudApiWebhook(historyPayload, 35);

    expect(result).toHaveLength(0);
  });

  it("keeps normal smb_message_echoes on the realtime path", () => {
    const result = NormalizeCloudApiWebhook(
      {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "smb_message_echoes",
                value: {
                  message_echoes: [
                    {
                      id: "wamid.echo.live.1",
                      from: "5511981901577",
                      to: "553287072428",
                      timestamp: "1770000100",
                      type: "text",
                      text: {
                        body: "Mensagem nova do celular"
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
    expect(result[0].messagePayload.fromMe).toBe(true);
    expect(result[0].messagePayload.timestamp).toBe(1770000100);
  });
});
