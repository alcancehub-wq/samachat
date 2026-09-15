export const CONTACT_REFERRAL_TYPES = [
  "cliente",
  "parceiro",
  "usuario",
  "outro"
] as const;

export type ContactReferralType =
  typeof CONTACT_REFERRAL_TYPES[number];

export interface ContactRegistrationData {
  name?: string | null;
  number?: string | null;
  captureChannel?: string | null;
  wasReferred?: boolean | null;
  referralType?: string | null;
  referralContactId?: number | null;
  referralUserId?: number | null;
  referralPartnerName?: string | null;
}

export type ContactRegistrationMissingField =
  | "name"
  | "number"
  | "captureChannel"
  | "wasReferred"
  | "referralType"
  | "referralContactId"
  | "referralUserId"
  | "referralPartnerName";

export interface ContactRegistrationCompleteness {
  complete: boolean;
  missingFields: ContactRegistrationMissingField[];
}

const hasText = (value?: string | null): boolean =>
  typeof value === "string" && value.trim().length > 0;

const hasPositiveId = (value?: number | null): boolean =>
  Number.isInteger(Number(value)) && Number(value) > 0;

const isReferralType = (
  value?: string | null
): value is ContactReferralType =>
  CONTACT_REFERRAL_TYPES.includes(
    String(value || "").trim().toLowerCase() as ContactReferralType
  );

const EvaluateContactRegistrationCompletenessService = (
  contact: ContactRegistrationData
): ContactRegistrationCompleteness => {
  const missingFields: ContactRegistrationMissingField[] = [];

  if (!hasText(contact.name)) {
    missingFields.push("name");
  }

  if (!hasText(contact.number)) {
    missingFields.push("number");
  }

  if (!hasText(contact.captureChannel)) {
    missingFields.push("captureChannel");
  }

  if (typeof contact.wasReferred !== "boolean") {
    missingFields.push("wasReferred");
  }

  if (contact.wasReferred === true) {
    const referralType = String(contact.referralType || "")
      .trim()
      .toLowerCase();

    if (!isReferralType(referralType)) {
      missingFields.push("referralType");
    } else if (
      referralType === "cliente" &&
      !hasPositiveId(contact.referralContactId)
    ) {
      missingFields.push("referralContactId");
    } else if (
      referralType === "usuario" &&
      !hasPositiveId(contact.referralUserId)
    ) {
      missingFields.push("referralUserId");
    } else if (
      referralType === "parceiro" &&
      !hasText(contact.referralPartnerName)
    ) {
      missingFields.push("referralPartnerName");
    }
  }

  return {
    complete: missingFields.length === 0,
    missingFields
  };
};

export default EvaluateContactRegistrationCompletenessService;