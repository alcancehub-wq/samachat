import { Op, WhereOptions } from "sequelize";
import AppError from "../../errors/AppError";
import EduzzIntegrationRule from "../../models/EduzzIntegrationRule";
import Integration from "../../models/Integration";
import Whatsapp from "../../models/Whatsapp";
import ValidateEduzzRuleOwnershipService from "./ValidateEduzzRuleOwnershipService";
import ValidateEduzzMetaTemplateComponentsService from "./ValidateEduzzMetaTemplateComponentsService";

export interface EduzzRuleInput {
  eventName: string;
  productId?: string | null;
  whatsappId: number;
  userId: number;
  messageMode: string;
  messageBody: string;
  metaTemplateName?: string | null;
  metaTemplateLanguage?: string | null;
  metaTemplateComponents?: Array<Record<string, unknown>> | null;
  isActive?: boolean;
}

interface Request {
  integrationId: number;
  ruleId?: number;
  data: EduzzRuleInput;
}

const normalizeRequired = (
  value?: string | null
): string => String(value || "").trim();

const SaveEduzzIntegrationRuleService = async ({
  integrationId,
  ruleId,
  data
}: Request): Promise<EduzzIntegrationRule> => {
  const integration = await Integration.findByPk(integrationId);

  if (
    !integration ||
    integration.type !== "eduzz"
  ) {
    throw new AppError(
      "ERR_EDUZZ_INTEGRATION_NOT_FOUND",
      404
    );
  }

  const eventName = normalizeRequired(data.eventName);

  if (!eventName) {
    throw new AppError(
      "ERR_EDUZZ_EVENT_NAME_REQUIRED",
      422
    );
  }
  const productId =
    normalizeRequired(data.productId) || null;

  const duplicateWhere: WhereOptions = {
    integrationId,
    eventName,
    productId
  };

  if (ruleId) {
    duplicateWhere.id = {
      [Op.ne]: ruleId
    };
  }

  const duplicateRule =
    await EduzzIntegrationRule.findOne({
      where: duplicateWhere
    });

  if (duplicateRule) {
    throw new AppError(
      "ERR_EDUZZ_RULE_ALREADY_EXISTS",
      409
    );
  }

  if (
    !Number.isInteger(Number(data.whatsappId)) ||
    Number(data.whatsappId) <= 0
  ) {
    throw new AppError(
      "ERR_EDUZZ_WHATSAPP_REQUIRED",
      422
    );
  }

  if (
    !Number.isInteger(Number(data.userId)) ||
    Number(data.userId) <= 0
  ) {
    throw new AppError(
      "ERR_EDUZZ_USER_REQUIRED",
      422
    );
  }

  await ValidateEduzzRuleOwnershipService({
    userId: Number(data.userId),
    whatsappId: Number(data.whatsappId)
  });

  const whatsapp = await Whatsapp.findByPk(
    Number(data.whatsappId),
    {
      attributes: [
        "id",
        "providerType"
      ]
    }
  );

  if (!whatsapp) {
    throw new AppError(
      "ERR_NO_WAPP_FOUND",
      404
    );
  }

  const isOfficial =
    whatsapp.providerType === "official";

  const expectedMode =
    isOfficial ? "template" : "text";

  const messageMode =
    normalizeRequired(data.messageMode).toLowerCase();

  if (messageMode !== expectedMode) {
    throw new AppError(
      isOfficial
        ? "ERR_EDUZZ_OFFICIAL_REQUIRES_TEMPLATE_MODE"
        : "ERR_EDUZZ_WEB_REQUIRES_TEXT_MODE",
      422
    );
  }

  const messageBody =
    normalizeRequired(data.messageBody);

  if (
    !isOfficial &&
    !messageBody
  ) {
    throw new AppError(
      "ERR_EDUZZ_MESSAGE_BODY_REQUIRED",
      422
    );
  }

  const metaTemplateName =
    normalizeRequired(data.metaTemplateName);

  const metaTemplateLanguage =
    normalizeRequired(data.metaTemplateLanguage);

  if (
    isOfficial &&
    !metaTemplateName
  ) {
    throw new AppError(
      "ERR_EDUZZ_META_TEMPLATE_NAME_REQUIRED",
      422
    );
  }

  if (
    isOfficial &&
    !metaTemplateLanguage
  ) {
    throw new AppError(
      "ERR_EDUZZ_META_TEMPLATE_LANGUAGE_REQUIRED",
      422
    );
  }

  const values = {
    integrationId,
    eventName,
    productId,
    whatsappId: Number(data.whatsappId),
    userId: Number(data.userId),
    messageMode: expectedMode,
    messageBody,
    metaTemplateName:
      isOfficial ? metaTemplateName : null,
    metaTemplateLanguage:
      isOfficial ? metaTemplateLanguage : null,
    metaTemplateComponents:
      isOfficial
        ? ValidateEduzzMetaTemplateComponentsService(
            data.metaTemplateComponents
          )
        : null,
    isActive: data.isActive !== false
  };

  if (ruleId) {
    const rule = await EduzzIntegrationRule.findOne({
      where: {
        id: ruleId,
        integrationId
      }
    });

    if (!rule) {
      throw new AppError(
        "ERR_EDUZZ_RULE_NOT_FOUND",
        404
      );
    }

    await rule.update(values);
    await rule.reload();

    return rule;
  }

  return EduzzIntegrationRule.create(values);
};

export default SaveEduzzIntegrationRuleService;
