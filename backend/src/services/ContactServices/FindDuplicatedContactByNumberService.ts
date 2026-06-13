import { Op } from "sequelize";

import Contact from "../../models/Contact";
import BuildEquivalentContactNumberCandidates from "../../helpers/BuildEquivalentContactNumberCandidates";

type Request = {
  number?: string | null;
  ignoreContactId?: string | number | null;
};

const FindDuplicatedContactByNumberService = async ({
  number,
  ignoreContactId
}: Request): Promise<Contact | null> => {
  const candidates = BuildEquivalentContactNumberCandidates(number);

  if (!candidates.length) {
    return null;
  }

  const where: any = {
    number: {
      [Op.in]: candidates
    }
  };

  if (ignoreContactId) {
    where.id = {
      [Op.ne]: Number(ignoreContactId)
    };
  }

  const contact = await Contact.findOne({
    where
  });

  return contact;
};

export default FindDuplicatedContactByNumberService;
