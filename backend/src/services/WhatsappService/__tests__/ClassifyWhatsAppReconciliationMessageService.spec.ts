jest.mock("../../../models/Message", () => ({
  findByPk: jest.fn(),
  findAll: jest.fn()
}));

import Message from "../../../models/Message";
import ClassifyWhatsAppReconciliationMessageService, {
  FindKnownWhatsAppReconciliationMessageIdsService
} from "../ClassifyWhatsAppReconciliationMessageService";

const findByPkMock = Message.findByPk as jest.Mock;
const findAllMock = Message.findAll as jest.Mock;

describe("ClassifyWhatsAppReconciliationMessageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("classifies a persisted provider message as existing", async () => {
    findByPkMock.mockResolvedValue({ id: "provider-message-1" });

    await expect(
      ClassifyWhatsAppReconciliationMessageService(
        "provider-message-1"
      )
    ).resolves.toBe("existing");

    expect(findByPkMock).toHaveBeenCalledWith(
      "provider-message-1",
      {
        attributes: ["id"]
      }
    );
  });

  it("classifies a provider message absent from persistence as new", async () => {
    findByPkMock.mockResolvedValue(null);

    await expect(
      ClassifyWhatsAppReconciliationMessageService(
        "provider-message-2"
      )
    ).resolves.toBe("new");
  });

  it("rejects an empty provider message id before database lookup", async () => {
    await expect(
      ClassifyWhatsAppReconciliationMessageService("   ")
    ).rejects.toThrow("ERR_INVALID_WHATSAPP_MESSAGE_ID");

    expect(findByPkMock).not.toHaveBeenCalled();
  });
  it("finds persisted message ids in one batch query", async () => {
    findAllMock.mockResolvedValue([
      { id: "provider-message-2" }
    ]);

    const result =
      await FindKnownWhatsAppReconciliationMessageIdsService([
        "provider-message-1",
        "provider-message-2",
        "provider-message-2"
      ]);

    expect(findAllMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      new Set([
        "provider-message-2"
      ])
    );
  });
});
