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
  BelongsTo,
  HasMany
} from "sequelize-typescript";

import User from "./User";
import Ticket from "./Ticket";
import Contact from "./Contact";
import ScheduleLog from "./ScheduleLog";

@Table
class Schedule extends Model<Schedule> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  body: string;

  @AllowNull(false)
  @Default("pending")
  @Column
  status: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  scheduledAt: Date;

  @Column(DataType.DATE)
  sentAt: Date | null;

  @Column(DataType.DATE)
  canceledAt: Date | null;

  @Column(DataType.TEXT)
  lastError: string | null;

  @Column(DataType.TEXT)
  lastResult: string | null;

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

  @HasMany(() => ScheduleLog)
  logs: ScheduleLog[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Schedule;
