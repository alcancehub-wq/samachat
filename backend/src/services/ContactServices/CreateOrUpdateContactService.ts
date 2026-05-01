import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number?: string;
  lid?: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
}

const looksLikePhoneNumber = (value?: string | null): value is string => {
  if (!value) {
    return false;
  }

  return /^55\d{8,13}$/.test(value);
};

const normalizeLid = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.includes("@") ? value : `${value}@lid`;
};

const emitContact = (action: "update" | "create", contact: Contact) => {
  const io = getIO();

  io.emit("contact", { action, contact });
};

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  lid,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = []
}: Request): Promise<Contact> => {
  const sanitizedRawNumber = rawNumber || "";
  const normalizedLid = normalizeLid(lid);
  const bareLid = normalizedLid?.replace(/@lid$/i, "");
  const digitsOnlyNumber = isGroup
    ? sanitizedRawNumber
    : sanitizedRawNumber.replace(/[^0-9]/g, "");
  const number = isGroup
    ? digitsOnlyNumber
    : looksLikePhoneNumber(digitsOnlyNumber)
    ? digitsOnlyNumber
    : "";

  if (!number && !normalizedLid) {
    throw new Error("Either number or lid must be provided");
  }

  const [contactByNumber, contactByLid, legacyContactByLid, legacyContactByBareLid] = await Promise.all([
    number ? Contact.findOne({ where: { number } }) : null,
    normalizedLid ? Contact.findOne({ where: { lid: normalizedLid } }) : null,
    bareLid ? Contact.findOne({ where: { number: bareLid } }) : null,
    bareLid ? Contact.findOne({ where: { lid: bareLid } }) : null
  ]);

  const resolvedContactByLid =
    contactByLid || legacyContactByBareLid || legacyContactByLid;

  const shouldMerge =
    contactByNumber &&
    resolvedContactByLid &&
    contactByNumber.id !== resolvedContactByLid.id;

  if (shouldMerge) {
    await Ticket.update(
      { contactId: contactByNumber.id },
      { where: { contactId: resolvedContactByLid.id } }
    );

    await resolvedContactByLid.destroy();

    await contactByNumber.update({
      lid: resolvedContactByLid.lid || normalizedLid,
      profilePicUrl
    });

    logger.info({
      info: "Merged contacts by number and lid",
      primaryContactId: contactByNumber.id,
      mergedContactId: resolvedContactByLid.id
    });

    emitContact("update", contactByNumber);

    return contactByNumber;
  }

  if (contactByNumber) {
    await contactByNumber.update({
      lid: normalizedLid || contactByNumber.lid,
      profilePicUrl
    });

    emitContact("update", contactByNumber);

    return contactByNumber;
  }

  if (resolvedContactByLid) {
    await resolvedContactByLid.update({
      lid: normalizedLid || resolvedContactByLid.lid,
      number:
        number ||
        (resolvedContactByLid.number === normalizedLid ||
        resolvedContactByLid.number === bareLid
          ? null
          : resolvedContactByLid.number),
      profilePicUrl
    });

    emitContact("update", resolvedContactByLid);
    return resolvedContactByLid;
  }

  const created = await Contact.create({
    name,
    number,
    lid: normalizedLid,
    profilePicUrl,
    email,
    isGroup,
    extraInfo
  });

  emitContact("create", created);
  return created;
};

export default CreateOrUpdateContactService;
