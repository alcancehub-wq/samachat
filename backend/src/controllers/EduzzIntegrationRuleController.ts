import { Request, Response } from "express";

import DeleteEduzzIntegrationRuleService from "../services/EduzzIntegrationServices/DeleteEduzzIntegrationRuleService";
import ListEduzzIntegrationRulesService from "../services/EduzzIntegrationServices/ListEduzzIntegrationRulesService";
import SaveEduzzIntegrationRuleService, {
  EduzzRuleInput
} from "../services/EduzzIntegrationServices/SaveEduzzIntegrationRuleService";

const parseId = (
  value: string,
  errorCode: string
): number => {
  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(errorCode);
  }

  return id;
};

export const index = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const integrationId = parseId(
    req.params.integrationId,
    "ERR_EDUZZ_INTEGRATION_ID_INVALID"
  );

  const rules =
    await ListEduzzIntegrationRulesService({
      integrationId
    });

  return res.json(rules);
};

export const store = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const integrationId = parseId(
    req.params.integrationId,
    "ERR_EDUZZ_INTEGRATION_ID_INVALID"
  );

  const rule =
    await SaveEduzzIntegrationRuleService({
      integrationId,
      data: req.body as EduzzRuleInput
    });

  return res.status(201).json(rule);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const integrationId = parseId(
    req.params.integrationId,
    "ERR_EDUZZ_INTEGRATION_ID_INVALID"
  );

  const ruleId = parseId(
    req.params.ruleId,
    "ERR_EDUZZ_RULE_ID_INVALID"
  );

  const rule =
    await SaveEduzzIntegrationRuleService({
      integrationId,
      ruleId,
      data: req.body as EduzzRuleInput
    });

  return res.json(rule);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const integrationId = parseId(
    req.params.integrationId,
    "ERR_EDUZZ_INTEGRATION_ID_INVALID"
  );

  const ruleId = parseId(
    req.params.ruleId,
    "ERR_EDUZZ_RULE_ID_INVALID"
  );

  await DeleteEduzzIntegrationRuleService({
    integrationId,
    ruleId
  });

  return res.json({
    message: "Eduzz rule deleted"
  });
};
