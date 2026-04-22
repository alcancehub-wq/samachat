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
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";

import Flow from "./Flow";

@Table
class FlowTrigger extends Model<FlowTrigger> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Flow)
  @Column
  flowId: number;

  @AllowNull(false)
  @Column
  type: string;

  @Column(DataType.TEXT)
  value: string;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @BelongsTo(() => Flow)
  flow: Flow;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FlowTrigger;
