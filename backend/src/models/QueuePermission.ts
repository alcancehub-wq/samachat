import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  AllowNull,
  Default,
  DataType,
  BelongsTo
} from "sequelize-typescript";
import Queue from "./Queue";

@Table
class QueuePermission extends Model<QueuePermission> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Queue)
  @AllowNull(false)
  @Column
  queueId: number;

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSON)
  permissions: string[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Queue)
  queue: Queue;
}

export default QueuePermission;
