jest.mock("../../../models/Contact", () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock("../../../models/Ticket", () => ({
  update: jest.fn()
}));

jest.mock("../../../helpers/EmitContactEvent", () => jest.fn());
jest.mock("../../WbotServices/GetProfilePicUrl", () => jest.fn());
jest.mock("../../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import Contact from "../../../models/Contact";
import EmitContactEvent from "../../../helpers/EmitContactEvent";
import GetProfilePicUrl from "../../WbotServices/GetProfilePicUrl";
import CreateOrUpdateContactService from "../CreateOrUpdateContactService";

const contactFindAllMock = Contact.findAll as jest.Mock;
const contactFindOneMock = Contact.findOne as jest.Mock;
const contactCreateMock = Contact.create as jest.Mock;
const emitContactEventMock = EmitContactEvent as jest.Mock;
const getProfilePicUrlMock = GetProfilePicUrl as jest.Mock;

describe("CreateOrUpdateContactService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contactFindAllMock.mockResolvedValue([]);
    contactFindOneMock.mockResolvedValue(null);
    getProfilePicUrlMock.mockResolvedValue(undefined);
  });

  it("reuses the manual contact when the provider echo drops the brazilian ninth digit", async () => {
    const existingManualContact = {
      id: 17179,
      name: "Vilson",
      number: "5541988065095",
      lid: null,
      profilePicUrl: null,
      update: jest.fn().mockResolvedValue(undefined)
    };

    contactFindAllMock.mockResolvedValue([existingManualContact]);

    const result = await CreateOrUpdateContactService({
      name: "Vilson",
      number: "554188065095",
      profilePicUrl: "https://example.com/pic.jpg",
      isGroup: false,
      whatsappId: 35
    });

    expect(contactFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        order: [["createdAt", "ASC"], ["id", "ASC"]]
      })
    );
    expect(existingManualContact.update).toHaveBeenCalledWith({
      name: "Vilson",
      lid: null,
      profilePicUrl: "https://example.com/pic.jpg"
    });
    expect(contactCreateMock).not.toHaveBeenCalled();
    expect(emitContactEventMock).toHaveBeenCalledWith({
      action: "update",
      contact: existingManualContact,
      whatsappId: 35
    });
    expect(result).toBe(existingManualContact);
  });

  it("prefers the oldest equivalent contact when duplicate variants already exist", async () => {
    const originalManualContact = {
      id: 17179,
      name: "Vilson",
      number: "5541988065095",
      lid: null,
      profilePicUrl: null,
      update: jest.fn().mockResolvedValue(undefined)
    };
    const duplicateProviderContact = {
      id: 17180,
      name: "Vilson",
      number: "554188065095",
      lid: null,
      profilePicUrl: "https://example.com/duplicate.jpg",
      update: jest.fn().mockResolvedValue(undefined)
    };

    contactFindAllMock.mockResolvedValue([
      originalManualContact,
      duplicateProviderContact
    ]);

    const result = await CreateOrUpdateContactService({
      name: "Vilson",
      number: "554188065095",
      isGroup: false,
      whatsappId: 35
    });

    expect(originalManualContact.update).toHaveBeenCalledWith({
      name: "Vilson",
      lid: null,
      profilePicUrl: undefined
    });
    expect(duplicateProviderContact.update).not.toHaveBeenCalled();
    expect(contactCreateMock).not.toHaveBeenCalled();
    expect(result).toBe(originalManualContact);
  });

  it("does not reconcile a different contact that only looks similar by name", async () => {
    const createdContact = {
      id: 17181,
      name: "Vilson",
      number: "5541988065096"
    };

    contactCreateMock.mockResolvedValue(createdContact);

    const result = await CreateOrUpdateContactService({
      name: "Vilson",
      number: "5541988065096",
      isGroup: false,
      whatsappId: 35
    });

    expect(contactCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Vilson",
        number: "5541988065096"
      })
    );
    expect(emitContactEventMock).toHaveBeenCalledWith({
      action: "create",
      contact: createdContact,
      whatsappId: 35
    });
    expect(result).toBe(createdContact);
  });
});