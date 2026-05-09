import Contact from "../../models/Contact";

const dedupeContacts = (contacts: Contact[]): Contact[] => {
  const uniqueContacts = new Map<number, Contact>();

  contacts.forEach(contact => {
    if (!contact?.id || uniqueContacts.has(contact.id)) {
      return;
    }

    uniqueContacts.set(contact.id, contact);
  });

  return Array.from(uniqueContacts.values());
};

export const applyCampaignTagScope = (
  contacts: Contact[],
  tagIds: number[]
): Contact[] => {
  if (tagIds.length === 0) {
    return dedupeContacts(contacts);
  }

  return dedupeContacts(
    contacts.filter(contact =>
      contact.tags?.some(tag => tagIds.includes(tag.id))
    )
  );
};