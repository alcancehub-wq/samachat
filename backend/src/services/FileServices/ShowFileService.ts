import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";

const ShowFileService = async (id: string | number): Promise<Message> => {
  const file = await Message.findByPk(id, {
    include: [
      {
        model: Ticket,
        attributes: ["id", "status"]
      },
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"]
      }
    ]
  });

  if (!file) {
    throw new AppError("ERR_NO_FILE_FOUND", 404);
  }

  if (!file.getDataValue("mediaUrl")) {
    throw new AppError("ERR_NO_MEDIA_FOUND", 404);
  }

  return file;
};

export default ShowFileService;
