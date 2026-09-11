import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";

import CloudApiClient from "../CloudApiServices/CloudApiClient";
import CreateMessageService from "../MessageServices/CreateMessageService";
import LoadMetaMessageTemplateConnectionService from "../MetaMessageTemplateServices/LoadMetaMessageTemplateConnectionService";
import { metaMessageTemplateGetExecutor } from "../MetaMessageTemplateServices/MetaMessageTemplateHttpExecutor";
import ResolveApprovedMetaMessageTemplateService from "../MetaMessageTemplateServices/ResolveApprovedMetaMessageTemplateService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ResolveEduzzMessageVariablesService from "./ResolveEduzzMessageVariablesService";

interface Request {
  ticketId: number;
  messageMode: string;
  messageBody: string;
  metaTemplateName?: string | null;
  metaTemplateLanguage?: string | null;
  metaTemplateComponents?: Array<Record<string, unknown>> | null;
  extraData: Record<string, unknown>;
}

interface Response {
  providerMessageId: string;
}

const DispatchEduzzMessageService = async ({
  ticketId,
  messageMode,
  messageBody,
  metaTemplateName,
  metaTemplateLanguage,
  metaTemplateComponents,
  extraData
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);

  if (ticket.status !== "open") {
    throw new AppError("ERR_EDUZZ_TICKET_NOT_OPEN", 409);
  }

  if (!ticket.whatsappId) {
    throw new AppError("ERR_EDUZZ_TICKET_WHATSAPP_MISSING", 409);
  }

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  const mode = String(messageMode || "").trim().toLowerCase();

  if (whatsapp.providerType === "official") {
    if (mode !== "template") {
      throw new AppError(
        "ERR_EDUZZ_OFFICIAL_REQUIRES_TEMPLATE_MODE",
        409
      );
    }

    const templateName = String(metaTemplateName || "").trim();
    const templateLanguage = String(
      metaTemplateLanguage || ""
    ).trim();

    if (!templateName) {
      throw new AppError(
        "ERR_EDUZZ_META_TEMPLATE_NAME_REQUIRED",
        422
      );
    }

    if (!templateLanguage) {
      throw new AppError(
        "ERR_EDUZZ_META_TEMPLATE_LANGUAGE_REQUIRED",
        422
      );
    }

    const templateConnection =
      await LoadMetaMessageTemplateConnectionService(
        whatsapp.id
      );

    await ResolveApprovedMetaMessageTemplateService({
      connection: templateConnection,
      name: templateName,
      language: templateLanguage,
      getExecutor: metaMessageTemplateGetExecutor
    });

    const number = String(ticket.contact?.number || "")
      .replace(/\D/g, "");

    if (!number) {
      throw new AppError(
        "ERR_EDUZZ_BUYER_PHONE_MISSING",
        422
      );
    }

    const client = new CloudApiClient({
      accessToken: whatsapp.accessToken,
      phoneNumberId: whatsapp.phoneNumberId,
      apiVersion: whatsapp.apiVersion
    });

    const result = await client.sendTemplate({
      to: number,
      name: templateName,
      languageCode: templateLanguage,
      components:
        Array.isArray(metaTemplateComponents) &&
        metaTemplateComponents.length > 0
          ? ResolveEduzzMessageVariablesService({
              value: metaTemplateComponents,
              ticket,
              extraData
            }) as Array<Record<string, unknown>>
          : undefined
    });

    const providerMessageId =
      result.messages?.[0]?.id ||
      `eduzz-template-${ticket.id}-${Date.now()}`;

    const resolvedHistoryBody =
      ResolveEduzzMessageVariablesService({
        value: String(messageBody || ""),
        ticket,
        extraData
      }) as string;

    const historyBody =
      resolvedHistoryBody.trim() ||
      `[Template Meta: ${templateName}]`;

    await CreateMessageService({
      messageData: {
        id: providerMessageId,
        ticketId: ticket.id,
        contactId: ticket.contactId,
        body: historyBody,
        fromMe: true,
        read: true,
        mediaType: "chat",
        ack: 1
      }
    });

    await ticket.update({
      lastMessage: historyBody
    });

    return {
      providerMessageId
    };
  }

  if (mode !== "text") {
    throw new AppError(
      "ERR_EDUZZ_WEB_REQUIRES_TEXT_MODE",
      409
    );
  }

  const body = (
    ResolveEduzzMessageVariablesService({
      value: String(messageBody || ""),
      ticket,
      extraData
    }) as string
  ).trim();

  if (!body) {
    throw new AppError(
      "ERR_EDUZZ_MESSAGE_BODY_MISSING",
      422
    );
  }

  const providerMessage = await SendWhatsAppMessage({
    body,
    ticket,
    whatsapp
  });

  const providerMessageId =
    providerMessage.id ||
    `eduzz-web-${ticket.id}-${Date.now()}`;

  await CreateMessageService({
    messageData: {
      id: providerMessageId,
      ticketId: ticket.id,
      contactId: ticket.contactId,
      body: providerMessage.body || body,
      fromMe: true,
      read: true,
      mediaType: providerMessage.type || "chat",
      ack: providerMessage.ack ?? 1
    }
  });

  return {
    providerMessageId
  };
};

export default DispatchEduzzMessageService;
