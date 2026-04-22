import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

const DeleteContactService = async (id: string): Promise<void> => {
  const contact = await Contact.findOne({
    where: { id }
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const payload = contact.get({ plain: true });

  await contact.destroy();

  void TriggerWebhooksService({
    event: "contact.deleted",
    resource: "contact",
    resourceId: contact.id,
    data: payload
  });
};

export default DeleteContactService;
