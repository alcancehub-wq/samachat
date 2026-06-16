import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import BuildEquivalentContactNumberCandidates from "../../helpers/BuildEquivalentContactNumberCandidates";
import Contact from "../../models/Contact";

type Request = {
  contactId: string | number;
  companyId: number;
};

const normalizeId = (value: string | number): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("ERR_INVALID_CONTACT_ID");
  }

  return id;
};

const ListDuplicatedContactsByNumberService = async ({
  contactId,
  companyId
}: Request): Promise<Contact[]> => {
  const id = normalizeId(contactId);

  const contact = await Contact.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (contact.isGroup) {
    return [];
  }

  const numberCandidates = BuildEquivalentContactNumberCandidates(contact.number || "");
  const uniqueNumberCandidates = Array.from(new Set(numberCandidates.filter(Boolean)));

  const orConditions: any[] = [];

  if (uniqueNumberCandidates.length > 0) {
    orConditions.push({
      number: {
        [Op.in]: uniqueNumberCandidates
      }
    });
  }

  if (contact.lid) {
    orConditions.push({
      lid: contact.lid
    });
  }

  if (orConditions.length === 0) {
    return [];
  }

  const duplicatedContacts = await Contact.findAll({
    where: {
      companyId,
      id: {
        [Op.ne]: contact.id
      },
      isGroup: false,
      [Op.or]: orConditions
    },
    include: ["extraInfo", "tags"],
    order: [["updatedAt", "DESC"]]
  });

  return duplicatedContacts;
};

export default ListDuplicatedContactsByNumberService;
