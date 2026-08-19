import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  AllowNull,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt
} from "sequelize-typescript";

import Whatsapp from "./Whatsapp";

@Table({
  tableName: "WhatsappReconciliationCheckpoints"
})
class WhatsappReconciliationCheckpoint extends Model<WhatsappReconciliationCheckpoint> {
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

  @AllowNull(false)
  @Column(DataType.DATE(6))
  checkpointAt: Date;

  @CreatedAt
  @AllowNull(false)
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @AllowNull(false)
  @Column(DataType.DATE(6))
  updatedAt: Date;
}

export default WhatsappReconciliationCheckpoint;