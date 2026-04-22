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

import Schedule from "./Schedule";

@Table
class ScheduleLog extends Model<ScheduleLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Schedule)
  @Column
  scheduleId: number;

  @AllowNull(false)
  @Column
  status: string;

  @Column(DataType.TEXT)
  message: string;

  @Column(DataType.TEXT)
  error: string;

  @Column(DataType.DATE)
  executedAt: Date;

  @BelongsTo(() => Schedule)
  schedule: Schedule;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ScheduleLog;
