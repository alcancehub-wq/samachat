import AppError from "../../errors/AppError";
import EduzzIntegrationRule from "../../models/EduzzIntegrationRule";

interface Request {
  integrationId: number;
  ruleId: number;
}

const DeleteEduzzIntegrationRuleService = async ({
  integrationId,
  ruleId
}: Request): Promise<void> => {
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

  await rule.destroy();
};

export default DeleteEduzzIntegrationRuleService;
