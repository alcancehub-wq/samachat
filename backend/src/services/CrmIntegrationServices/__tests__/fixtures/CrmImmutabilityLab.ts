import "reflect-metadata";
import { randomUUID } from "crypto";
import { QueryTypes } from "sequelize";
import {
  AutoIncrement,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Sequelize,
  Table
} from "sequelize-typescript";
import CrmOriginJournal from "../../../../models/CrmOriginJournal";
import CrmOriginCaptureCommand from "../../../../models/CrmOriginCaptureCommand";
import { OriginJournalHash } from "../../CrmOriginJournalService";

@Table({ tableName: "Contacts" })
export class HardeningContact extends Model<HardeningContact> {
  @PrimaryKey @AutoIncrement @Column id!: number;
  @Column name!: string;
  @Column({ unique: true, type: DataType.STRING }) number!: string | null;
  @Column({ unique: true, type: DataType.STRING }) lid!: string | null;
  @Column({ defaultValue: false }) isGroup!: boolean;
  @Column({ defaultValue: false }) allowMultipleConversations!: boolean;
  @Column email!: string;
  @Column profilePicUrl!: string;
  @Column city!: string;
  @Column state!: string;
  @Column captureChannel!: string;
  @Column wasReferred!: boolean;
  @Column referralType!: string;
  @Column referralContactId!: number;
  @Column referralContactName!: string;
  @Column referralUserId!: number;
  @Column referralPartnerName!: string;
  @Column referralNote!: string;
  @HasMany(() => HardeningInfo) extraInfo!: HardeningInfo[];
  @BelongsToMany(() => HardeningTag, () => HardeningContactTag)
  tags!: HardeningTag[];
}
@Table({ tableName: "ContactCustomFields" })
export class HardeningInfo extends Model<HardeningInfo> {
  @PrimaryKey @AutoIncrement @Column id!: number;
  @Column name!: string;
  @Column value!: string;
  @ForeignKey(() => HardeningContact) @Column contactId!: number;
}
@Table({ tableName: "Tags" })
class HardeningTag extends Model<HardeningTag> {
  @PrimaryKey @Column id!: number;
  @Column name!: string;
}
@Table({ tableName: "ContactTags", timestamps: false })
class HardeningContactTag extends Model<HardeningContactTag> {
  @ForeignKey(() => HardeningContact) @Column contactId!: number;
  @ForeignKey(() => HardeningTag) @Column tagId!: number;
}
export const hardeningIdentity = {
  integrationId: "synthetic-integration",
  organizationId: "00000000-0000-4000-8000-000000000001",
  sourceInstanceId: "synthetic-instance"
};
const directory =
  "D:/Samacon/worktrees/samachat-crm-p02-r15h01-immutability-20261003/backend/node_modules/.cache/r15h01-immutability-lab/data/";
const databaseName = "r15h01_immutability_lab";
const metadata =
  "SELECT @@datadir AS directory,VERSION() AS version,@@port AS port,@@bind_address AS host,DATABASE() AS databaseName";
function physical(
  row: Record<string, unknown>,
  expectedDatabase: string | null
): void {
  if (
    String(row.directory).replace(/\\/g, "/").toLowerCase() !==
      directory.toLowerCase() ||
    !String(row.version).startsWith("10.11.10-MariaDB") ||
    Number(row.port) !== 55448 ||
    row.host !== "127.0.0.1" ||
    row.databaseName !== expectedDatabase
  )
    throw new Error("REFUSING_NON_H01_IMMUTABILITY_LAB");
}
interface IndependentConnection {
  query(
    sql: string,
    values?: unknown[]
  ): Promise<[Record<string, unknown>[], unknown]>;
  end(): Promise<void>;
}
export interface ImmutabilityLab {
  readonly database: Sequelize;
  guard(): Promise<void>;
  restore(): Promise<void>;
  seed(): Promise<{ eventId: string; captureKey: string }>;
  exec(sql: string, replacements?: Record<string, unknown>): Promise<unknown>;
  bytes(
    table: "CrmOriginJournals" | "CrmOriginCaptureCommands",
    key: string
  ): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}
