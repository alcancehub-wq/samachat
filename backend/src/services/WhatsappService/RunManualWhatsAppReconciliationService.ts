import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import ExtractWWebJsPersistedTargetLidAliases from "../../providers/WhatsApp/Implementations/wwebjsReconciliationPersistedIdentity";

interface Request {
  whatsappId: number;
  ticketId?: number | null;
}

const RunManualWhatsAppReconciliationService = async ({
  whatsappId,
  ticketId = null
}: Request) => {
  let persistedProviderAliases:
    string[] = [];

  let targetContact:
    | {
        number?: string | null;
        lid?: string | null;
      }
    | null = null;

  if (ticketId !== null) {
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      throw new Error(
        "ERR_RECONCILIATION_TARGET_TICKET_NOT_FOUND"
      );
    }

    if (Number(ticket.whatsappId) !== Number(whatsappId)) {
      throw new Error(
        "ERR_RECONCILIATION_TARGET_TICKET_WHATSAPP_MISMATCH"
      );
    }

    const contact = await Contact.findByPk(ticket.contactId);

    if (!contact) {
      throw new Error(
        "ERR_RECONCILIATION_TARGET_CONTACT_NOT_FOUND"
      );
    }

    targetContact = {
      number: contact.number || null,
      lid: contact.lid || null
    };


    /*
     * Provider identities already persisted in Message.id
     * for this exact ticket are candidate aliases only.
     *
     * They are not persisted back into Contact here.
     * The provider still has to expose a matching targeted
     * chat/contact before reconciliation work is accepted.
     */
    const ticketMessages =
      await Message.findAll({
        where: {
          ticketId
        },
        attributes: [
          "id"
        ],
        raw: true
      });

    persistedProviderAliases =
      ExtractWWebJsPersistedTargetLidAliases(
        ticketMessages.map(
          message =>
            String(
              (message as any)?.id ||
              ""
            )
        )
      );
  }

  /*
   * Keep the WWebJS implementation lazy here.
   * Controllers and unrelated tests must not load Puppeteer
   * merely by importing this service.
   */
  const {
    runManualWWebJsReconciliationForSession
  } = await import(
    "../../providers/WhatsApp/Implementations/wwebjs"
  );

  return runManualWWebJsReconciliationForSession(
    whatsappId,
    {
      ticketId,
      targetContact,
      persistedProviderAliases
    }
  );
};

export default RunManualWhatsAppReconciliationService;