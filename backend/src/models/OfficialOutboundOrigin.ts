import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from "sequelize-typescript";
import Contact from "./Contact";
import Queue from "./Queue";
import Ticket from "./Ticket";
import User from "./User";
import Whatsapp from "./Whatsapp";

@Table({ updatedAt: false })
class OfficialOutboundOrigin extends Model<OfficialOutboundOrigin> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  consumerType: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  consumerId: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  ownerUserId: number;

  @ForeignKey(() => Queue)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  ownerQueueId: number;

  @ForeignKey(() => Whatsapp)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  deliveryWhatsappId: number;

  @ForeignKey(() => Contact)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  contactId: number;

  @ForeignKey(() => Ticket)
  @Column(DataType.INTEGER)
  ticketId: number | null;

  @Column(DataType.STRING)
  providerMessageId: string | null;

  @CreatedAt
  createdAt: Date;

  @BelongsTo(() => User, "ownerUserId")
  ownerUser: User;

  @BelongsTo(() => Queue, "ownerQueueId")
  ownerQueue: Queue;

  @BelongsTo(() => Whatsapp, "deliveryWhatsappId")
  deliveryWhatsapp: Whatsapp;
}

export default OfficialOutboundOrigin;