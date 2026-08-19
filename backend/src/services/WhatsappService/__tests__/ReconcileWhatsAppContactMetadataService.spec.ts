const createOrUpdateContactMock = jest.fn();

jest.mock(
  "../../ContactServices/CreateOrUpdateContactService",
  () => ({
    __esModule: true,
    default: (...args: any[]) =>
      createOrUpdateContactMock(...args)
  })
);

import ReconcileWhatsAppContactMetadataService from "../ReconcileWhatsAppContactMetadataService";

import {
  WhatsAppReconciliationCancellationSignal,
  WhatsAppReconciliationLockLostError
} from "../WhatsAppReconciliationRuntime";

const createSignal = (): {
  signal: WhatsAppReconciliationCancellationSignal;
  abort: () => void;
} => {
  let aborted = false;

  return {
    signal: {
      get aborted() {
        return aborted;
      },

      throwIfAborted: () => {
        if (aborted) {
          throw new WhatsAppReconciliationLockLostError();
        }
      }
    },

    abort: () => {
      aborted = true;
    }
  };
};

describe(
  "ReconcileWhatsAppContactMetadataService",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      createOrUpdateContactMock.mockResolvedValue({
        id: 501,
        name: "Contato"
      });
    });

    it("delegates name, number, lid and photo to the canonical contact reconciliation service", async () => {
      const cancellation = createSignal();

      await ReconcileWhatsAppContactMetadataService({
        whatsappId: 101,

        metadata: {
          name: "Maria Clara",
          number: "5511987654321",
          lid: "179473865519257",
          profilePicUrl:
            "https://example.com/maria.jpg",
          isGroup: false
        },

        signal: cancellation.signal
      });

      expect(
        createOrUpdateContactMock
      ).toHaveBeenCalledWith({
        name: "Maria Clara",
        number: "5511987654321",
        lid: "179473865519257@lid",
        profilePicUrl:
          "https://example.com/maria.jpg",
        isGroup: false,
        whatsappId: 101
      });
    });

    it("does not invent a profile picture when provider metadata has none", async () => {
      const cancellation = createSignal();

      await ReconcileWhatsAppContactMetadataService({
        whatsappId: 101,

        metadata: {
          name: "Maria Clara",
          number: "5511987654321",
          profilePicUrl: null,
          isGroup: false
        },

        signal: cancellation.signal
      });

      expect(
        createOrUpdateContactMock
      ).toHaveBeenCalledWith({
        name: "Maria Clara",
        number: "5511987654321",
        lid: undefined,
        profilePicUrl: undefined,
        isGroup: false,
        whatsappId: 101
      });
    });

    it("allows number-only identity and leaves name precedence to the canonical service", async () => {
      const cancellation = createSignal();

      await ReconcileWhatsAppContactMetadataService({
        whatsappId: 77,

        metadata: {
          name: null,
          number: "5511999999999",
          lid: null,
          profilePicUrl: null,
          isGroup: false
        },

        signal: cancellation.signal
      });

      expect(
        createOrUpdateContactMock
      ).toHaveBeenCalledWith({
        name: "5511999999999",
        number: "5511999999999",
        lid: undefined,
        profilePicUrl: undefined,
        isGroup: false,
        whatsappId: 77
      });
    });

    it("allows LID-only identity without creating a fake phone number", async () => {
      const cancellation = createSignal();

      await ReconcileWhatsAppContactMetadataService({
        whatsappId: 88,

        metadata: {
          name: "Renata Oliveira",
          number: null,
          lid: "179473865519257",
          profilePicUrl: null,
          isGroup: false
        },

        signal: cancellation.signal
      });

      expect(
        createOrUpdateContactMock
      ).toHaveBeenCalledWith({
        name: "Renata Oliveira",
        number: undefined,
        lid: "179473865519257@lid",
        profilePicUrl: undefined,
        isGroup: false,
        whatsappId: 88
      });
    });

    it("rejects metadata without number or LID before touching contacts", async () => {
      const cancellation = createSignal();

      await expect(
        ReconcileWhatsAppContactMetadataService({
          whatsappId: 101,

          metadata: {
            name: "Sem identidade",
            number: null,
            lid: null,
            profilePicUrl: null,
            isGroup: false
          },

          signal: cancellation.signal
        })
      ).rejects.toThrow(
        "ERR_WHATSAPP_RECONCILIATION_CONTACT_IDENTITY_REQUIRED"
      );

      expect(
        createOrUpdateContactMock
      ).not.toHaveBeenCalled();
    });

    it("stops before contact reconciliation if lock ownership was already lost", async () => {
      const cancellation = createSignal();

      cancellation.abort();

      await expect(
        ReconcileWhatsAppContactMetadataService({
          whatsappId: 101,

          metadata: {
            name: "Maria",
            number: "5511987654321",
            isGroup: false
          },

          signal: cancellation.signal
        })
      ).rejects.toThrow(
        "ERR_WHATSAPP_RECONCILIATION_LOCK_LOST"
      );

      expect(
        createOrUpdateContactMock
      ).not.toHaveBeenCalled();
    });

    it("fails closed after contact reconciliation if the lock is lost during the operation", async () => {
      const cancellation = createSignal();

      createOrUpdateContactMock.mockImplementation(
        async () => {
          cancellation.abort();

          return {
            id: 501,
            name: "Maria"
          };
        }
      );

      await expect(
        ReconcileWhatsAppContactMetadataService({
          whatsappId: 101,

          metadata: {
            name: "Maria",
            number: "5511987654321",
            isGroup: false
          },

          signal: cancellation.signal
        })
      ).rejects.toThrow(
        "ERR_WHATSAPP_RECONCILIATION_LOCK_LOST"
      );
    });

    it("rejects an invalid whatsapp id before touching contacts", async () => {
      const cancellation = createSignal();

      await expect(
        ReconcileWhatsAppContactMetadataService({
          whatsappId: 0,

          metadata: {
            name: "Maria",
            number: "5511987654321",
            isGroup: false
          },

          signal: cancellation.signal
        })
      ).rejects.toThrow(
        "ERR_INVALID_WHATSAPP_ID"
      );

      expect(
        createOrUpdateContactMock
      ).not.toHaveBeenCalled();
    });
  }
);
