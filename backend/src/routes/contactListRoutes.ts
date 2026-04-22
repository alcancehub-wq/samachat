import { Router } from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as ContactListController from "../controllers/ContactListController";

const contactListRoutes = Router();

contactListRoutes.get(
  "/contactLists",
  isAuth,
  checkSectorPermission("contactLists.view"),
  ContactListController.index
);

contactListRoutes.get(
  "/contactLists/:listId",
  isAuth,
  checkSectorPermission("contactLists.view"),
  ContactListController.show
);

contactListRoutes.post(
  "/contactLists",
  isAuth,
  checkSectorPermission("contactLists.create"),
  ContactListController.store
);

contactListRoutes.put(
  "/contactLists/:listId",
  isAuth,
  checkSectorPermission("contactLists.update"),
  ContactListController.update
);

contactListRoutes.delete(
  "/contactLists/:listId",
  isAuth,
  checkSectorPermission("contactLists.delete"),
  ContactListController.remove
);

contactListRoutes.get(
  "/contactLists/:listId/contacts",
  isAuth,
  checkSectorPermission("contactLists.contacts.view"),
  ContactListController.contacts
);

export default contactListRoutes;
