import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import Whatsapp from "./Whatsapp";
import User from "./User";

@Table({ tableName: "WhatsappSharingSettings" })
class WhatsappSharingSetting extends Model<WhatsappSharingSetting> {
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

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  isShared: boolean;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  distributionEnabled: boolean;

  @AllowNull
  @Column(DataType.STRING(32))
  distributionMode: string;

  @ForeignKey(() => User)
  @AllowNull
  @Column
  lastAssignedUserId: number;

  @BelongsTo(() => User, "lastAssignedUserId")
  lastAssignedUser: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default WhatsappSharingSetting;
