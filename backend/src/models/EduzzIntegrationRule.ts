import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";

import Integration from "./Integration";
import Whatsapp from "./Whatsapp";
import User from "./User";

@Table
class EduzzIntegrationRule extends Model<EduzzIntegrationRule> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Integration)
  @AllowNull(false)
  @Column
  integrationId: number;

  @AllowNull(false)
  @Default("myeduzz.invoice_paid")
  @Column
  eventName: string;

  @Column(DataType.STRING)
  productId: string | null;
@ForeignKey(() => Whatsapp)
  @AllowNull(false)
  @Column
  whatsappId: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: number;

  @AllowNull(false)
  @Column
  messageBody: string;

  @Default("text")
  @AllowNull(false)
  @Column(DataType.STRING)
  messageMode: string;

  @AllowNull
  @Column(DataType.STRING)
  metaTemplateName: string;

  @AllowNull
  @Column(DataType.STRING)
  metaTemplateLanguage: string;

  @AllowNull
  @Column(DataType.JSON)
  metaTemplateComponents: Array<Record<string, unknown>>;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @BelongsTo(() => Integration)
  integration: Integration;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default EduzzIntegrationRule;
