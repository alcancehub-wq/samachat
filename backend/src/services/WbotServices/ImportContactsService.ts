import { Op } from "sequelize";

import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import BuildEquivalentContactNumberCandidates from "../../helpers/BuildEquivalentContactNumberCandidates";
import ResolveContactName from "../../helpers/ResolveContactName";
import { whatsappProvider } from "../../providers/WhatsApp";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";

const ImportContactsService = async (userId: number): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(userId);

  let phoneContacts;

  try {
    phoneContacts = await whatsappProvider.getContacts(defaultWhatsapp.id);
  } catch (err) {
    logger.error(`Could not get whatsapp contacts from phone. Err: ${err}`);
    return;
  }

  if (!phoneContacts) {
    return;
  }

  // Process sequentially so equivalent entries from the same provider batch
  // cannot race and create two contacts before either insert is visible.
  for (const phoneContact of phoneContacts) {
    const normalizedNumber = String(phoneContact.number || "").replace(/\D/g, "");

    if (!normalizedNumber) {
      continue;
    }

    const incomingName =
      phoneContact.name || phoneContact.pushname || normalizedNumber;

    const numberCandidates =
      BuildEquivalentContactNumberCandidates(normalizedNumber);

    const existingContacts = await Contact.findAll({
      where: {
        number: {
          [Op.in]: numberCandidates
        }
      },
      order: [["createdAt", "ASC"], ["id", "ASC"]]
    });

    const existingContact = existingContacts[0];

    if (existingContact) {
      const resolvedName = ResolveContactName({
        currentName: existingContact.name,
        incomingName,
        number: existingContact.number || normalizedNumber,
        lid: existingContact.lid
      });

      if (resolvedName !== existingContact.name) {
        await existingContact.update({
          name: resolvedName
        });
      }

      continue;
    }

    await Contact.create({
      number: normalizedNumber,
      name: ResolveContactName({
        incomingName,
        number: normalizedNumber
      })
    });
  }
};

export default ImportContactsService;
