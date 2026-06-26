import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  HasMany,
  Unique,
  BelongsToMany
} from "sequelize-typescript";
import Queue from "./Queue";
import Ticket from "./Ticket";
import WhatsappQueue from "./WhatsappQueue";
import User from "./User";

@Table
class Whatsapp extends Model<Whatsapp> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull
  @Unique
  @Column(DataType.TEXT)
  name: string;

  @Column(DataType.TEXT)
  session: string;

  @Column(DataType.TEXT)
  qrcode: string;

  @Column
  status: string;

  @Column
  battery: string;

  @Column
  plugged: boolean;

  @Column
  retries: number;

  @Column(DataType.TEXT)
  greetingMessage: string;

  @Column(DataType.TEXT)
  farewellMessage: string;

  @Column(DataType.TEXT)
  phoneNumber: string;

  @Default("web")
  @AllowNull(false)
  @Column(DataType.STRING)
  providerType: string;

  @AllowNull
  @Column(DataType.TEXT)
  wabaId: string;

  @AllowNull
  @Column(DataType.TEXT)
  phoneNumberId: string;

  @AllowNull
  @Column(DataType.TEXT)
  businessAccountId: string;

  @AllowNull
  @Column(DataType.TEXT)
  accessToken: string;

  @AllowNull
  @Column(DataType.TEXT)
  verifyToken: string;

  @AllowNull
  @Column(DataType.TEXT)
  appSecret: string;

  @Default("v20.0")
  @AllowNull
  @Column(DataType.STRING)
  apiVersion: string;

  @AllowNull
  @Column(DataType.STRING)
  cloudApiStatus: string;

  @AllowNull
  @Column(DataType.TEXT)
  cloudApiLastError: string;

  @Default(false)
  @AllowNull
  @Column
  isDefault: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => User)
  users: User[];

  @BelongsToMany(() => Queue, () => WhatsappQueue)
  queues: Array<Queue & { WhatsappQueue: WhatsappQueue }>;

  @HasMany(() => WhatsappQueue)
  whatsappQueues: WhatsappQueue[];
}

export default Whatsapp;
