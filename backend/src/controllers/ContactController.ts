import * as Yup from "yup";
import { Request, Response } from "express";

import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import DeleteContactService from "../services/ContactServices/DeleteContactService";

import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import AppError from "../errors/AppError";
import GetContactService from "../services/ContactServices/GetContactService";
import EmitContactEvent from "../helpers/EmitContactEvent";
import GetUserScopedWhatsappId from "../helpers/GetUserScopedWhatsappId";
import FindDuplicatedContactByNumberService from "../services/ContactServices/FindDuplicatedContactByNumberService";
import MergeContactService from "../services/ContactServices/MergeContactService";
import ListDuplicatedContactsByNumberService from "../services/ContactServices/ListDuplicatedContactsByNumberService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  tagIds: string;
};

type IndexGetContactQuery = {
  name: string;
  number: string;
};

interface ExtraInfo {
  name: string;
  value: string;
}
interface ContactData {
  name: string;
  number: string;
  email?: string;
  extraInfo?: ExtraInfo[];
  tagIds?: number[];
  allowMultipleConversations?: boolean;
}

const CONTACT_WHATSAPP_LOOKUP_TIMEOUT_MS = 12000;

const withContactLookupTimeout = async <T>(
  promise: Promise<T>,
  errorMessage = "ERR_WAPP_CHECK_CONTACT_TIMEOUT"
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new AppError(errorMessage));
        }, CONTACT_WHATSAPP_LOOKUP_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const isManualContactLookupUnavailableError = (err: unknown): boolean => {
  if (!(err instanceof AppError)) {
    return false;
  }

  return [
    "ERR_WAPP_CHECK_CONTACT_TIMEOUT",
    "ERR_WAPP_PROFILE_PIC_TIMEOUT",
    "ERR_WAPP_CHECK_CONTACT",
    "ERR_WAPP_NOT_INITIALIZED"
  ].includes(err.message);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, tagIds: tagIdsStringified } =
    req.query as IndexQuery;

  let tagIds: number[] = [];

  if (tagIdsStringified) {
    tagIds = JSON.parse(tagIdsStringified);
  }

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber,
    tagIds,
    userId: req.user.id,
    profile: req.user.profile
  });

  return res.json({ contacts, count, hasMore });
};

