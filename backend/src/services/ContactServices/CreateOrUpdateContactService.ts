import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import EmitContactEvent from "../../helpers/EmitContactEvent";
import BuildEquivalentContactNumberCandidates from "../../helpers/BuildEquivalentContactNumberCandidates";
import IsPlausiblePhoneNumber from "../../helpers/IsPlausiblePhoneNumber";
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
  profilePhotoProbe?: {
    rawIdSerialized?: string;
    rawIdUser?: string;
    rawIsGroup: boolean;
    hasRawGetProfilePicUrl: boolean;
    rawPhotoResult: "present" | "empty" | "error";
    mappedNumber: string;
    mappedLid?: string;
    mappedProfilePic: "present" | "empty";
  };
}

const normalizeLid = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.includes("@") ? value : `${value}@lid`;
};

const resolveActiveTicketRank = (ticket: Ticket): number => {
  if (ticket.status === "open") {
    return 0;
  }

  if (ticket.status === "pending" && ticket.userId) {
    return 1;
  }

  if (ticket.status === "pending") {
    return 2;
  }

  return 3;
};

const selectPreferredEquivalentContact = async (
  contacts: Contact[],
  whatsappId?: number
): Promise<Contact | null> => {
  if (!contacts.length) {
    return null;
  }

  if (contacts.length === 1 || !whatsappId) {
    return contacts[0];
  }

  const activeTickets = await Ticket.findAll({
    where: {
      contactId: {
        [Op.in]: contacts.map(contact => contact.id)
      },
      whatsappId,
      status: {
        [Op.in]: ["open", "pending"]
      }
    },
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  if (!activeTickets.length) {
    return contacts[0];
  }

  const bestTicketByContactId = new Map<number, Ticket>();

  for (const ticket of activeTickets) {
    const current = bestTicketByContactId.get(ticket.contactId);

    if (!current || resolveActiveTicketRank(ticket) < resolveActiveTicketRank(current)) {
      bestTicketByContactId.set(ticket.contactId, ticket);
    }
  }

  const rankedContacts = contacts
    .map((contact, index) => ({
      contact,
      index,
      ticket: bestTicketByContactId.get(contact.id) || null
    }))
    .sort((left, right) => {
      const leftRank = left.ticket ? resolveActiveTicketRank(left.ticket) : Number.MAX_SAFE_INTEGER;
      const rightRank = right.ticket ? resolveActiveTicketRank(right.ticket) : Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftUpdatedAt = left.ticket ? +new Date(left.ticket.updatedAt) : 0;
      const rightUpdatedAt = right.ticket ? +new Date(right.ticket.updatedAt) : 0;

      if (leftUpdatedAt !== rightUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
      }

      return left.index - right.index;
    });

  return rankedContacts[0]?.contact || contacts[0];
};

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  lid,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = [],
  whatsappId,
  profilePhotoProbe
}: Request): Promise<Contact> => {
  const sanitizedRawNumber = rawNumber || "";
  const normalizedLid = normalizeLid(lid);
  const bareLid = normalizedLid?.replace(/@lid$/i, "");
  const digitsOnlyNumber = isGroup
    ? sanitizedRawNumber
    : sanitizedRawNumber.replace(/[^0-9]/g, "");
  const number = isGroup
    ? digitsOnlyNumber
    : IsPlausiblePhoneNumber(digitsOnlyNumber)
    ? digitsOnlyNumber
    : "";
  const numberCandidates = isGroup
    ? (number ? [number] : [])
    : BuildEquivalentContactNumberCandidates(number);

  if (!number && !normalizedLid) {
    throw new Error("Either number or lid must be provided");
  }

  const [contactsByNumber, contactByLid, legacyContactByLid, legacyContactByBareLid] = await Promise.all([
    numberCandidates.length
      ? Contact.findAll({
          where: {
            number: {
              [Op.in]: numberCandidates
            }
          },
          order: [["createdAt", "ASC"], ["id", "ASC"]]
        })
      : [],
    normalizedLid ? Contact.findOne({ where: { lid: normalizedLid } }) : null,
    bareLid ? Contact.findOne({ where: { number: bareLid } }) : null,
    bareLid ? Contact.findOne({ where: { lid: bareLid } }) : null
  ]);
  const contactByNumber = await selectPreferredEquivalentContact(
    contactsByNumber,
    whatsappId
  );

  const resolvedContactByLid =
    contactByLid || legacyContactByBareLid || legacyContactByLid;

  if (contactsByNumber.length > 1) {
    logger.warn({
      info: "Multiple equivalent contacts found while reconciling WhatsApp payload",
      incomingNumber: number,
      numberCandidates,
      contactIds: contactsByNumber.map(contact => contact.id),
      preferredContactId: contactByNumber?.id || null
    });
  }

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
      const fetchedProfilePicUrl = await GetProfilePicUrl(number, { whatsappId });
      return fetchedProfilePicUrl || undefined;
    }

    return undefined;
  };

  const logProfilePhotoProbe = (
    existingContact?: Contact | null,
    currentProfilePicUrl?: string | null,
    persistedProfilePicUrl?: string | null
  ): void => {
    if (!profilePhotoProbe) {
      return;
    }

    logger.info(
      {
        event: "p05_global_photo_probe",
        whatsappId,
        rawIdSerialized:
          profilePhotoProbe.rawIdSerialized,
        rawIdUser: profilePhotoProbe.rawIdUser,
        rawIsGroup: profilePhotoProbe.rawIsGroup,
        hasRawGetProfilePicUrl:
          profilePhotoProbe.hasRawGetProfilePicUrl,
        rawPhotoResult:
          profilePhotoProbe.rawPhotoResult,
        mappedNumber: profilePhotoProbe.mappedNumber,
        mappedLid: profilePhotoProbe.mappedLid,
        mappedProfilePic:
          profilePhotoProbe.mappedProfilePic,
        existingContactId:
          existingContact?.id || null,
        existingProfilePic:
          currentProfilePicUrl ? "present" : "empty",
        finalIncomingProfilePic:
          profilePicUrl ? "present" : "empty",
        persistedProfilePic:
          persistedProfilePicUrl ? "present" : "empty"
      },
      "Global reconciliation profile photo probe"
    );
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

    logProfilePhotoProbe(
      contactByNumber,
      contactByNumber.profilePicUrl,
      resolvedProfilePicUrl
    );

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

    logProfilePhotoProbe(
      contactByNumber,
      contactByNumber.profilePicUrl ||
        resolvedContactByLid?.profilePicUrl,
      resolvedProfilePicUrl
    );

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
    logProfilePhotoProbe(
      resolvedContactByLid,
      resolvedContactByLid.profilePicUrl,
      resolvedProfilePicUrl
    );
    return resolvedContactByLid;
  }

  const resolvedProfilePicUrl = await resolveProfilePicUrl();

  const created = await Contact.create({
    name: ResolveContactName({
      incomingName: name,
      number,
      lid: normalizedLid
    }),
    number: number || null,
    lid: normalizedLid,
		profilePicUrl: resolvedProfilePicUrl,
    email,
    isGroup,
    extraInfo
  });

  EmitContactEvent({ action: "create", contact: created, whatsappId });
  logProfilePhotoProbe(
    null,
    undefined,
    resolvedProfilePicUrl
  );
  return created;
};

export default CreateOrUpdateContactService;
