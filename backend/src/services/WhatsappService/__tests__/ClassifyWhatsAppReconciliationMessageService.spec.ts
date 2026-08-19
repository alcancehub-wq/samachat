jest.mock("../../../models/Message", () => ({
  findByPk: jest.fn()
}));

import Message from "../../../models/Message";
import ClassifyWhatsAppReconciliationMessageService from "../ClassifyWhatsAppReconciliationMessageService";

const findByPkMock = Message.findByPk as jest.Mock;

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
});