export async function InitializeCrmImmutabilityLab(): Promise<ImmutabilityLab> {
  if (process.env.CRM_IMMUTABILITY_H01_LAB_ENABLED !== "1")
    throw new Error("H01_LAB_OPT_IN_REQUIRED");
  const mysql = require("mysql2/promise");
  const config = { host: "127.0.0.1", port: 55448, user: "root", password: "" };
  const admin: IndependentConnection = await mysql.createConnection(config);
  try {
    const [rows] = await admin.query(metadata);
    physical(rows[0], null);
    await admin.query(
      "CREATE DATABASE IF NOT EXISTS r15h01_immutability_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"
    );
  } finally {
    await admin.end();
  }
  const database = new Sequelize({
    database: databaseName,
    username: "root",
    password: "",
    host: config.host,
    port: config.port,
    dialect: "mysql",
    dialectModule: require("mysql2"),
    logging: false,
    models: [
      HardeningContact,
      HardeningInfo,
      HardeningTag,
      HardeningContactTag,
      CrmOriginJournal,
      CrmOriginCaptureCommand
    ]
  });
  const independent: IndependentConnection = await mysql.createConnection({
    ...config,
    database: databaseName
  });
  const guard = async () => {
    const [rows] = await independent.query(metadata);
    physical(rows[0], databaseName);
    const orm = await database.query<Record<string, unknown>>(metadata, {
      type: QueryTypes.SELECT
    });
    physical(orm[0], databaseName);
  };
  const exec = async (
    sql: string,
    replacements: Record<string, unknown> = {}
  ) => {
    await guard();
    return database.query(sql, { replacements });
  };
  const restore = async () => {
    await guard();
    for (const table of [
      "CrmOriginJournals",
      "CrmOriginCaptureCommands",
      "ContactTags",
      "ContactCustomFields",
      "Contacts",
      "Tags",
      "Tickets"
    ])
      await exec(`DROP TABLE IF EXISTS ${table}`);
    for (const model of [
      HardeningContact,
      HardeningInfo,
      HardeningTag,
      HardeningContactTag
    ]) {
      await guard();
      await model.sync();
    }
    await guard();
    await HardeningTag.create({ id: 1, name: "Synthetic Tag" });
    await exec(
      "CREATE TABLE Tickets(id INT PRIMARY KEY,status VARCHAR(30),userId INT,queueId INT,whatsappId INT,unreadMessages INT) ENGINE=InnoDB"
    );
    await guard();
    await require("../../../../database/migrations/20261002173000-create-crm-origin-journal").up(
      database.getQueryInterface()
    );
  };
  const seed = async () => {
    const eventId = randomUUID(),
      captureKey = randomUUID(),
      correlationId = randomUUID();
    const data = {
      capture_channel: null,
      display_name: "Synthetic Contact",
      phone_e164: "+12025550101",
      registration: { complete: true, missing_fields: [] }
    };
    const body = JSON.stringify({
      schema_version: 1,
      event_id: eventId,
      event_name: "samachat.crm.contact.upsert.requested",
      correlation_id: correlationId,
      source_system: "samachat",
      organization_id: hardeningIdentity.organizationId,
      integration_id: hardeningIdentity.integrationId,
      source_instance_id: hardeningIdentity.sourceInstanceId,
      source_contact_id: "1",
      source_revision: 1,
      operation: "upsert_contact",
      occurred_at: "2026-10-03T15:00:00.000Z",
      context: {
        channel: "manual",
        provenance: "manual",
        from_me: false,
        is_group: false
      },
      data
    });
    await exec(
      `INSERT INTO CrmOriginJournals (eventId,correlationId,sourceInstanceId,integrationId,organizationId,sourceContactId,sourceRevision,operation,schemaVersion,canonicalBody,bodyHash,semanticHash,provenance,provider,occurredAt,state,stateVersion,attemptCount,commercialOperation,createdAt,updatedAt)
      VALUES(:eventId,:correlationId,:instance,:integration,:org,'1',1,'upsert_contact',1,:body,:hash,:semanticHash,'manual','unknown','2026-10-03T15:00:00.000Z','intent_persisted',0,0,'not_requested',NOW(),NOW())`,
      {
        eventId,
        correlationId,
        instance: hardeningIdentity.sourceInstanceId,
        integration: hardeningIdentity.integrationId,
        org: hardeningIdentity.organizationId,
        body,
        hash: OriginJournalHash(body),
        semanticHash: OriginJournalHash(JSON.stringify(data))
      }
    );
    await exec(
      "INSERT INTO CrmOriginCaptureCommands(captureKey,sourceInstanceId,integrationId,organizationId,inputHash,outcome,createdAt,updatedAt) VALUES(:captureKey,:instance,:integration,:org,:hash,NULL,NOW(),NOW())",
      {
        captureKey,
        instance: hardeningIdentity.sourceInstanceId,
        integration: hardeningIdentity.integrationId,
        org: hardeningIdentity.organizationId,
        hash: OriginJournalHash("synthetic-input")
      }
    );
    return { eventId, captureKey };
  };
  const bytes = async (
    table: "CrmOriginJournals" | "CrmOriginCaptureCommands",
    key: string
  ) => {
    await guard();
    const [fields] = await independent.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION",
      [databaseName, table.toLowerCase()]
    );
    if (!fields.length) throw new Error("H01_INDEPENDENT_COLUMNS_MISSING");
    const names = fields.map(row => String(row.COLUMN_NAME));
    const projection = names
      .map(name => `HEX(CAST(\`${name}\` AS BINARY)) AS \`${name}\``)
      .join(",");
    const [rows] = await independent.query(
      `SELECT ${projection} FROM ${table} WHERE ${
        table === "CrmOriginJournals" ? "eventId" : "captureKey"
      }=?`,
      [key]
    );
    if (rows.length !== 1) throw new Error("H01_INDEPENDENT_ROW_MISSING");
    return rows[0];
  };
  try {
    await guard();
    return {
      database,
      guard,
      exec,
      restore,
      seed,
      bytes,
      close: async () => {
        await independent.end();
        await database.close();
      }
    };
  } catch (error) {
    await independent.end();
    await database.close();
    throw error;
  }
}
