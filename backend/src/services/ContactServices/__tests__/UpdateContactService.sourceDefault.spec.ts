jest.mock("../../../models/Contact", () => ({
  findOne: jest.fn(),
  findByPk: jest.fn()
}));
jest.mock("../../../models/ContactCustomField", () => ({
  findOne: jest.fn(),
  upsert: jest.fn(),
  destroy: jest.fn()
}));
jest.mock("../../../models/CrmOriginJournal", () => ({ findOne: jest.fn() }));
jest.mock("../../CrmIntegrationServices/CaptureUpdateContactSourceBridge", () =>
  jest.fn()
);
jest.mock("../../WebhookServices/TriggerWebhooksService", () =>
  jest.fn(async () => undefined)
);
import Contact from "../../../models/Contact";
import ContactCustomField from "../../../models/ContactCustomField";
import CrmOriginJournal from "../../../models/CrmOriginJournal";
import CaptureUpdateContactSourceBridge from "../../CrmIntegrationServices/CaptureUpdateContactSourceBridge";
import TriggerWebhooksService from "../../WebhookServices/TriggerWebhooksService";
import UpdateContactService from "../UpdateContactService";
const setup = () => {
  const contact = {
    id: 1,
    name: "Synthetic",
    extraInfo: [{ id: 10 }, { id: 11 }],
    tags: [],
    update: jest.fn(async () => undefined),
    $set: jest.fn(async () => undefined),
    reload: jest.fn(async () => undefined),
    get: () => ({ id: 1 })
  };
  (Contact.findOne as jest.Mock).mockResolvedValue(contact);
  return contact;
};
beforeEach(() => jest.clearAllMocks());
it("default preserves partial lookup and does not query snapshots or journal", async () => {
  const contact = setup();
  expect(
    await UpdateContactService({
      contactId: "1",
      contactData: { name: "Synthetic Updated" }
    })
  ).toBe(contact);
  expect(Contact.findByPk).not.toHaveBeenCalled();
  expect(CrmOriginJournal.findOne).not.toHaveBeenCalled();
  expect(CaptureUpdateContactSourceBridge).not.toHaveBeenCalled();
  expect(contact.update).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Synthetic Updated" })
  );
  expect(contact.update.mock.calls[0]).toHaveLength(1);
  expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
});
it("empty lists clear associations while missing lists leave them untouched", async () => {
  const contact = setup();
  await UpdateContactService({
    contactId: "1",
    contactData: { extraInfo: [], tagIds: [] }
  });
  expect(ContactCustomField.destroy).toHaveBeenCalledWith({
    where: { id: 10 }
  });
  expect(ContactCustomField.destroy).toHaveBeenCalledWith({
    where: { id: 11 }
  });
  expect(contact.$set).toHaveBeenCalledWith("tags", []);
  jest.clearAllMocks();
  await UpdateContactService({ contactId: "1", contactData: { city: null } });
  expect(ContactCustomField.upsert).not.toHaveBeenCalled();
  expect(ContactCustomField.destroy).not.toHaveBeenCalled();
  expect(contact.$set).not.toHaveBeenCalled();
});
it("body cannot enable bridge and false second argument remains legacy", async () => {
  setup();
  await UpdateContactService(
    Object.assign(
      { contactId: "1", contactData: { name: "Synthetic" } },
      { enabled: true, sourceContext: { enabled: true } }
    ),
    { enabled: false } as any
  );
  expect(CaptureUpdateContactSourceBridge).not.toHaveBeenCalled();
  expect(CrmOriginJournal.findOne).not.toHaveBeenCalled();
  expect(Contact.findByPk).not.toHaveBeenCalled();
});
