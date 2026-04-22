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

  @BelongsTo(() => Dialog)
  dialog: Dialog;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Campaign;
