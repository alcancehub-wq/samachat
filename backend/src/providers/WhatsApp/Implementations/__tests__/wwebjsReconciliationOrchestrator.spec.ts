import createWWebJsReconciliationOrchestrator from "../wwebjsReconciliationOrchestrator";

const makeSignal = () => ({
  aborted: false,
  throwIfAborted: jest.fn()
});

const makeMessage = (
  messageId: string
): any => ({
  messageId,

  metadata: {
    name: "Contato",
    number: "5511999999999",
    isGroup: false
  },

  processNewMessage:
    async () => undefined
});

const makeContact = (
  number: string,
  lid?: string
): any => ({
  metadata: {
    name: `Contato ${number}`,
    number,
    lid,
    isGroup: false
  }
});

describe(
  "wwebjsReconciliationOrchestrator",
  () => {
    const capturedBoundaryAt =
      new Date("2026-08-17T12:00:00.000Z");

    const existingCheckpointAt =
      new Date("2026-08-17T11:00:00.000Z");

    const lowerBoundAt =
      new Date("2026-08-17T11:00:00.000Z");

    const checkpointCandidateAt =
      new Date("2026-08-17T12:00:00.000Z");

    const createDependencies = (
      overrides: Record<string, any> = {}
    ): any => ({
      captureBoundaryAt:
        jest.fn(() => capturedBoundaryAt),

      loadCheckpointAt:
        jest.fn(
          async () =>
            existingCheckpointAt
        ),

      resolveBoundary:
        jest.fn(async () => ({
          lowerBoundAt,
          checkpointCandidateAt
        })),

      listChats:
        jest.fn(async () => [
          {
            id: "5511111111111@c.us",
            eligible: true
          },
          {
            id: "5511111111111@c.us",
            eligible: true
          },
          {
            id: "120363000000000000@g.us",
            eligible: true
          },
          {
            id: "status@broadcast",
            eligible: false
          }
        ]),

      getChatId:
        jest.fn(
          (chat: any) =>
            chat.id
        ),

      isEligibleChat:
        jest.fn(
          (chat: any) =>
            chat.eligible
        ),

      collectChatWork:
        jest.fn(
          async ({ chatId }: any) => [
            makeMessage(
              `message:${chatId}`
            )
          ]
        ),

      listContacts:
        jest.fn(async () => [
          {
            number: "5511111111111",
            lid: "lid-1"
          },
          {
            number: "5511111111111",
            lid: "lid-1"
          },
          {
            number: "5522222222222",
            lid: "lid-2"
          }
        ]),

      mapContact:
        jest.fn(
          async (contact: any) =>
            makeContact(
              contact.number,
              contact.lid
            )
        ),

      getContactIdentityKey:
        jest.fn(
          (contact: any) =>
            `${
              contact.metadata.number || ""
            }|${
              contact.metadata.lid || ""
            }`
        ),

      saveCheckpoint:
        jest.fn(async () => undefined),

      ...overrides
    });

    it(
      "uses one boundary for the whole run and deduplicates chat fan-out",
      async () => {
        const dependencies =
          createDependencies();

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        const signal = makeSignal();

        const work =
          await orchestrator.collectWork(
            signal as any
          );

        expect(
          dependencies.captureBoundaryAt
        ).toHaveBeenCalledTimes(1);

        expect(
          dependencies.loadCheckpointAt
        ).toHaveBeenCalledTimes(1);

        expect(
          dependencies.resolveBoundary
        ).toHaveBeenCalledTimes(1);

        expect(
          dependencies.resolveBoundary
        ).toHaveBeenCalledWith(
          {
            existingCheckpointAt,
            capturedBoundaryAt
          },
          signal
        );

        expect(
          dependencies.listChats
        ).toHaveBeenCalledTimes(1);

        expect(
          dependencies.collectChatWork
        ).toHaveBeenCalledTimes(2);

        const collectCalls =
          dependencies.collectChatWork.mock.calls;

        expect(
          collectCalls[0][0].lowerBoundAt
        ).toBe(lowerBoundAt);

        expect(
          collectCalls[1][0].lowerBoundAt
        ).toBe(lowerBoundAt);

        expect(
          collectCalls.map(
            (call: any[]) =>
              call[0].chatId
          )
        ).toEqual([
          "5511111111111@c.us",
          "120363000000000000@g.us"
        ]);

        expect(work.messages).toHaveLength(2);
      }
    );

    it(
      "enumerates standalone contacts once and deduplicates mapped identities",
      async () => {
        const dependencies =
          createDependencies();

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        const work =
          await orchestrator.collectWork(
            makeSignal() as any
          );

        expect(
          dependencies.listContacts
        ).toHaveBeenCalledTimes(1);

        expect(
          dependencies.mapContact
        ).toHaveBeenCalledTimes(3);

        expect(work.contacts).toHaveLength(2);

        expect(
          work.contacts?.map(
            (item: any) =>
              item.metadata.number
          )
        ).toEqual([
          "5511111111111",
          "5522222222222"
        ]);
      }
    );

    it(
      "does not persist checkpoint during collection",
      async () => {
        const dependencies =
          createDependencies();

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        await orchestrator.collectWork(
          makeSignal() as any
        );

        expect(
          dependencies.saveCheckpoint
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "finalizes exactly the candidate produced by the successful collection",
      async () => {
        const dependencies =
          createDependencies();

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        const signal = makeSignal();

        await orchestrator.collectWork(
          signal as any
        );

        await orchestrator.finalizeWork(
          signal as any
        );

        expect(
          dependencies.saveCheckpoint
        ).toHaveBeenCalledTimes(1);

        expect(
          dependencies.saveCheckpoint
        ).toHaveBeenCalledWith({
          whatsappId: 101,
          checkpointCandidateAt,
          signal
        });
      }
    );

    it(
      "refuses finalize before a successful collection",
      async () => {
        const dependencies =
          createDependencies();

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        await expect(
          orchestrator.finalizeWork(
            makeSignal() as any
          )
        ).rejects.toThrow(
          "ERR_WHATSAPP_RECONCILIATION_NOT_READY_TO_FINALIZE"
        );

        expect(
          dependencies.saveCheckpoint
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not expose a checkpoint candidate after partial chat collection failure",
      async () => {
        const dependencies =
          createDependencies({
            collectChatWork:
              jest.fn(
                async ({
                  chatId
                }: any) => {
                  if (
                    chatId.endsWith(
                      "@g.us"
                    )
                  ) {
                    throw new Error(
                      "chat collection failed"
                    );
                  }

                  return [
                    makeMessage(
                      `message:${chatId}`
                    )
                  ];
                }
              )
          });

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        await expect(
          orchestrator.collectWork(
            makeSignal() as any
          )
        ).rejects.toThrow(
          "chat collection failed"
        );

        await expect(
          orchestrator.finalizeWork(
            makeSignal() as any
          )
        ).rejects.toThrow(
          "ERR_WHATSAPP_RECONCILIATION_NOT_READY_TO_FINALIZE"
        );

        expect(
          dependencies.saveCheckpoint
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not expose a checkpoint candidate when standalone contact enumeration fails",
      async () => {
        const dependencies =
          createDependencies({
            listContacts:
              jest.fn(async () => {
                throw new Error(
                  "contact enumeration failed"
                );
              })
          });

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        await expect(
          orchestrator.collectWork(
            makeSignal() as any
          )
        ).rejects.toThrow(
          "contact enumeration failed"
        );

        await expect(
          orchestrator.finalizeWork(
            makeSignal() as any
          )
        ).rejects.toThrow(
          "ERR_WHATSAPP_RECONCILIATION_NOT_READY_TO_FINALIZE"
        );

        expect(
          dependencies.saveCheckpoint
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "checks cancellation after checkpoint persistence",
      async () => {
        const dependencies =
          createDependencies();

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        await orchestrator.collectWork(
          makeSignal() as any
        );

        let checks = 0;

        const cancellationError =
          new Error("ownership lost");

        const signal = {
          aborted: false,

          throwIfAborted:
            jest.fn(() => {
              checks += 1;

              if (checks === 2) {
                throw cancellationError;
              }
            })
        };

        await expect(
          orchestrator.finalizeWork(
            signal as any
          )
        ).rejects.toBe(
          cancellationError
        );

        expect(
          dependencies.saveCheckpoint
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "resets prior candidate before a subsequent failed collection",
      async () => {
        let failSecondRun = false;

        const dependencies =
          createDependencies({
            listChats:
              jest.fn(async () => {
                if (failSecondRun) {
                  throw new Error(
                    "second run failed"
                  );
                }

                return [];
              }),

            listContacts:
              jest.fn(async () => [])
          });

        const orchestrator =
          createWWebJsReconciliationOrchestrator({
            whatsappId: 101,
            dependencies
          });

        await orchestrator.collectWork(
          makeSignal() as any
        );

        failSecondRun = true;

        await expect(
          orchestrator.collectWork(
            makeSignal() as any
          )
        ).rejects.toThrow(
          "second run failed"
        );

        await expect(
          orchestrator.finalizeWork(
            makeSignal() as any
          )
        ).rejects.toThrow(
          "ERR_WHATSAPP_RECONCILIATION_NOT_READY_TO_FINALIZE"
        );

        expect(
          dependencies.saveCheckpoint
        ).not.toHaveBeenCalled();
      }
    );
  }
);