export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, number } = req.body as IndexGetContactQuery;

  const contact = await GetContactService({
    name,
    number
  });

  return res.status(200).json(contact);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newContact: ContactData = req.body;
  const userId = Number(req.user?.id);
  const isAdmin = String(req.user?.profile || "").toLowerCase() === "admin";
  newContact.number = newContact.number.replace(/\D/g, "");

  if (!isAdmin) {
    delete newContact.allowMultipleConversations;
  } else if (typeof newContact.allowMultipleConversations === "boolean") {
    newContact.allowMultipleConversations = Boolean(newContact.allowMultipleConversations);
  }

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });

  try {
    await schema.validate(newContact);
  } catch (err) {
    throw new AppError(err.message);
  }

  const existingDuplicatedContact = await FindDuplicatedContactByNumberService({
    number: newContact.number
  });

  if (existingDuplicatedContact) {
    throw new AppError("ERR_DUPLICATED_CONTACT");
  }

  let validNumber: any = newContact.number;

  try {
    await withContactLookupTimeout(
      CheckIsValidContact(newContact.number, { userId })
    );

    validNumber = await withContactLookupTimeout(
      CheckContactNumber(newContact.number, {
        userId
      })
    );
  } catch (err) {
    if (!isManualContactLookupUnavailableError(err)) {
      throw err;
    }
  }

  const duplicatedContact = await FindDuplicatedContactByNumberService({
    number: validNumber
  });

  if (duplicatedContact) {
    throw new AppError("ERR_DUPLICATED_CONTACT");
  }

  let profilePicUrl = "";

  try {
    profilePicUrl = await withContactLookupTimeout(
      GetProfilePicUrl(validNumber, { userId }),
      "ERR_WAPP_PROFILE_PIC_TIMEOUT"
    );
  } catch (err) {
    if (!isManualContactLookupUnavailableError(err)) {
      throw err;
    }
  }

  let name = newContact.name;
  let number = validNumber;
  let email = newContact.email;
  let extraInfo = newContact.extraInfo;
  let tagIds = newContact.tagIds;
  let allowMultipleConversations = newContact.allowMultipleConversations;

  const contact = await CreateContactService({
    name,
    number,
    email,
    extraInfo,
    profilePicUrl,
    tagIds,
    allowMultipleConversations
  });

  const scopedWhatsappId = await GetUserScopedWhatsappId(
    req.user.id,
    req.user.profile
  );
  EmitContactEvent({ action: "create", contact, whatsappId: scopedWhatsappId });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;

  const contact = await ShowContactService(contactId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const contactData: ContactData = req.body;
  const { contactId } = req.params;
  const userId = Number(req.user?.id);
  const isAdmin = String(req.user?.profile || "").toLowerCase() === "admin";
  const currentContact = await ShowContactService(contactId);

  if (!isAdmin) {
    delete contactData.allowMultipleConversations;
  } else if (typeof contactData.allowMultipleConversations === "boolean") {
    contactData.allowMultipleConversations = Boolean(
      contactData.allowMultipleConversations
    );
  }

  const normalizedInputNumber =
    typeof contactData.number === "string"
      ? contactData.number.replace(/\D/g, "")
      : undefined;
  const normalizedCurrentNumber =
    typeof currentContact.number === "string"
      ? currentContact.number.replace(/\D/g, "")
      : "";

  if (typeof normalizedInputNumber === "string") {
    contactData.number = normalizedInputNumber;
  }

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string().matches(
      /^\d+$/,
      "Invalid number format. Only numbers is allowed."
    )
  });

  try {
    await schema.validate(contactData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const numberChanged =
    typeof normalizedInputNumber === "string" &&
    normalizedInputNumber.length > 0 &&
    normalizedInputNumber !== normalizedCurrentNumber;

  if (numberChanged) {
    const existingDuplicatedContact = await FindDuplicatedContactByNumberService({
      number: normalizedInputNumber,
      ignoreContactId: contactId
    });

    if (existingDuplicatedContact) {
      throw new AppError("ERR_DUPLICATED_CONTACT");
    }

    await CheckIsValidContact(normalizedInputNumber, { userId });
    contactData.number = await CheckContactNumber(normalizedInputNumber, {
      userId
    });

    const duplicatedContact = await FindDuplicatedContactByNumberService({
      number: contactData.number,
      ignoreContactId: contactId
    });

    if (duplicatedContact) {
      throw new AppError("ERR_DUPLICATED_CONTACT");
    }
  } else {
    contactData.number = currentContact.number;
  }

  const contact = await UpdateContactService({ contactData, contactId });

  const scopedWhatsappId = await GetUserScopedWhatsappId(
    req.user.id,
    req.user.profile
  );
  EmitContactEvent({ action: "update", contact, whatsappId: scopedWhatsappId });

  return res.status(200).json(contact);
};

export const duplicates = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;

  const contacts = await ListDuplicatedContactsByNumberService({
    contactId
  });

  return res.status(200).json({ contacts });
};

export const merge = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;
  const { sourceContactId, targetUserId } = req.body;

  const result = await MergeContactService({
    targetContactId: contactId,
    sourceContactId,
    targetUserId
  });

  const scopedWhatsappId = await GetUserScopedWhatsappId(
    req.user.id,
    req.user.profile
  );

  EmitContactEvent({
    action: "update",
    contact: result.contact,
    whatsappId: scopedWhatsappId
  });

  EmitContactEvent({
    action: "delete",
    contactId: String(result.mergedContactId),
    whatsappId: scopedWhatsappId
  });

  return res.status(200).json(result);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;

  await DeleteContactService(contactId);

  const scopedWhatsappId = await GetUserScopedWhatsappId(
    req.user.id,
    req.user.profile
  );
  EmitContactEvent({
    action: "delete",
    contactId,
    whatsappId: scopedWhatsappId
  });

  return res.status(200).json({ message: "Contact deleted" });
};
