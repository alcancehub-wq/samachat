import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  DataType
} from "sequelize-typescript";

// Linha unica (id=1) com a configuracao do agente SDR.
@Table
class SdrAgentSetting extends Model<SdrAgentSetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default(false)
  @Column
  isEnabled: boolean;

  @Default(false)
  @Column
  autoEnableForNewTickets: boolean;

  @Default(false)
  @Column
  testMode: boolean;

  @Column(DataType.TEXT)
  allowedNumbers: string | null;

  @Default("Bia")
  @Column
  agentName: string;

  @Default("")
  @Column
  companyName: string;

  @Column(DataType.TEXT)
  systemPrompt: string | null;

  @Column(DataType.STRING)
  model: string | null;

  @Column(DataType.STRING)
  aiEngine: string | null;

  @Column(DataType.FLOAT)
  temperature: number | null;

  @Default(30)
  @Column
  maxHistoryMessages: number;

  @Default(5)
  @Column
  maxToolRounds: number;

  @Default(5)
  @Column
  replyDelaySeconds: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SdrAgentSetting;
