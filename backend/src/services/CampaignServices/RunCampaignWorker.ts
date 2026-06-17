import { Op } from "sequelize";
import Campaign from "../../models/Campaign";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactList from "../../models/ContactList";
import ContactListContact from "../../models/ContactListContact";
import Dialog from "../../models/Dialog";
import Tag from "../../models/Tag";
import CampaignLog from "../../models/CampaignLog";
import User from "../../models/User";
import { parseCampaignTagIds } from "./campaignTags";
import { applyCampaignTagScope } from "./campaignAudience";
import { parseCampaignScheduledAt } from "./campaignSchedule";
import {
  parseContactListFilters,
  findDynamicContactListContacts
} from "../ContactListServices/contactListFilters";
import CreateCampaignLogService from "./CreateCampaignLogService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import SendStoredWhatsAppMedia from "../WbotServices/SendStoredWhatsAppMedia";
import { logger } from "../../utils/logger";
import { getRandomCampaignContactDelayMs } from "./campaignDelay";

const DEFAULT_POLL_MS = 8000;
const DEFAULT_BATCH_SIZE = 10;
const CAMPAIGN_WORKER_ID = `campaign-worker:${process.pid}`;

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const claimCampaign = async (campaignId: number, now = new Date()): Promise<boolean> => {
  const [updated] = await Campaign.update(
    { status: "processing", lastStatusAt: new Date() },
    {
      where: {
        id: campaignId,
        status: "scheduled",
        isActive: true,
        scheduledAt: {
          [Op.lte]: now
        }
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
  return findDynamicContactListContacts({ filters });
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

const buildSignaturePrefix = (
  user?: Pick<User, "name" | "signMessages"> | null
): string => {
  const userName = user?.name?.trim();

  if (!userName || user?.signMessages === false) {
    return "";
  }

  return `*${userName}:*\n`;
};

const loadCampaignSignaturePrefix = async (
  whatsappId: number
): Promise<string> => {
  const linkedUser = await User.findOne({
    where: { whatsappId },
    attributes: ["name", "signMessages"]
  });

  return buildSignaturePrefix(linkedUser);
};

const resolveCampaignContacts = async (campaign: Campaign): Promise<Contact[]> => {
  const tagIds = parseCampaignTagIds(campaign.tagIds);

  if (campaign.contactListId) {
    const contactsFromList = await loadContactsFromList(campaign.contactListId);
    return applyCampaignTagScope(contactsFromList, tagIds);
  }

  return applyCampaignTagScope(await loadContactsFromTags(tagIds), []);
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
  const signaturePrefix = await loadCampaignSignaturePrefix(defaultWhatsapp.id);
  for (const contact of contacts) {
    if (await alreadySent(campaign.id, contact.id)) {
      continue;
    }

    try {
      const ticket = await FindOrCreateTicketService(contact, defaultWhatsapp.id, 0);
      const body = dialog.content?.trim() || undefined;
      const messageBody = body && signaturePrefix ? `${signaturePrefix}${body}` : body;

      if (dialog.mediaFileName) {
        await SendStoredWhatsAppMedia({
          ticket,
          fileName: dialog.mediaFileName,
          originalName: dialog.mediaOriginalName,
          mimetype: dialog.mediaMimeType,
          body: messageBody
        });
      } else {
        await SendWhatsAppMessage({ body: messageBody || "", ticket });
      }

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

    const contactDelayMs = getRandomCampaignContactDelayMs();

    if (contactDelayMs > 0) {
      await sleep(contactDelayMs);
    }
  }

  if (failedCount > 0) {
    await markCampaignStatus(campaign.id, "failed");
    return;
  }

  await markCampaignStatus(campaign.id, "completed");
};

const validateClaimedCampaignIsDue = async (campaign: Campaign): Promise<boolean> => {
  const now = new Date();

  if (!campaign.scheduledAt) {
    logger.warn({
      info: "Campaign worker skipped campaign without scheduledAt",
      campaignId: campaign.id,
      workerId: CAMPAIGN_WORKER_ID,
      now
    });

    await markCampaignStatus(campaign.id, "failed");
    return false;
  }

  let scheduledAt: Date;

  try {
    scheduledAt = parseCampaignScheduledAt(campaign.scheduledAt);
  } catch (error) {
    logger.warn({
      info: "Campaign worker skipped campaign with invalid scheduledAt",
      campaignId: campaign.id,
      workerId: CAMPAIGN_WORKER_ID,
      scheduledAt: campaign.scheduledAt,
      now
    });

    await markCampaignStatus(campaign.id, "failed");
    return false;
  }

  if (scheduledAt.getTime() > now.getTime()) {
    logger.warn({
      info: "Campaign worker released campaign because it is not due yet",
      campaignId: campaign.id,
      workerId: CAMPAIGN_WORKER_ID,
      scheduledAt,
      now
    });

    await markCampaignStatus(campaign.id, "scheduled");
    return false;
  }

  logger.info({
    info: "Campaign worker executing due campaign",
    campaignId: campaign.id,
    workerId: CAMPAIGN_WORKER_ID,
    scheduledAt,
    now
  });

  return true;
};

const runCampaignWorkerOnce = async (): Promise<void> => {
  const batchSize = parseNumber(process.env.CAMPAIGN_BATCH_SIZE, DEFAULT_BATCH_SIZE);
  const now = new Date();

  const campaigns = await Campaign.findAll({
    where: {
      status: "scheduled",
      isActive: true,
      scheduledAt: {
        [Op.lte]: now
      }
    },
    order: [["scheduledAt", "ASC"]],
    limit: batchSize
  });

  for (const campaign of campaigns) {
    const claimed = await claimCampaign(campaign.id, now);
    if (!claimed) {
      continue;
    }

    await campaign.reload();

    const isDue = await validateClaimedCampaignIsDue(campaign);
    if (!isDue) {
      continue;
    }

    try {
      await runCampaignOnce(campaign);
    } catch (error) {
      logger.error({
        info: "Campaign execution failed",
        campaignId: campaign.id,
        workerId: CAMPAIGN_WORKER_ID,
        error
      });
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
      logger.error({
        info: "Campaign worker failed",
        workerId: CAMPAIGN_WORKER_ID,
        error
      });
    } finally {
      running = false;
    }
  };

  logger.info({
    info: "Campaign worker started",
    workerId: CAMPAIGN_WORKER_ID,
    pollMs
  });

  void tick();
  setInterval(tick, pollMs);
};

export { runCampaignWorkerOnce };

export default startCampaignWorker;
