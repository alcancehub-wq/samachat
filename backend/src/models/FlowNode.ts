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

import Flow from "./Flow";

@Table
class FlowNode extends Model<FlowNode> {
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

  @Column
  name: string;

  @Column(DataType.TEXT)
  data: string;

  @AllowNull(false)
  @Default(0)
  @Column
  positionX: number;

  @AllowNull(false)
  @Default(0)
  @Column
  positionY: number;

  @BelongsTo(() => Flow)
  flow: Flow;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FlowNode;
