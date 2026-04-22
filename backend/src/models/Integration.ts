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
  HasMany
} from "sequelize-typescript";

import Webhook from "./Webhook";

@Table
class Integration extends Model<Integration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Default("custom")
  @Column
  type: string;

  @Column
  description: string;

  @Column
  apiKey: string;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @HasMany(() => Webhook)
  webhooks: Webhook[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Integration;
