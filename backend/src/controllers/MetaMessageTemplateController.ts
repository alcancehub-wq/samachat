import { Request, Response } from "express";

import ShowUserService from "../services/UserServices/ShowUserService";
import AuthorizeMetaMessageTemplateConnectionService from "../services/MetaMessageTemplateServices/AuthorizeMetaMessageTemplateConnectionService";
import ListMetaMessageTemplatesService from "../services/MetaMessageTemplateServices/ListMetaMessageTemplatesService";
import LoadMetaMessageTemplateConnectionService from "../services/MetaMessageTemplateServices/LoadMetaMessageTemplateConnectionService";
import metaMessageTemplateGetExecutor from "../services/MetaMessageTemplateServices/MetaMessageTemplateHttpExecutor";

export const index = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const user = await ShowUserService(req.user.id);
  const connection =
    await LoadMetaMessageTemplateConnectionService(whatsappId);

  AuthorizeMetaMessageTemplateConnectionService({
    profile: req.user.profile,
    permission: "metaTemplates.view",
    userQueueIds: (user.queues || []).map(queue => queue.id),
    connection
  });

  const templates = await ListMetaMessageTemplatesService({
    connection,
    getExecutor: metaMessageTemplateGetExecutor
  });

  return res.status(200).json(templates);
};
