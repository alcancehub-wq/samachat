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
  DataType
} from "sequelize-typescript";

@Table
class OpenAISetting extends Model<OpenAISetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  apiKey: string | null;

  @AllowNull(false)
  @Default(false)
  @Column
  isActive: boolean;

  @AllowNull(false)
  @Default("gpt-4o-mini")
  @Column
  model: string;

  @AllowNull(false)
  @Default(0.7)
  @Column
  temperature: number;

  @AllowNull(false)
  @Default(1)
  @Column
  topP: number;

  @AllowNull(false)
  @Default(400)
  @Column
  maxTokens: number;

  @AllowNull(false)
  @Default(0)
  @Column
  presencePenalty: number;

  @AllowNull(false)
  @Default(0)
  @Column
  frequencyPenalty: number;

  @Column(DataType.TEXT)
  systemPrompt: string | null;

  @Column(DataType.TEXT)
  suggestionPrompt: string | null;

  @Column(DataType.TEXT)
  rewritePrompt: string | null;

  @Column(DataType.TEXT)
  summaryPrompt: string | null;

  @Column(DataType.TEXT)
  classificationPrompt: string | null;

  @AllowNull(false)
  @Default(false)
  @Column
  autoReplyEnabled: boolean;

  @Column(DataType.TEXT)
  autoReplyPrompt: string | null;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  maxRequestsPerDay: number | null;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  maxRequestsPerHour: number | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default OpenAISetting;
