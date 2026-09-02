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
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import Dialog from "./Dialog";
import ContactList from "./ContactList";
import User from "./User";
import Queue from "./Queue";
import Whatsapp from "./Whatsapp";

@Table
class Campaign extends Model<Campaign> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Default("draft")
  @Column
  status: string;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @Column(DataType.DATE)
  scheduledAt: Date;

  @Column(DataType.DATE)
  reviewedAt: Date;

  @Column(DataType.DATE)
  lastStatusAt: Date;

  @ForeignKey(() => Dialog)
  @Column
  dialogId: number;

  @ForeignKey(() => ContactList)
  @Column
  contactListId: number;

  @Column(DataType.TEXT)
  tagIds: string;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  ownerUserId: number | null;

  @ForeignKey(() => Queue)
  @Column(DataType.INTEGER)
  ownerQueueId: number | null;

  @ForeignKey(() => Whatsapp)
  @Column(DataType.INTEGER)
  deliveryWhatsappId: number | null;

  @Default("STANDARD")
  @AllowNull(false)
  @Column(DataType.STRING)
  outboundMode: string;

  @Column(DataType.STRING)
  templateName: string | null;

  @Column(DataType.STRING)
  templateLanguage: string | null;

  @Column(DataType.TEXT)
  templateComponents: string | null;

  @BelongsTo(() => Dialog)
  dialog: Dialog;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @BelongsTo(() => User, "ownerUserId")
  ownerUser: User;

  @BelongsTo(() => Queue, "ownerQueueId")
  ownerQueue: Queue;

  @BelongsTo(() => Whatsapp, "deliveryWhatsappId")
  deliveryWhatsapp: Whatsapp;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Campaign;
