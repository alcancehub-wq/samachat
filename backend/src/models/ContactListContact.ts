import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  ForeignKey,
  PrimaryKey,
  BelongsTo
} from "sequelize-typescript";

import Contact from "./Contact";
import ContactList from "./ContactList";

@Table
class ContactListContact extends Model<ContactListContact> {
  @PrimaryKey
  @ForeignKey(() => ContactList)
  @Column
  contactListId: number;

  @PrimaryKey
  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ContactListContact;
