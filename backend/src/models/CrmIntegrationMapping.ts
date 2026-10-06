import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AllowNull,
  Default,
  Unique,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import Integration from "./Integration";

@Table({ tableName: "CrmIntegrationMappings" })
class CrmIntegrationMapping extends Model<CrmIntegrationMapping> {
  @PrimaryKey
  @ForeignKey(() => Integration)
  @Column(DataType.INTEGER)
  integrationId: number;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  m2mIntegrationId: string;

  @AllowNull(false)
  @Column(DataType.STRING(36))
  organizationId: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(100))
  sourceInstanceId: string;

  @AllowNull(false)
  @Column(DataType.STRING(2048))
  endpoint: string;

  @AllowNull(false)
  @Column(DataType.STRING(2048))
  approvedEndpoint: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  keyId: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  secretReference: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  m2mEnabled: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  syncEnabled: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  commercialAdmissionEnabled: boolean;

  @Column(DataType.STRING(150))
  commercialPipelineName: string | null;

  @Column(DataType.STRING(150))
  commercialStageName: string | null;

  @Column(DataType.STRING(255))
  commercialOwnerEmail: string | null;

  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  mappingVersion: number;

  @BelongsTo(() => Integration)
  integration: Integration;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CrmIntegrationMapping;
