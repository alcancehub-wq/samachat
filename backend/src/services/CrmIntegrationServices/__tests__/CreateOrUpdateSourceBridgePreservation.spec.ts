jest.mock("../../../models/Contact", () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));
jest.mock("../../../models/Ticket", () => ({
  findAll: jest.fn(),
  update: jest.fn()
}));
jest.mock("../../../models/CrmOriginJournal", () => ({ create: jest.fn() }));
jest.mock("../../../models/CrmOriginCaptureCommand", () => ({
  create: jest.fn()
}));
jest.mock("../../../helpers/EmitContactEvent", () => jest.fn());
jest.mock("../../WbotServices/GetProfilePicUrl", () =>
  jest.fn(async () => undefined)
);
jest.mock("../../../utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));
import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import CrmOriginJournal from "../../../models/CrmOriginJournal";
import CrmOriginCaptureCommand from "../../../models/CrmOriginCaptureCommand";
import CreateOrUpdateContactService from "../../ContactServices/CreateOrUpdateContactService";

beforeEach(() => {
  jest.clearAllMocks();
  (Contact.findAll as jest.Mock).mockResolvedValue([]);
  (Contact.findOne as jest.Mock).mockResolvedValue(null);
  (Ticket.findAll as jest.Mock).mockResolvedValue([]);
});
afterEach(() => {
  expect(CrmOriginJournal.create).not.toHaveBeenCalled();
  expect(CrmOriginCaptureCommand.create).not.toHaveBeenCalled();
});
it("automatic LID-only creation remains local without fabricated number or journal", async () => {
  (Contact.create as jest.Mock).mockResolvedValue({
    id: 1,
    lid: "synthetic@lid",
    number: null
  });
  const result = await CreateOrUpdateContactService({
    name: "Synthetic LID",
    lid: "synthetic@lid",
    isGroup: false,
    whatsappId: 35
  });
  expect(result.id).toBe(1);
  expect(Contact.create).toHaveBeenCalledWith(
    expect.objectContaining({ number: null, lid: "synthetic@lid" })
  );
});
it("automatic LID enrichment preserves canonical local ID without entering bridge", async () => {
  const row = {
    id: 1,
    name: "Synthetic LID",
    number: null,
    lid: "synthetic@lid",
    profilePicUrl: "synthetic-picture",
    update: jest.fn(async () => undefined)
  };
  (Contact.findOne as jest.Mock).mockImplementation(async options =>
    options.where.lid === "synthetic@lid" ? row : null
  );
  const result = await CreateOrUpdateContactService({
    name: "Synthetic Enriched",
    number: "5511999999999",
    lid: "synthetic@lid",
    isGroup: false,
    whatsappId: 35
  });
  expect(result).toBe(row);
  expect(row.update).toHaveBeenCalledWith(
    expect.objectContaining({ number: "5511999999999", lid: "synthetic@lid" })
  );
  expect(Contact.create).not.toHaveBeenCalled();
});
it("existing number/LID merge keeps canonical survivor and only legacy ticket reassignment", async () => {
  const primary = {
    id: 1,
    name: "Synthetic Canonical",
    number: "5511999999999",
    profilePicUrl: "synthetic-picture",
    update: jest.fn(async () => undefined)
  };
  const lid = {
    id: 2,
    name: "Synthetic LID",
    lid: "synthetic@lid",
    profilePicUrl: "synthetic-picture",
    destroy: jest.fn(async () => undefined)
  };
  (Contact.findAll as jest.Mock).mockResolvedValue([primary]);
  (Contact.findOne as jest.Mock).mockImplementation(async options =>
    options.where.lid === "synthetic@lid" ? lid : null
  );
  const result = await CreateOrUpdateContactService({
    name: "Synthetic Incoming",
    number: "5511999999999",
    lid: "synthetic@lid",
    isGroup: false,
    whatsappId: 35
  });
  expect(result).toBe(primary);
  expect(Ticket.update).toHaveBeenCalledWith(
    { contactId: 1 },
    { where: { contactId: 2 } }
  );
  expect(lid.destroy).toHaveBeenCalledTimes(1);
  expect(primary.update).toHaveBeenCalledWith(
    expect.objectContaining({ lid: "synthetic@lid" })
  );
  expect(Contact.create).not.toHaveBeenCalled();
});
