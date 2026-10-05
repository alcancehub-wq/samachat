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

@Table({ tableName: "CrmOriginJournals" })
export default class CrmOriginJournal extends Model<CrmOriginJournal> {
  @PrimaryKey @Column(DataType.STRING(36)) eventId!: string;
  @AllowNull(false) @Column(DataType.STRING(36)) correlationId!: string;
  @AllowNull(false) @Column(DataType.STRING(100)) sourceInstanceId!: string;
  @AllowNull(false) @Column(DataType.STRING(100)) integrationId!: string;
  @AllowNull(false) @Column(DataType.STRING(36)) organizationId!: string;
  @AllowNull(false) @Column(DataType.STRING(20)) sourceContactId!: string;
  @AllowNull(false) @Column(DataType.BIGINT) sourceRevision!: number;
  @AllowNull(false) @Column(DataType.STRING(40)) operation!: string;
  @AllowNull(false) @Column(DataType.INTEGER) schemaVersion!: number;
  @AllowNull(false) @Column(DataType.TEXT) canonicalBody!: string;
  @AllowNull(false) @Column(DataType.STRING(64)) bodyHash!: string;
  @AllowNull(false) @Column(DataType.STRING(64)) semanticHash!: string;
  @AllowNull(false) @Column(DataType.STRING(30)) provenance!: string;
  @AllowNull(false) @Column(DataType.STRING(30)) provider!: string;
  @AllowNull(false) @Column(DataType.STRING(24)) occurredAt!: string;
  @AllowNull(false) @Column(DataType.STRING(40)) state!: string;
  @AllowNull(false) @Column(DataType.INTEGER) stateVersion!: number;
  @AllowNull(false) @Column(DataType.INTEGER) attemptCount!: number;
  @Column(DataType.STRING(36)) attemptId!: string | null;
  @Column(DataType.STRING(24)) leaseExpiresAt!: string | null;
  @Column(DataType.STRING(24)) transportAcceptedAt!: string | null;
  @Column(DataType.STRING(24)) receiptValidatedAt!: string | null;
  @Column(DataType.STRING(24)) contactConfirmedAt!: string | null;
  @Column(DataType.TEXT) receipt!: string | null;
  @Column(DataType.STRING(100)) lastErrorCode!: string | null;
  @AllowNull(false) @Column(DataType.STRING(30)) commercialOperation!: string;
  @CreatedAt createdAt!: Date;
  @UpdatedAt updatedAt!: Date;
}
