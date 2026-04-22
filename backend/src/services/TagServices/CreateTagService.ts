import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

interface Request {
  name: string;
  color?: string;
}

const CreateTagService = async ({
  name,
  color = "#64748b"
}: Request): Promise<Tag> => {
  const trimmedName = name.trim();

  const existingTag = await Tag.findOne({
    where: {
      name: trimmedName
    }
  });

  if (existingTag) {
    throw new AppError("ERR_DUPLICATED_TAG");
  }

  const tag = await Tag.create({
    name: trimmedName,
    color
  });

  void TriggerWebhooksService({
    event: "tag.created",
    resource: "tag",
    resourceId: tag.id,
    data: tag.get({ plain: true })
  });

  return tag;
};

export default CreateTagService;
