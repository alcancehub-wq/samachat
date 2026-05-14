import Contact from "../models/Contact";
import { getIO } from "../libs/socket";
import { getScopedContactRoom } from "./socketRooms";

interface ContactEventPayload {
  action: "create" | "update" | "delete";
  contact?: Contact;
  contactId?: number | string;
  whatsappId?: number | null;
}

const EmitContactEvent = ({
  action,
  contact,
  contactId,
  whatsappId,
}: ContactEventPayload): void => {
  const io = getIO();
  const payload = {
    action,
    contact,
    contactId,
  };

  io.to(getScopedContactRoom()).emit("contact", payload);

  if (whatsappId) {
    io.to(getScopedContactRoom(whatsappId)).emit("contact", payload);
  }
};

export default EmitContactEvent;