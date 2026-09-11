import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo,
  DataType} from "sequelize-typescript";

import Integration from "./Integration";
import Ticket from "./Ticket";

@Table
class EduzzWebhookEvent extends Model<EduzzWebhookEvent> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Integration)
  @AllowNull(false)
  @Column
  integrationId: number;
  @AllowNull(false)
  @Column
  eventId: string;

  @AllowNull(false)
  @Column
  eventName: string;

  @AllowNull(false)
  @Column
  status: string;

  @Column(DataType.STRING)
  productId: string | null;

  @Column(DataType.STRING)
  buyerPhone: string | null;

  @ForeignKey(() => Ticket)
  @Column(DataType.INTEGER)
  ticketId: number | null;

  @Column(DataType.TEXT)
  error: string | null;

  @BelongsTo(() => Integration)
  integration: Integration;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default EduzzWebhookEvent;
