import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import BuildEquivalentContactNumberCandidates from "../../helpers/BuildEquivalentContactNumberCandidates";
import Contact from "../../models/Contact";

type Request = {
  contactId: string | number;
};

const normalizeId = (value: string | number): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("ERR_INVALID_CONTACT_ID");
  }

  return id;
};

const onlyDigits = (value?: string): string => String(value || "").replace(/\D/g, "");

const getNumberSuffixes = (number: string): string[] => {
  const digits = onlyDigits(number);
  const suffixes = new Set<string>();

  if (digits.length >= 8) {
    suffixes.add(digits.slice(-8));
  }

  if (digits.length >= 9) {
    suffixes.add(digits.slice(-9));
  }

  return Array.from(suffixes);
};

const numbersLookEquivalent = (targetNumber: string, sourceNumber: string): boolean => {
  const targetDigits = onlyDigits(targetNumber);
  const sourceDigits = onlyDigits(sourceNumber);

  if (!targetDigits || !sourceDigits) {
    return false;
  }

  if (targetDigits === sourceDigits) {
    return true;
  }

  const targetSuffixes = getNumberSuffixes(targetDigits);

  return targetSuffixes.some(
    suffix => sourceDigits.endsWith(suffix) || targetDigits.endsWith(sourceDigits.slice(-suffix.length))
  );
};

const ListDuplicatedContactsByNumberService = async ({
  contactId
}: Request): Promise<Contact[]> => {
  const id = normalizeId(contactId);

  const contact = await Contact.findByPk(id);

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (contact.isGroup) {
    return [];
  }

  const numberCandidates = BuildEquivalentContactNumberCandidates(contact.number || "");
  const uniqueNumberCandidates = Array.from(new Set(numberCandidates.filter(Boolean)));
  const suffixes = getNumberSuffixes(contact.number || "");

  const orConditions: any[] = [];

  if (uniqueNumberCandidates.length > 0) {
    orConditions.push({
      number: {
        [Op.in]: uniqueNumberCandidates
      }
    });
  }

  for (const suffix of suffixes) {
    orConditions.push({
      number: {
        [Op.like]: "%" + suffix
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

  const possibleDuplicatedContacts = await Contact.findAll({
    where: {
      id: {
        [Op.ne]: contact.id
      },
      isGroup: false,
      [Op.or]: orConditions
    },
    include: ["extraInfo", "tags"],
    order: [["updatedAt", "DESC"]]
  });

  const duplicatedContacts = possibleDuplicatedContacts.filter(candidate => {
    const sameLid = Boolean(contact.lid && candidate.lid && contact.lid === candidate.lid);
    const equivalentNumber = numbersLookEquivalent(contact.number, candidate.number);

    return sameLid || equivalentNumber;
  });

  return duplicatedContacts;
};

export default ListDuplicatedContactsByNumberService;
