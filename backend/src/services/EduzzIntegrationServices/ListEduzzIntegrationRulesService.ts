import AppError from "../../errors/AppError";
import EduzzIntegrationRule from "../../models/EduzzIntegrationRule";
import Integration from "../../models/Integration";

interface Request {
  integrationId: number;
}

const ListEduzzIntegrationRulesService = async ({
  integrationId
}: Request): Promise<EduzzIntegrationRule[]> => {
  const integration = await Integration.findByPk(
    integrationId
  );

  if (
    !integration ||
    integration.type !== "eduzz"
  ) {
    throw new AppError(
      "ERR_EDUZZ_INTEGRATION_NOT_FOUND",
      404
    );
  }

  return EduzzIntegrationRule.findAll({
    where: {
      integrationId
    },
    order: [
      ["id", "ASC"]
    ]
  });
};

export default ListEduzzIntegrationRulesService;
