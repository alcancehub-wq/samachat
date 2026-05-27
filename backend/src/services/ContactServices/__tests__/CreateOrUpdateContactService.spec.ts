jest.mock("../../../models/Contact", () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock("../../../models/Ticket", () => ({
  findAll: jest.fn(),
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
import Ticket from "../../../models/Ticket";
import EmitContactEvent from "../../../helpers/EmitContactEvent";
import GetProfilePicUrl from "../../WbotServices/GetProfilePicUrl";
import CreateOrUpdateContactService from "../CreateOrUpdateContactService";

const contactFindAllMock = Contact.findAll as jest.Mock;
const contactFindOneMock = Contact.findOne as jest.Mock;
const contactCreateMock = Contact.create as jest.Mock;
const ticketFindAllMock = Ticket.findAll as jest.Mock;
const emitContactEventMock = EmitContactEvent as jest.Mock;
const getProfilePicUrlMock = GetProfilePicUrl as jest.Mock;

describe("CreateOrUpdateContactService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contactFindAllMock.mockResolvedValue([]);
    contactFindOneMock.mockResolvedValue(null);
    ticketFindAllMock.mockResolvedValue([]);
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

  it("prefers the equivalent contact backing the open ticket on the same whatsapp", async () => {
    const staleLegacyContact = {
      id: 6189,
      name: "Juliana",
      number: "559984396105",
      lid: null,
      profilePicUrl: "https://example.com/legacy.jpg",
      update: jest.fn().mockResolvedValue(undefined)
    };
    const currentManualContact = {
      id: 17160,
      name: "Juliana",
      number: "5599984396105",
      lid: null,
      profilePicUrl: null,
      update: jest.fn().mockResolvedValue(undefined)
    };

    contactFindAllMock.mockResolvedValue([
      staleLegacyContact,
      currentManualContact
    ]);
    ticketFindAllMock.mockResolvedValue([
      {
        id: 1154,
        status: "pending",
        userId: null,
        contactId: 6189,
        whatsappId: 35,
        updatedAt: new Date("2026-05-27T17:18:53.000Z")
      },
      {
        id: 1153,
        status: "open",
        userId: 16,
        contactId: 17160,
        whatsappId: 35,
        updatedAt: new Date("2026-05-27T17:18:52.000Z")
      }
    ]);

    const result = await CreateOrUpdateContactService({
      name: "Juliana",
      number: "559984396105",
      isGroup: false,
      whatsappId: 35
    });

    expect(currentManualContact.update).toHaveBeenCalledWith({
      name: "Juliana",
      lid: null,
      profilePicUrl: undefined
    });
    expect(staleLegacyContact.update).not.toHaveBeenCalled();
    expect(contactCreateMock).not.toHaveBeenCalled();
    expect(result).toBe(currentManualContact);
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