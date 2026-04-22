import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import Webhook from "./Webhook";

@Table
class WebhookLog extends Model<WebhookLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Webhook)
  @Column
  webhookId: number;

  @AllowNull(false)
  @Column
  event: string;

  @Column
  statusCode: number;

  @Column
  durationMs: number;

  @Column(DataType.TEXT)
  requestBody: string;

  @Column(DataType.TEXT)
  responseBody: string;

  @Column(DataType.TEXT)
  error: string;

  @BelongsTo(() => Webhook)
  webhook: Webhook;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default WebhookLog;
