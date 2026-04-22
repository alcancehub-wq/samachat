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
  DataType,
  HasMany
} from "sequelize-typescript";

import Flow from "./Flow";
import FlowNode from "./FlowNode";
import FlowExecutionLog from "./FlowExecutionLog";
import Ticket from "./Ticket";
import Contact from "./Contact";
import Queue from "./Queue";

@Table
class FlowExecution extends Model<FlowExecution> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Flow)
  @Column
  flowId: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @AllowNull(false)
  @Default("pending")
  @Column
  status: string;

  @Column(DataType.DATE)
  startedAt: Date;

  @Column(DataType.DATE)
  finishedAt: Date;

  @ForeignKey(() => FlowNode)
  @Column
  currentNodeId: number;

  @ForeignKey(() => Queue)
  @Column
  handoffQueueId: number;

  @Column(DataType.TEXT)
  input: string;

  @BelongsTo(() => Flow)
  flow: Flow;

  @BelongsTo(() => FlowNode, "currentNodeId")
  currentNode: FlowNode;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @BelongsTo(() => Contact)
  contact: Contact;

  @BelongsTo(() => Queue)
  handoffQueue: Queue;

  @HasMany(() => FlowExecutionLog)
  logs: FlowExecutionLog[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FlowExecution;
