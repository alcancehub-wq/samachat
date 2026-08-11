import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import Whatsapp from "./Whatsapp";
import User from "./User";

@Table({ tableName: "WhatsappDistributionUsers" })
class WhatsappDistributionUser extends Model<WhatsappDistributionUser> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Whatsapp)
  @AllowNull(false)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default WhatsappDistributionUser;
