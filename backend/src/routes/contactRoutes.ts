import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as ContactController from "../controllers/ContactController";
import * as ImportPhoneContactsController from "../controllers/ImportPhoneContactsController";

const contactRoutes = express.Router();

contactRoutes.post(
  "/contacts/import",
  isAuth,
  checkSectorPermission("contacts.import"),
  ImportPhoneContactsController.store
);

contactRoutes.get(
  "/contacts",
  isAuth,
  checkSectorPermission("contacts.view"),
  ContactController.index
);

contactRoutes.get(
  "/contacts/:contactId",
  isAuth,
  checkSectorPermission("contacts.view"),
  ContactController.show
);

contactRoutes.post(
  "/contacts",
  isAuth,
  checkSectorPermission("contacts.create"),
  ContactController.store
);

contactRoutes.post(
  "/contact",
  isAuth,
  checkSectorPermission("contacts.view"),
  ContactController.getContact
);

contactRoutes.put(
  "/contacts/:contactId",
  isAuth,
  checkSectorPermission("contacts.update"),
  ContactController.update
);

contactRoutes.delete(
  "/contacts/:contactId",
  isAuth,
  checkSectorPermission("contacts.delete"),
  ContactController.remove
);

export default contactRoutes;
