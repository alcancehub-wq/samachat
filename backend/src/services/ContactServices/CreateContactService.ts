import AppError from "../../errors/AppError";
import { Transaction } from "sequelize";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";
import CaptureCreateContactSourceBridge, {
  CreateContactSourceContext
} from "../CrmIntegrationServices/CaptureCreateContactSourceBridge";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  tagIds?: number[];
  allowMultipleConversations?: boolean;
  city?: string;
  state?: string;
  captureChannel?: string;
  wasReferred?: boolean | null;
  referralType?: string | null;
  referralContactId?: number | null;
  referralContactName?: string | null;
  referralUserId?: number | null;
  referralPartnerName?: string | null;
  referralNote?: string | null;
}

const CreateContactService = async (
  {
    name,
    number,
    email = "",
    extraInfo = [],
    tagIds = [],
    allowMultipleConversations,
    city,
    state,
    captureChannel,
    wasReferred,
    referralType,
    referralContactId,
    referralContactName,
    referralUserId,
    referralPartnerName,
    referralNote
  }: Request,
  sourceContext?: CreateContactSourceContext
): Promise<Contact> => {
  const persistSource = async (transaction?: Transaction): Promise<Contact> => {
    const numberExists = await Contact.findOne({
      where: { number },
      ...(transaction ? { transaction } : {})
    });

    if (numberExists) {
      throw new AppError("ERR_DUPLICATED_CONTACT");
    }

    const contact = await Contact.create(
      {
        name,
        number,
        email,
        extraInfo,
        allowMultipleConversations,
        city,
        state,
        captureChannel,
        wasReferred,
        referralType,
        referralContactId,
        referralContactName,
        referralUserId,
        referralPartnerName,
        referralNote
      },
      {
        include: ["extraInfo"],
        ...(transaction ? { transaction } : {})
      }
    );

    if (tagIds.length > 0) {
      if (transaction) await contact.$set("tags", tagIds, { transaction });
      else await contact.$set("tags", tagIds);
    }

    await contact.reload({
      include: ["extraInfo", "tags"],
      ...(transaction ? { transaction } : {})
    });
    return contact;
  };

  let result: { contact: Contact; created: boolean };

  if (sourceContext?.enabled === true) {
    try {
      result = await CaptureCreateContactSourceBridge(
        Contact,
        sourceContext,
        {
          name,
          number,
          email,
          extraInfo,
          tagIds,
          allowMultipleConversations,
          city,
          state,
          captureChannel,
          wasReferred,
          referralType,
          referralContactId,
          referralContactName,
          referralUserId,
          referralPartnerName,
          referralNote
        },
        transaction => persistSource(transaction)
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          flow: "crm_source_bridge",
          operation: "contact_create"
        },
        "CRM source bridge failed; preserving local contact creation"
      );
      result = { contact: await persistSource(), created: true };
    }
  } else {
    result = { contact: await persistSource(), created: true };
  }
  const { contact } = result;

  if (result.created) {
    void TriggerWebhooksService({
      event: "contact.created",
      resource: "contact",
      resourceId: contact.id,
      data: contact.get({ plain: true })
    });
  }

  return contact;
};

export default CreateContactService;