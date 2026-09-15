import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  Default,
  DataType,
  HasMany,
  BelongsToMany
} from "sequelize-typescript";
import ContactCustomField from "./ContactCustomField";
import Ticket from "./Ticket";
import Tag from "./Tag";
import ContactTag from "./ContactTag";

@Table
class Contact extends Model<Contact> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Unique
  @Column
  number: string;

  @Unique
  @Column
  lid: string;

  @AllowNull(false)
  @Default("")
  @Column
  email: string;

  @Column
  profilePicUrl: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @Default(false)
  @Column
  allowMultipleConversations: boolean;

  @Column
  city: string;

  @Column
  state: string;

  @Column
  captureChannel: string;

  @Column
  wasReferred: boolean;

  @Column
  referralType: string;

  @Column
  referralContactId: number;

  @Column
  referralUserId: number;

  @Column
  referralPartnerName: string;

  @Column(DataType.TEXT)
  referralNote: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => ContactCustomField)
  extraInfo: ContactCustomField[];

  @BelongsToMany(() => Tag, () => ContactTag)
  tags: Tag[];
}

export default Contact;
