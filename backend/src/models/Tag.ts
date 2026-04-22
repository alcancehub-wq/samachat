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
  BelongsToMany
} from "sequelize-typescript";

import Contact from "./Contact";
import Ticket from "./Ticket";
import ContactTag from "./ContactTag";
import TicketTag from "./TicketTag";

@Table
class Tag extends Model<Tag> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Default("#64748b")
  @Column
  color: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Contact, () => ContactTag)
  contacts: Contact[];

  @BelongsToMany(() => Ticket, () => TicketTag)
  tickets: Ticket[];
}

export default Tag;
