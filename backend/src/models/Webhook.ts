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
  BelongsTo,
  HasMany
} from "sequelize-typescript";

import Integration from "./Integration";
import WebhookLog from "./WebhookLog";

@Table
class Webhook extends Model<Webhook> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Column
  url: string;

  @AllowNull(false)
  @Default("POST")
  @Column
  method: string;

  @Column(DataType.TEXT)
  events: string;

  @Column
  secret: string;

  @Column(DataType.TEXT)
  headers: string;

  @ForeignKey(() => Integration)
  @Column
  integrationId: number;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @Column(DataType.DATE)
  lastTestAt: Date;

  @BelongsTo(() => Integration)
  integration: Integration;

  @HasMany(() => WebhookLog)
  logs: WebhookLog[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Webhook;
