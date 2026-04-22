import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  Unique,
  BelongsToMany
} from "sequelize-typescript";

import Contact from "./Contact";
import ContactListContact from "./ContactListContact";

@Table
class ContactList extends Model<ContactList> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @Column
  description: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isDynamic: boolean;

  @Column
  filters: string;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Contact, () => ContactListContact)
  contacts: Contact[];
}

export default ContactList;
