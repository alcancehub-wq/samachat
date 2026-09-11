import AppError from "../../errors/AppError";

export interface EduzzRuleSelectionCandidate {
  id: number;
  eventName: string;
  productId?: string | null;
}

interface Request<T extends EduzzRuleSelectionCandidate> {
  rules: T[];
  eventName: string;
  productIds: string[];
}

const normalize = (
  value?: string | null
): string => String(value || "").trim();

const sortById = <
  T extends EduzzRuleSelectionCandidate
>(
  left: T,
  right: T
): number => Number(left.id) - Number(right.id);

const SelectEduzzIntegrationRuleService = <
  T extends EduzzRuleSelectionCandidate
>({
  rules,
  eventName,
  productIds
}: Request<T>): T | null => {
  const normalizedEventName =
    normalize(eventName);

  const normalizedProductIds =
    new Set(
      (productIds || [])
        .map(productId => normalize(productId))
        .filter(Boolean)
    );

  const eventRules = (rules || [])
    .filter(
      rule =>
        normalize(rule.eventName) ===
        normalizedEventName
    )
    .sort(sortById);

  const productSpecificRules =
    eventRules.filter(rule => {
      const productId =
        normalize(rule.productId);

      return (
        Boolean(productId) &&
        normalizedProductIds.has(productId)
      );
    });

  if (productSpecificRules.length > 1) {
    throw new AppError(
      "ERR_EDUZZ_MULTIPLE_MATCHING_PRODUCT_RULES",
      409
    );
  }

  if (productSpecificRules.length === 1) {
    return productSpecificRules[0];
  }

  const genericRules =
    eventRules.filter(
      rule => !normalize(rule.productId)
    );

  if (genericRules.length > 1) {
    throw new AppError(
      "ERR_EDUZZ_MULTIPLE_GENERIC_RULES",
      409
    );
  }

  return genericRules[0] || null;
};

export default SelectEduzzIntegrationRuleService;
