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
  BelongsTo
} from "sequelize-typescript";

import Ticket from "./Ticket";
import KanbanColumn from "./KanbanColumn";

@Table
class KanbanCard extends Model<KanbanCard> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @AllowNull(false)
  @ForeignKey(() => KanbanColumn)
  @Column
  columnId: number;

  @AllowNull(false)
  @Default(0)
  @Column
  position: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @BelongsTo(() => KanbanColumn)
  column: KanbanColumn;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KanbanCard;
