export const CONTACT_REFERRAL_TYPES = [
  "cliente",
  "parceiro",
  "usuario",
  "outro"
];

const hasText = value =>
  typeof value === "string" && value.trim().length > 0;

const hasPositiveId = value =>
  Number.isInteger(Number(value)) && Number(value) > 0;

export const isContactRegistrationComplete = contact => {
  if (!hasText(contact?.name)) return false;
  if (!hasText(contact?.number)) return false;
  if (!hasText(contact?.captureChannel)) return false;
  if (typeof contact?.wasReferred !== "boolean") return false;

  if (contact.wasReferred !== true) {
    return true;
  }

  const referralType = String(contact?.referralType || "")
    .trim()
    .toLowerCase();

  if (!CONTACT_REFERRAL_TYPES.includes(referralType)) {
    return false;
  }

  if (referralType === "cliente") {
    return hasPositiveId(contact?.referralContactId);
  }

  if (referralType === "usuario") {
    return hasPositiveId(contact?.referralUserId);
  }

  if (referralType === "parceiro") {
    return hasText(contact?.referralPartnerName);
  }

  return true;
};

export default isContactRegistrationComplete;