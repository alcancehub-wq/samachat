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
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import ContactList from "./ContactList";

@Table
class Informative extends Model<Informative> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  title: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  content: string;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @Column(DataType.DATE)
  startsAt: Date;

  @Column(DataType.DATE)
  endsAt: Date;

  @AllowNull(false)
  @Default("all")
  @Column
  audience: string;

  @ForeignKey(() => ContactList)
  @Column
  contactListId: number;

  @Column(DataType.TEXT)
  tagIds: string;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Informative;
