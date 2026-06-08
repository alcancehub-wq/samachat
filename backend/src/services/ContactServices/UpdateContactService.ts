import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}
interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  extraInfo?: ExtraInfo[];
  tagIds?: number[];
  allowMultipleConversations?: boolean;
}

interface Request {
  contactData: ContactData;
  contactId: string;
}

const UpdateContactService = async ({
  contactData,
  contactId
}: Request): Promise<Contact> => {
  const {
    email,
    name,
    number,
    extraInfo,
    tagIds,
    allowMultipleConversations
  } = contactData;

  const contact = await Contact.findOne({
    where: { id: contactId },
    attributes: ["id", "name", "number", "email", "profilePicUrl"],
    include: ["extraInfo", "tags"]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (extraInfo) {
    await Promise.all(
      extraInfo.map(async info => {
        await ContactCustomField.upsert({ ...info, contactId: contact.id });
      })
    );

    await Promise.all(
      contact.extraInfo.map(async oldInfo => {
        const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);

        if (stillExists === -1) {
          await ContactCustomField.destroy({ where: { id: oldInfo.id } });
        }
      })
    );
  }

  const updatePayload: Partial<ContactData> = {
    name,
    number,
    email
  };

  if (typeof allowMultipleConversations === "boolean") {
    updatePayload.allowMultipleConversations = allowMultipleConversations;
  }

  await contact.update(updatePayload);

  if (tagIds) {
    await contact.$set("tags", tagIds);
  }

  await contact.reload({
    attributes: ["id", "name", "number", "email", "profilePicUrl"],
    include: ["extraInfo", "tags"]
  });

  void TriggerWebhooksService({
    event: "contact.updated",
    resource: "contact",
    resourceId: contact.id,
    data: contact.get({ plain: true })
  });

  return contact;
};

export default UpdateContactService;
