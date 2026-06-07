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
  HasMany
} from "sequelize-typescript";

import User from "./User";
import FlowNode from "./FlowNode";
import FlowEdge from "./FlowEdge";
import FlowTrigger from "./FlowTrigger";
import FlowExecution from "./FlowExecution";

@Table
class Flow extends Model<Flow> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Default("draft")
  @Column
  status: string;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @ForeignKey(() => User)
  @Column
  createdById: number;

  @HasMany(() => FlowNode)
  nodes: FlowNode[];

  @HasMany(() => FlowEdge)
  edges: FlowEdge[];

  @HasMany(() => FlowTrigger)
  triggers: FlowTrigger[];

  @HasMany(() => FlowExecution)
  executions: FlowExecution[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Flow;
