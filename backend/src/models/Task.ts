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

import User from "./User";
import Ticket from "./Ticket";
import Contact from "./Contact";

@Table
class Task extends Model<Task> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  title: string;

  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Default("open")
  @Column
  status: string;

  @AllowNull(false)
  @Default("medium")
  @Column
  priority: string;

  @Column(DataType.DATE)
  dueAt: Date;

  @ForeignKey(() => User)
  @Column
  assigneeId: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @ForeignKey(() => User)
  @Column
  createdById: number;

  @BelongsTo(() => User, "assigneeId")
  assignee: User;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @BelongsTo(() => Contact)
  contact: Contact;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Task;
