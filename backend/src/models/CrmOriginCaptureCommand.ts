import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";

@Table({ tableName: "CrmOriginCaptureCommands" })
export default class CrmOriginCaptureCommand extends Model<CrmOriginCaptureCommand> {
  @PrimaryKey @Column(DataType.STRING(36)) captureKey!: string;
  @AllowNull(false) @Column(DataType.STRING(100)) sourceInstanceId!: string;
  @AllowNull(false) @Column(DataType.STRING(100)) integrationId!: string;
  @AllowNull(false) @Column(DataType.STRING(36)) organizationId!: string;
  @AllowNull(false) @Column(DataType.STRING(64)) inputHash!: string;
  @Column(DataType.TEXT) outcome!: string | null;
  @CreatedAt createdAt!: Date;
  @UpdatedAt updatedAt!: Date;
}
