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
import FlowNode from "./FlowNode";

@Table
class FlowEdge extends Model<FlowEdge> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Flow)
  @Column
  flowId: number;

  @AllowNull(false)
  @ForeignKey(() => FlowNode)
  @Column
  sourceNodeId: number;

  @AllowNull(false)
  @ForeignKey(() => FlowNode)
  @Column
  targetNodeId: number;

  @Column
  conditionType: string;

  @Column(DataType.TEXT)
  conditionValue: string;

  @AllowNull(false)
  @Default(0)
  @Column
  priority: number;

  @BelongsTo(() => Flow)
  flow: Flow;

  @BelongsTo(() => FlowNode, "sourceNodeId")
  sourceNode: FlowNode;

  @BelongsTo(() => FlowNode, "targetNodeId")
  targetNode: FlowNode;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FlowEdge;
