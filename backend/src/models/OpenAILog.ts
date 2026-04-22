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

import Ticket from "./Ticket";
import Contact from "./Contact";
import User from "./User";

@Table
class OpenAILog extends Model<OpenAILog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  action: string;

  @AllowNull(false)
  @Default("success")
  @Column
  status: string;

  @Column
  model: string;

  @Column(DataType.TEXT)
  prompt: string;

  @Column(DataType.TEXT)
  response: string;

  @Column(DataType.TEXT)
  error: string;

  @Column
  durationMs: number;

  @Column
  promptTokens: number;

  @Column
  completionTokens: number;

  @Column
  totalTokens: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @Column(DataType.TEXT)
  metadata: string;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @BelongsTo(() => Contact)
  contact: Contact;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default OpenAILog;
