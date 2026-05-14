import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import EmitContactEvent from "../../helpers/EmitContactEvent";
import ResolveContactName from "../../helpers/ResolveContactName";
import GetProfilePicUrl from "../WbotServices/GetProfilePicUrl";
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
  whatsappId?: number;
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

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  lid,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = [],
  whatsappId
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

  const resolveProfilePicUrl = async (
    currentProfilePicUrl?: string | null
  ): Promise<string | undefined> => {
    const normalizedIncomingProfilePicUrl =
      typeof profilePicUrl === "string" ? profilePicUrl.trim() : "";

    if (normalizedIncomingProfilePicUrl) {
      return normalizedIncomingProfilePicUrl;
    }

    if (currentProfilePicUrl) {
      return currentProfilePicUrl;
    }

    if (!isGroup && number) {
      const fetchedProfilePicUrl = await GetProfilePicUrl(number);
      return fetchedProfilePicUrl || undefined;
    }

    return undefined;
  };

  const shouldMerge =
    contactByNumber &&
    resolvedContactByLid &&
    contactByNumber.id !== resolvedContactByLid.id;

  const resolvedName = ResolveContactName({
    currentName: contactByNumber?.name || resolvedContactByLid?.name,
    incomingName: name,
    number,
    lid: normalizedLid
  });

  if (shouldMerge) {
    const resolvedProfilePicUrl = await resolveProfilePicUrl(
      contactByNumber.profilePicUrl || resolvedContactByLid.profilePicUrl
    );

    await Ticket.update(
      { contactId: contactByNumber.id },
      { where: { contactId: resolvedContactByLid.id } }
    );

    await resolvedContactByLid.destroy();

    await contactByNumber.update({
      name: resolvedName,
      lid: resolvedContactByLid.lid || normalizedLid,
      profilePicUrl: resolvedProfilePicUrl
    });

    logger.info({
      info: "Merged contacts by number and lid",
      primaryContactId: contactByNumber.id,
      mergedContactId: resolvedContactByLid.id
    });

    EmitContactEvent({ action: "update", contact: contactByNumber, whatsappId });

    return contactByNumber;
  }

  if (contactByNumber) {
    const resolvedProfilePicUrl = await resolveProfilePicUrl(
      contactByNumber.profilePicUrl
    );

    await contactByNumber.update({
      name: ResolveContactName({
        currentName: contactByNumber.name,
        incomingName: name,
        number,
        lid: normalizedLid || contactByNumber.lid
      }),
      lid: normalizedLid || contactByNumber.lid,
      profilePicUrl: resolvedProfilePicUrl
    });

    EmitContactEvent({ action: "update", contact: contactByNumber, whatsappId });

    return contactByNumber;
  }

  if (resolvedContactByLid) {
    const resolvedProfilePicUrl = await resolveProfilePicUrl(
      resolvedContactByLid.profilePicUrl
    );

    await resolvedContactByLid.update({
      name: ResolveContactName({
        currentName: resolvedContactByLid.name,
        incomingName: name,
        number: number || resolvedContactByLid.number,
        lid: normalizedLid || resolvedContactByLid.lid
      }),
      lid: normalizedLid || resolvedContactByLid.lid,
      number:
        number ||
        (resolvedContactByLid.number === normalizedLid ||
        resolvedContactByLid.number === bareLid
          ? null
          : resolvedContactByLid.number),
      profilePicUrl: resolvedProfilePicUrl
    });

    EmitContactEvent({ action: "update", contact: resolvedContactByLid, whatsappId });
    return resolvedContactByLid;
  }

  const resolvedProfilePicUrl = await resolveProfilePicUrl();

  const created = await Contact.create({
    name: ResolveContactName({
      incomingName: name,
      number,
      lid: normalizedLid
    }),
    number,
    lid: normalizedLid,
		profilePicUrl: resolvedProfilePicUrl,
    email,
    isGroup,
    extraInfo
  });

  EmitContactEvent({ action: "create", contact: created, whatsappId });
  return created;
};

export default CreateOrUpdateContactService;
