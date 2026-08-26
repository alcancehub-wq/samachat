import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import QueuePermission from "../../models/QueuePermission";
import Whatsapp from "../../models/Whatsapp";
import AuthorizeMetaMessageTemplateConnectionService from "./AuthorizeMetaMessageTemplateConnectionService";

interface Request {
  profile?: string | null;
  userQueueIds: number[];
}

export interface AuthorizedMetaTemplateConnection {
  id: number;
  name: string;
  providerType: string;
}

const ListAuthorizedMetaTemplateConnectionsService = async ({
  profile,
  userQueueIds
}: Request): Promise<AuthorizedMetaTemplateConnection[]> => {
  const connections = await Whatsapp.findAll({
    attributes: ["id", "name", "providerType"],
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

  return connections
    .filter(connection => {
      if (
        String(connection.providerType || "")
          .trim()
          .toLowerCase() !== "official"
      ) {
        return false;
      }

      try {
        AuthorizeMetaMessageTemplateConnectionService({
          profile,
          permission: "metaTemplates.view",
          userQueueIds,
          connection
        });

        return true;
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 403) {
          return false;
        }

        throw error;
      }
    })
    .map(connection => ({
      id: connection.id,
      name: connection.name,
      providerType: connection.providerType
    }));
};

export default ListAuthorizedMetaTemplateConnectionsService;
