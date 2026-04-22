import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";

const ShowTagService = async (id: string | number): Promise<Tag> => {
  const tag = await Tag.findByPk(id);

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  return tag;
};

export default ShowTagService;
