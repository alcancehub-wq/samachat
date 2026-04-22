import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

interface Request {
  tagId: string | number;
  tagData: {
    name?: string;
    color?: string;
  };
}

const UpdateTagService = async ({ tagId, tagData }: Request): Promise<Tag> => {
  const tag = await Tag.findByPk(tagId);

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  if (tagData.name) {
    tagData.name = tagData.name.trim();
  }

  await tag.update(tagData);

  void TriggerWebhooksService({
    event: "tag.updated",
    resource: "tag",
    resourceId: tag.id,
    data: tag.get({ plain: true })
  });

  return tag;
};

export default UpdateTagService;
