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
  Table,
  UpdatedAt
} from "sequelize-typescript";

import Whatsapp from "./Whatsapp";

@Table
class MetaMessageTemplateVariableMapping extends Model<MetaMessageTemplateVariableMapping> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Whatsapp)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  whatsappId: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  templateName: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  templateLanguage: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  componentType: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  position: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  variableKey: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Whatsapp, "whatsappId")
  whatsapp: Whatsapp;
}

export default MetaMessageTemplateVariableMapping;