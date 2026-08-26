import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";

interface Request {
  whatsappId: number;
  ticketId?: number | null;
}

const RunManualWhatsAppReconciliationService = async ({
  whatsappId,
  ticketId = null
}: Request) => {
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
      targetContact
    }
  );
};

export default RunManualWhatsAppReconciliationService;