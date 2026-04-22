import { Op } from "sequelize";
import Campaign from "../../models/Campaign";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactList from "../../models/ContactList";
import ContactListContact from "../../models/ContactListContact";
import Dialog from "../../models/Dialog";
import Tag from "../../models/Tag";
import CampaignLog from "../../models/CampaignLog";
import { parseCampaignTagIds } from "./campaignTags";
import { parseContactListFilters, applyContactListFilters } from "../ContactListServices/contactListFilters";
import CreateCampaignLogService from "./CreateCampaignLogService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import { logger } from "../../utils/logger";

const DEFAULT_POLL_MS = 8000;
const DEFAULT_BATCH_SIZE = 10;

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const claimCampaign = async (campaignId: number): Promise<boolean> => {
  const [updated] = await Campaign.update(
    { status: "processing", lastStatusAt: new Date() },
    {
      where: {
        id: campaignId,
        status: "scheduled"
      }
    }
  );

  return updated > 0;
};

const loadDialog = async (campaign: Campaign): Promise<Dialog> => {
  if (!campaign.dialogId) {
    throw new Error("ERR_CAMPAIGN_NO_DIALOG");
  }

  const dialog = await Dialog.findByPk(campaign.dialogId);
  if (!dialog || !dialog.isActive) {
    throw new Error("ERR_CAMPAIGN_DIALOG_INACTIVE");
  }

  return dialog;
};

const loadContactsFromList = async (listId: number): Promise<Contact[]> => {
  const list = await ContactList.findByPk(listId);
  if (!list || !list.isActive) {
    return [];
  }

  if (!list.isDynamic) {
    const rows = await ContactListContact.findAll({
      where: { contactListId: list.id },
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number", "email", "profilePicUrl"],
          include: ["tags", "extraInfo"]
        }
      ],
      order: [[{ model: Contact, as: "contact" }, "name", "ASC"]]
    });

    return rows.map(row => row.contact).filter(Boolean);
  }

  const filters = parseContactListFilters(list.filters);

  const includeTags = {
    model: Tag,
    as: "tags",
    attributes: ["id", "name", "color"],
    through: { attributes: [] },
    required: filters.tagIds && filters.tagIds.length > 0,
    where: filters.tagIds && filters.tagIds.length > 0
      ? { id: { [Op.in]: filters.tagIds } }
      : undefined
  };

  const contacts = await Contact.findAll({
    include: [
      includeTags,
      {
        model: ContactCustomField,
        as: "extraInfo"
      }
    ],
    order: [["name", "ASC"]]
  });

  return applyContactListFilters(contacts, filters);
};

const loadContactsFromTags = async (tagIds: number[]): Promise<Contact[]> => {
  if (tagIds.length === 0) {
    return [];
  }

  const contacts = await Contact.findAll({
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] },
        required: true,
        where: { id: { [Op.in]: tagIds } }
      },
      {
        model: ContactCustomField,
        as: "extraInfo"
      }
    ],
    order: [["name", "ASC"]]
  });

  return contacts;
};

const resolveCampaignContacts = async (campaign: Campaign): Promise<Contact[]> => {
  if (campaign.contactListId) {
    return loadContactsFromList(campaign.contactListId);
  }

  const tagIds = parseCampaignTagIds(campaign.tagIds);
  return loadContactsFromTags(tagIds);
};

const markCampaignStatus = async (
  campaignId: number,
  status: string
): Promise<void> => {
  await Campaign.update(
    { status, lastStatusAt: new Date() },
    { where: { id: campaignId } }
  );
};

const alreadySent = async (campaignId: number, contactId: number): Promise<boolean> => {
  const existing = await CampaignLog.findOne({
    where: { campaignId, contactId, status: "sent" }
  });

  return !!existing;
};

const runCampaignOnce = async (campaign: Campaign): Promise<void> => {
  const dialog = await loadDialog(campaign);
  const contacts = await resolveCampaignContacts(campaign);

  if (contacts.length === 0) {
    await markCampaignStatus(campaign.id, "failed");
    return;
  }

  let defaultWhatsapp;

  try {
    defaultWhatsapp = await GetDefaultWhatsApp();
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERR_NO_DEF_WAPP_FOUND";
    for (const contact of contacts) {
      await CreateCampaignLogService({
        campaignId: campaign.id,
        contactId: contact.id,
        status: "failed",
        error: message,
        executedAt: new Date()
      });
    }

    await markCampaignStatus(campaign.id, "failed");
    return;
  }

  let failedCount = 0;

  for (const contact of contacts) {
    if (await alreadySent(campaign.id, contact.id)) {
      continue;
    }

    try {
      const ticket = await FindOrCreateTicketService(contact, defaultWhatsapp.id, 0);
      await SendWhatsAppMessage({ body: dialog.content, ticket });
      await CreateCampaignLogService({
        campaignId: campaign.id,
        contactId: contact.id,
        status: "sent",
        message: "Campaign message sent",
        executedAt: new Date()
      });
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : "Campaign send failed";
      await CreateCampaignLogService({
        campaignId: campaign.id,
        contactId: contact.id,
        status: "failed",
        error: message,
        executedAt: new Date()
      });
    }
  }

  if (failedCount > 0) {
    await markCampaignStatus(campaign.id, "failed");
    return;
  }

  await markCampaignStatus(campaign.id, "completed");
};

const runCampaignWorkerOnce = async (): Promise<void> => {
  const batchSize = parseNumber(process.env.CAMPAIGN_BATCH_SIZE, DEFAULT_BATCH_SIZE);

  const campaigns = await Campaign.findAll({
    where: {
      status: "scheduled",
      scheduledAt: {
        [Op.lte]: new Date()
      }
    },
    order: [["scheduledAt", "ASC"]],
    limit: batchSize
  });

  for (const campaign of campaigns) {
    const claimed = await claimCampaign(campaign.id);
    if (!claimed) {
      continue;
    }

    try {
      await runCampaignOnce(campaign);
    } catch (error) {
      logger.error({ info: "Campaign execution failed", error });
      await markCampaignStatus(campaign.id, "failed");
    }
  }
};

const startCampaignWorker = (): void => {
  const pollMs = parseNumber(process.env.CAMPAIGN_POLL_MS, DEFAULT_POLL_MS);
  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      await runCampaignWorkerOnce();
    } catch (error) {
      logger.error({ info: "Campaign worker failed", error });
    } finally {
      running = false;
    }
  };

  void tick();
  setInterval(tick, pollMs);
};

export default startCampaignWorker;
