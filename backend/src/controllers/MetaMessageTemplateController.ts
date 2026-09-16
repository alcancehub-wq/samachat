import { Request, Response } from "express";

import ShowUserService from "../services/UserServices/ShowUserService";
import AuthorizeMetaMessageTemplateConnectionService from "../services/MetaMessageTemplateServices/AuthorizeMetaMessageTemplateConnectionService";
import ListMetaMessageTemplatesService from "../services/MetaMessageTemplateServices/ListMetaMessageTemplatesService";
import LoadMetaMessageTemplateConnectionService from "../services/MetaMessageTemplateServices/LoadMetaMessageTemplateConnectionService";
import ListAuthorizedMetaTemplateConnectionsService from "../services/MetaMessageTemplateServices/ListAuthorizedMetaTemplateConnectionsService";
import CreateMetaMessageTemplateService from "../services/MetaMessageTemplateServices/CreateMetaMessageTemplateService";
import DeleteMetaMessageTemplateService from "../services/MetaMessageTemplateServices/DeleteMetaMessageTemplateService";
import ResolveApprovedMetaMessageTemplateService from "../services/MetaMessageTemplateServices/ResolveApprovedMetaMessageTemplateService";
import ValidateMetaMessageTemplateVariableMappingService from "../services/MetaMessageTemplateServices/ValidateMetaMessageTemplateVariableMappingService";
import SaveMetaMessageTemplateVariableMappingService from "../services/MetaMessageTemplateServices/SaveMetaMessageTemplateVariableMappingService";
import DeleteMetaMessageTemplateVariableMappingService from "../services/MetaMessageTemplateServices/DeleteMetaMessageTemplateVariableMappingService";
import metaMessageTemplateGetExecutor, {
  metaMessageTemplatePostExecutor,
  metaMessageTemplateDeleteExecutor
} from "../services/MetaMessageTemplateServices/MetaMessageTemplateHttpExecutor";

export const authorizedConnections = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await ShowUserService(req.user.id);

  const connections =
    await ListAuthorizedMetaTemplateConnectionsService({
      profile: req.user.profile,
      userQueueIds: (user.queues || []).map(queue => queue.id)
    });

  return res.status(200).json(connections);
};

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

  const templates =
    await ListMetaMessageTemplatesService({
      connection,
      getExecutor: metaMessageTemplateGetExecutor,
      includeVariableMappings: true
    });

  return res.status(200).json(templates);
};

export const store = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const user = await ShowUserService(req.user.id);

  const connection =
    await LoadMetaMessageTemplateConnectionService(whatsappId);

  AuthorizeMetaMessageTemplateConnectionService({
    profile: req.user.profile,
    permission: "metaTemplates.create",
    userQueueIds: (user.queues || []).map(queue => queue.id),
    connection
  });

  const {
    samachatVariableMapping,
    ...templatePayload
  } = req.body || {};

  const template =
    await CreateMetaMessageTemplateService({
      connection,
      template: templatePayload,
      variableMapping: samachatVariableMapping,
      postExecutor: metaMessageTemplatePostExecutor
    });

  return res.status(201).json(template);
};

export const updateVariableMapping = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    whatsappId,
    name,
    language
  } = req.params;

  const user = await ShowUserService(req.user.id);

  const connection =
    await LoadMetaMessageTemplateConnectionService(whatsappId);

  AuthorizeMetaMessageTemplateConnectionService({
    profile: req.user.profile,
    permission: "metaTemplates.create",
    userQueueIds: (user.queues || []).map(queue => queue.id),
    connection
  });

  const template =
    await ResolveApprovedMetaMessageTemplateService({
      connection,
      name,
      language,
      getExecutor: metaMessageTemplateGetExecutor
    });

  const variableMapping =
    ValidateMetaMessageTemplateVariableMappingService({
      template,
      variableMapping:
        req.body?.samachatVariableMapping,
      requireComplete: true
    });

  await SaveMetaMessageTemplateVariableMappingService({
    whatsappId: connection.id,
    templateName: name,
    templateLanguage: language,
    variableMapping
  });

  return res.status(200).json({
    samachatVariableMapping:
      variableMapping
  });
};

export const destroy = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, name } = req.params;
  const user = await ShowUserService(req.user.id);

  const connection =
    await LoadMetaMessageTemplateConnectionService(whatsappId);

  AuthorizeMetaMessageTemplateConnectionService({
    profile: req.user.profile,
    permission: "metaTemplates.delete",
    userQueueIds: (user.queues || []).map(queue => queue.id),
    connection
  });

  const result =
    await DeleteMetaMessageTemplateService({
      connection,
      name,
      deleteExecutor:
        metaMessageTemplateDeleteExecutor
    });

  await DeleteMetaMessageTemplateVariableMappingService({
    whatsappId: connection.id,
    templateName: name
  });

  return res.status(200).json(result);
};