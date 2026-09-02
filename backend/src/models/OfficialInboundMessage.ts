import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";
import Whatsapp from "./Whatsapp";

@Table
class OfficialInboundMessage extends Model<OfficialInboundMessage> {
  @PrimaryKey
  @Column(DataType.STRING)
  providerMessageId: string;

  @AllowNull(false)
  @Column(DataType.BIGINT)
  providerTimestamp: number;

  @Column(DataType.STRING)
  contextProviderMessageId: string | null;

  @ForeignKey(() => Whatsapp)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  deliveryWhatsappId: number;

  @ForeignKey(() => Contact)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  contactId: number;

  @ForeignKey(() => Ticket)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  ticketId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Ticket)
  ticket: Ticket;
}

export default OfficialInboundMessage;