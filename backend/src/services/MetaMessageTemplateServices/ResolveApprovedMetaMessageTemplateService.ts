import AppError from "../../errors/AppError";
import ListMetaMessageTemplatesService, {
  MetaMessageTemplateConnectionContext
} from "./ListMetaMessageTemplatesService";
import { MetaMessageTemplateGetExecutor } from "./MetaMessageTemplateClient";
import { MetaMessageTemplate } from "./types";

interface ResolveApprovedMetaMessageTemplateRequest {
  connection: MetaMessageTemplateConnectionContext;
  name: string;
  language: string;
  getExecutor: MetaMessageTemplateGetExecutor;
  maxPages?: number;
}

const DEFAULT_MAX_PAGES = 100;

const normalizeRequired = (
  value?: string | null
): string => {
  return (value || "").trim();
};

const normalizeStatus = (
  value?: string | null
): string => {
  return normalizeRequired(value).toUpperCase();
};

const ResolveApprovedMetaMessageTemplateService = async ({
  connection,
  name,
  language,
  getExecutor,
  maxPages = DEFAULT_MAX_PAGES
}: ResolveApprovedMetaMessageTemplateRequest): Promise<MetaMessageTemplate> => {
  const cleanName = normalizeRequired(name);
  const cleanLanguage = normalizeRequired(language);

  if (!cleanName) {
    throw new AppError("ERR_META_TEMPLATE_NAME_REQUIRED");
  }

  if (!cleanLanguage) {
    throw new AppError("ERR_META_TEMPLATE_LANGUAGE_REQUIRED");
  }

  if (
    !Number.isInteger(maxPages) ||
    maxPages <= 0
  ) {
    throw new AppError(
      "ERR_META_TEMPLATE_PAGINATION_LIMIT_INVALID"
    );
  }

  const seenAfterCursors = new Set<string>();

  let after: string | undefined;

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await ListMetaMessageTemplatesService({
      connection,
      getExecutor,
      pagination: after
        ? {
            after
          }
        : undefined
    });

    const matchingTemplates = (response.data || []).filter(
      template =>
        normalizeRequired(template.name) === cleanName &&
        normalizeRequired(template.language) === cleanLanguage
    );

    if (matchingTemplates.length > 0) {
      const approved = matchingTemplates.find(
        template =>
          normalizeStatus(template.status) === "APPROVED"
      );

      if (approved) {
        return approved;
      }

      throw new AppError(
        "ERR_META_TEMPLATE_NOT_APPROVED"
      );
    }

    const nextAfter = normalizeRequired(
      response.paging?.cursors?.after
    );

    if (!nextAfter) {
      throw new AppError(
        "ERR_META_TEMPLATE_NOT_FOUND"
      );
    }

    if (seenAfterCursors.has(nextAfter)) {
      throw new AppError(
        "ERR_META_TEMPLATE_PAGINATION_LOOP_DETECTED"
      );
    }

    seenAfterCursors.add(nextAfter);
    after = nextAfter;
  }

  throw new AppError(
    "ERR_META_TEMPLATE_PAGINATION_LIMIT_REACHED"
  );
};

export default ResolveApprovedMetaMessageTemplateService;