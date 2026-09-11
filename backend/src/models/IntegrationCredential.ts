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
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import Integration from "./Integration";

@Table
class IntegrationCredential extends Model<IntegrationCredential> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => Integration)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  integrationId: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Default("HMAC_SECRET")
  @Column(DataType.STRING)
  type: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  secret: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDefault: boolean;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @BelongsTo(() => Integration)
  integration: Integration;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default IntegrationCredential;