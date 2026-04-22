import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";

@Table
class Message extends Model<Message> {
  @PrimaryKey
  @Column
  id: string;

  @Default(0)
  @Column
  ack: number;

  @Default(false)
  @Column
  read: boolean;

  @Default(false)
  @Column
  fromMe: boolean;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.STRING)
  get mediaUrl(): string | null {
    if (this.getDataValue("mediaUrl")) {
      const backendUrl = process.env.BACKEND_URL || "";
      const proxyPort = process.env.PROXY_PORT || "";
      let baseUrl = backendUrl.replace(/\/$/, "");

      try {
        const parsedUrl = new URL(backendUrl);
        if (!parsedUrl.port && proxyPort) {
          parsedUrl.port = proxyPort;
        }
        baseUrl = parsedUrl.toString().replace(/\/$/, "");
      } catch {
        if (proxyPort && baseUrl && !/:[0-9]+$/.test(baseUrl)) {
          baseUrl = `${baseUrl}:${proxyPort}`;
        }
      }

      baseUrl = baseUrl.replace(/:(\d+):\1\b/, ":$1");

      return `${baseUrl}/public/${this.getDataValue("mediaUrl")}`;
    }
    return null;
  }

  @Column
  mediaType: string;

  @Default(false)
  @Column
  isDeleted: boolean;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @ForeignKey(() => Message)
  @Column
  quotedMsgId: string;

  @BelongsTo(() => Message, "quotedMsgId")
  quotedMsg: Message;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact, "contactId")
  contact: Contact;
}

export default Message;
