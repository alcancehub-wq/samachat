import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import Campaign from "./Campaign";
import Contact from "./Contact";

@Table
class CampaignLog extends Model<CampaignLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Campaign)
  @Column
  campaignId: number;

  @AllowNull(false)
  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @AllowNull(false)
  @Column
  status: string;

  @Column(DataType.TEXT)
  message: string;

  @Column(DataType.TEXT)
  error: string;

  @Column(DataType.DATE)
  executedAt: Date;

  @BelongsTo(() => Campaign)
  campaign: Campaign;

  @BelongsTo(() => Contact)
  contact: Contact;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CampaignLog;
