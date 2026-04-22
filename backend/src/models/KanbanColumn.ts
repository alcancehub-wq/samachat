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

import KanbanCard from "./KanbanCard";

@Table
class KanbanColumn extends Model<KanbanColumn> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Unique
  @Column
  key: string;

  @AllowNull(false)
  @Default(0)
  @Column
  position: number;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @HasMany(() => KanbanCard)
  cards: KanbanCard[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KanbanColumn;
