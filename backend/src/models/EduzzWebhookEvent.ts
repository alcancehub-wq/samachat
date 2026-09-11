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
  BelongsTo} from "sequelize-typescript";

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

  @Column
  productId: string | null;

  @Column
  buyerPhone: string | null;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number | null;

  @Column
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
