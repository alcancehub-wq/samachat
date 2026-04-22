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
  DataType
} from "sequelize-typescript";

import FlowExecution from "./FlowExecution";
import FlowNode from "./FlowNode";

@Table
class FlowExecutionLog extends Model<FlowExecutionLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => FlowExecution)
  @Column
  flowExecutionId: number;

  @ForeignKey(() => FlowNode)
  @Column
  nodeId: number;

  @AllowNull(false)
  @Column
  event: string;

  @Column(DataType.TEXT)
  message: string;

  @Column(DataType.TEXT)
  data: string;

  @BelongsTo(() => FlowExecution)
  execution: FlowExecution;

  @BelongsTo(() => FlowNode)
  node: FlowNode;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FlowExecutionLog;
