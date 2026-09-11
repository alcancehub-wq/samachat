import { UniqueConstraintError } from "sequelize";

import AppError from "../../errors/AppError";
import EduzzIntegrationRule from "../../models/EduzzIntegrationRule";
import EduzzWebhookEvent from "../../models/EduzzWebhookEvent";
import Integration from "../../models/Integration";
import NormalizeEduzzWebhookPayloadService from "./NormalizeEduzzWebhookPayloadService";
import VerifyEduzzSignatureService from "./VerifyEduzzSignatureService";
import ResolveEduzzContactTicketService from "./ResolveEduzzContactTicketService";
import DispatchEduzzMessageService from "./DispatchEduzzMessageService";
import BuildEduzzMessageExtraDataService from "./BuildEduzzMessageExtraDataService";
import SelectEduzzIntegrationRuleService from "./SelectEduzzIntegrationRuleService";

interface Request {
  integrationId: number;
  payload: unknown;
  rawBody?: Buffer;
  signature?: string | string[];
}

interface Response {
  status: "accepted" | "duplicate" | "ignored";
  eventId: string;
}

const ProcessEduzzWebhookService = async ({
  integrationId,
  payload,
  rawBody,
  signature
}: Request): Promise<Response> => {
  const integration = await Integration.findByPk(integrationId);

  if (
    !integration ||
    integration.type !== "eduzz" ||
    integration.isActive === false
  ) {
    throw new AppError("ERR_EDUZZ_INTEGRATION_NOT_FOUND", 404);
  }

  if (!integration.apiKey) {
    throw new AppError(
      "ERR_EDUZZ_WEBHOOK_SECRET_NOT_CONFIGURED",
      500
    );
  }

  const signatureValid = VerifyEduzzSignatureService({
    rawBody,
    signature,
    secret: integration.apiKey
  });

  if (!signatureValid) {
    throw new AppError(
      "ERR_EDUZZ_WEBHOOK_SIGNATURE_INVALID",
      401
    );
  }

  const normalized = NormalizeEduzzWebhookPayloadService(
    (payload || {}) as any
  );


  const rules = await EduzzIntegrationRule.findAll({
    where: {
      integrationId,
      isActive: true
    }
  });

  if (!rules.length) {
    throw new AppError("ERR_EDUZZ_RULE_NOT_FOUND", 404);
  }


  const matchedRule =
    SelectEduzzIntegrationRuleService({
      rules,
      eventName: normalized.eventName,
      productIds: normalized.productIds
    });

  if (!matchedRule) {
    return {
      status: "ignored",
      eventId: normalized.eventId
    };
  }

  let webhookEvent: EduzzWebhookEvent | null = null;

  const claimFailedEvent = async (
    event: EduzzWebhookEvent
  ): Promise<EduzzWebhookEvent | null> => {
    const [claimed] = await EduzzWebhookEvent.update(
      {
        status: "processing",
        error: null
      },
      {
        where: {
          id: event.id,
          status: "failed"
        }
      }
    );

    if (claimed !== 1) {
      return null;
    }

    return EduzzWebhookEvent.findByPk(event.id);
  };

  const existingEvent = await EduzzWebhookEvent.findOne({
    where: {
      integrationId,
      eventId: normalized.eventId
    }
  });

  if (existingEvent) {
    if (existingEvent.status !== "failed") {
      return {
        status: "duplicate",
        eventId: normalized.eventId
      };
    }

    webhookEvent = await claimFailedEvent(existingEvent);

    if (!webhookEvent) {
      return {
        status: "duplicate",
        eventId: normalized.eventId
      };
    }
  } else {
    try {
      webhookEvent = await EduzzWebhookEvent.create({
        integrationId,
        eventId: normalized.eventId,
        eventName: normalized.eventName,
        status: "processing",
        productId: matchedRule.productId || null,
        buyerPhone: normalized.buyerPhone
      });
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) {
        throw error;
      }

      const concurrentEvent =
        await EduzzWebhookEvent.findOne({
          where: {
            integrationId,
            eventId: normalized.eventId
          }
        });

      if (!concurrentEvent) {
        throw error;
      }

      if (concurrentEvent.status !== "failed") {
        return {
          status: "duplicate",
          eventId: normalized.eventId
        };
      }

      webhookEvent =
        await claimFailedEvent(concurrentEvent);

      if (!webhookEvent) {
        return {
          status: "duplicate",
          eventId: normalized.eventId
        };
      }
    }
  }

  if (!webhookEvent) {
    throw new AppError(
      "ERR_EDUZZ_WEBHOOK_EVENT_CLAIM_FAILED",
      409
    );
  }

  let processingStage:
    | "processing"
    | "ticket_resolved"
    | "dispatching"
    | "provider_accepted" = "processing";

  try {
    const { ticket } = await ResolveEduzzContactTicketService({
      buyerName: normalized.buyerName,
      buyerEmail: normalized.buyerEmail,
      buyerPhone: normalized.buyerPhone,
      userId: matchedRule.userId,
      whatsappId: matchedRule.whatsappId
    });

    processingStage = "ticket_resolved";

    await webhookEvent.update({
      status: "ticket_resolved",
      ticketId: ticket.id,
      error: null
    });

    const extraData = BuildEduzzMessageExtraDataService({
      buyerName: normalized.buyerName,
      buyerEmail: normalized.buyerEmail,
      buyerPhone: normalized.buyerPhone,
      invoiceId: normalized.invoiceId,
      productIds: normalized.productIds,
      eventId: normalized.eventId,
      eventName: normalized.eventName,
      blinketEventId: normalized.blinketEventId,
      blinketEventName: normalized.blinketEventName,
      blinketTicketName: normalized.blinketTicketName,
      blinketParticipantId: normalized.blinketParticipantId,
      blinketInviteKey: normalized.blinketInviteKey,
      blinketParticipantName: normalized.blinketParticipantName,
      blinketParticipantEmail: normalized.blinketParticipantEmail,
      blinketParticipantPhone: normalized.blinketParticipantPhone,
      blinketParticipantStatus: normalized.blinketParticipantStatus
    });

    processingStage = "dispatching";

    await webhookEvent.update({
      status: "dispatching",
      ticketId: ticket.id,
      error: null
    });

    await DispatchEduzzMessageService({
      ticketId: ticket.id,
      messageMode: matchedRule.messageMode,
      messageBody: matchedRule.messageBody,
      metaTemplateName: matchedRule.metaTemplateName,
      metaTemplateLanguage: matchedRule.metaTemplateLanguage,
      metaTemplateComponents: matchedRule.metaTemplateComponents,
      extraData
    });

    processingStage = "provider_accepted";

    await webhookEvent.update({
      status: "sent",
      ticketId: ticket.id,
      error: null
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ERR_EDUZZ_WEBHOOK_PROCESSING";

    const deliveryMayHaveOccurred =
      processingStage === "dispatching" ||
      processingStage === "provider_accepted";

    await webhookEvent.update({
      status: deliveryMayHaveOccurred
        ? "delivery_uncertain"
        : "failed",
      error: message
    });

    throw error;
  }

  return {
    status: "accepted",
    eventId: normalized.eventId
  };
};

export default ProcessEduzzWebhookService;
