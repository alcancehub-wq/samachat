import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

const DeleteTagService = async (id: string | number): Promise<void> => {
  const tag = await Tag.findByPk(id);

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  const payload = tag.get({ plain: true });

  await tag.destroy();

  void TriggerWebhooksService({
    event: "tag.deleted",
    resource: "tag",
    resourceId: tag.id,
    data: payload
  });
};

export default DeleteTagService;
