import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

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
}

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
    tagIds
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
  newContact.number = newContact.number.replace("-", "").replace(" ", "");

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

  await CheckIsValidContact(newContact.number, { userId });
  const validNumber: any = await CheckContactNumber(newContact.number, {
    userId
  });

  const profilePicUrl = await GetProfilePicUrl(validNumber, { userId });

  let name = newContact.name;
  let number = validNumber;
  let email = newContact.email;
  let extraInfo = newContact.extraInfo;
  let tagIds = newContact.tagIds;

  const contact = await CreateContactService({
    name,
    number,
    email,
    extraInfo,
    profilePicUrl,
    tagIds
  });

  const io = getIO();
  io.emit("contact", {
    action: "create",
    contact
  });

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
  const currentContact = await ShowContactService(contactId);

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
    await CheckIsValidContact(normalizedInputNumber, { userId });
    contactData.number = await CheckContactNumber(normalizedInputNumber, {
      userId
    });
  } else {
    contactData.number = currentContact.number;
  }

  const contact = await UpdateContactService({ contactData, contactId });

  const io = getIO();
  io.emit("contact", {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;

  await DeleteContactService(contactId);

  const io = getIO();
  io.emit("contact", {
    action: "delete",
    contactId
  });

  return res.status(200).json({ message: "Contact deleted" });
};
