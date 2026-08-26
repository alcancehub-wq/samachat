import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import QueuePermission from "../../models/QueuePermission";
import Whatsapp from "../../models/Whatsapp";

const LoadMetaMessageTemplateConnectionService = async (
  id: string | number
): Promise<Whatsapp> => {
  const connection = await Whatsapp.findByPk(id, {
    attributes: [
      "id",
      "name",
      "providerType",
      "wabaId",
      "accessToken",
      "apiVersion"
    ],
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name"],
        include: [
          {
            model: QueuePermission,
            attributes: ["permissions"]
          }
        ]
      }
    ]
  });

  if (!connection) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  return connection;
};

export default LoadMetaMessageTemplateConnectionService;
