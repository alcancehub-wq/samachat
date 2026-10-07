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
  Unique,
  DataType
} from "sequelize-typescript";

@Table
class IntegrationSetting extends Model<IntegrationSetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  provider: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isActive: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  config: string | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default IntegrationSetting;
