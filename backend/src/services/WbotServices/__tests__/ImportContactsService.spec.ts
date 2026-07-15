jest.mock("../../../helpers/GetDefaultWhatsApp", () => jest.fn());

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    getContacts: jest.fn()
  }
}));

jest.mock("../../../models/Contact", () => ({
  findAll: jest.fn(),
  create: jest.fn()
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

import { Op } from "sequelize";

import GetDefaultWhatsApp from "../../../helpers/GetDefaultWhatsApp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import Contact from "../../../models/Contact";
import ImportContactsService from "../ImportContactsService";

const getDefaultWhatsAppMock = GetDefaultWhatsApp as jest.Mock;
const getContactsMock = whatsappProvider.getContacts as jest.Mock;
const contactFindAllMock = Contact.findAll as jest.Mock;
const contactCreateMock = Contact.create as jest.Mock;

describe("ImportContactsService", () => {
  let contactState: any[];

  const attachUpdate = (contact: any): any => {
    contact.update = jest.fn(async (data: Record<string, unknown>) => {
      Object.assign(contact, data);
      return contact;
    });

    return contact;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    contactState = [];

    getDefaultWhatsAppMock.mockResolvedValue({
      id: 35
    });

    contactFindAllMock.mockImplementation(async ({ where }: any) => {
      const candidates = where?.number?.[Op.in] || [];

      return contactState
        .filter(contact => candidates.includes(contact.number))
        .sort((left, right) => left.id - right.id);
    });

    contactCreateMock.mockImplementation(
      async (data: Record<string, unknown>) => {
        const created = attachUpdate({
          id: 1000 + contactState.length,
          lid: null,
          createdAt: new Date(),
          ...data
        });

        contactState.push(created);

        return created;
      }
    );
  });

  it("reuses an equivalent manual contact and preserves its chosen name", async () => {
    const manualContact = attachUpdate({
      id: 17179,
      name: "Cliente Premium SamaChat",
      number: "5541988065095",
      lid: null,
      createdAt: new Date("2026-07-01T10:00:00.000Z")
    });

    contactState.push(manualContact);

    getContactsMock.mockResolvedValue([
      {
        id: "554188065095@c.us",
        number: "554188065095",
        name: "Nome salvo no WhatsApp",
        pushname: "Nome do Perfil",
        isGroup: false
      }
    ]);

    await ImportContactsService(16);

    expect(contactState).toHaveLength(1);
    expect(contactCreateMock).not.toHaveBeenCalled();
    expect(manualContact.update).not.toHaveBeenCalled();
    expect(manualContact.name).toBe("Cliente Premium SamaChat");
  });

  it("replaces only a numeric placeholder with the WhatsApp contact name", async () => {
    const placeholderContact = attachUpdate({
      id: 17180,
      name: "5541988065095",
      number: "5541988065095",
      lid: null,
      createdAt: new Date("2026-07-01T10:00:00.000Z")
    });

    contactState.push(placeholderContact);

    getContactsMock.mockResolvedValue([
      {
        id: "554188065095@c.us",
        number: "554188065095",
        name: "Maria Cliente",
        isGroup: false
      }
    ]);

    await ImportContactsService(16);

    expect(contactState).toHaveLength(1);
    expect(contactCreateMock).not.toHaveBeenCalled();
    expect(placeholderContact.update).toHaveBeenCalledWith({
      name: "Maria Cliente"
    });
    expect(placeholderContact.name).toBe("Maria Cliente");
  });

  it("creates only one contact when the same number arrives twice in equivalent formats", async () => {
    getContactsMock.mockResolvedValue([
      {
        id: "5541988065095@c.us",
        number: "5541988065095",
        name: "Contato WhatsApp",
        isGroup: false
      },
      {
        id: "554188065095@c.us",
        number: "554188065095",
        name: "Outro nome do mesmo contato",
        isGroup: false
      }
    ]);

    await ImportContactsService(16);

    expect(contactCreateMock).toHaveBeenCalledTimes(1);
    expect(contactState).toHaveLength(1);
    expect(contactState[0]).toEqual(
      expect.objectContaining({
        number: "5541988065095",
        name: "Contato WhatsApp"
      })
    );
  });
});
