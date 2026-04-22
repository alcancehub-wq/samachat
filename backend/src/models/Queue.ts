import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  Default,
  DataType,
  BelongsToMany,
  HasOne
} from "sequelize-typescript";
import User from "./User";
import UserQueue from "./UserQueue";

import Whatsapp from "./Whatsapp";
import WhatsappQueue from "./WhatsappQueue";
import QueuePermission from "./QueuePermission";

@Table
class Queue extends Model<Queue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Unique
  @Column
  color: string;

  @Column
  greetingMessage: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @AllowNull(false)
  @Default(0)
  @Column
  sortOrder: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Whatsapp, () => WhatsappQueue)
  whatsapps: Array<Whatsapp & { WhatsappQueue: WhatsappQueue }>;

  @BelongsToMany(() => User, () => UserQueue)
  users: Array<User & { UserQueue: UserQueue }>;

  @HasOne(() => QueuePermission)
  permission: QueuePermission;
}

export default Queue;
