import "reflect-metadata";
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

@Table({ tableName: "Contacts" })
export class ContactFixture extends Model<ContactFixture> {
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
  @HasMany(() => InfoFixture) extraInfo!: InfoFixture[];
  @BelongsToMany(() => TagFixture, () => ContactTagFixture) tags!: TagFixture[];
}
@Table({ tableName: "ContactCustomFields" })
export class InfoFixture extends Model<InfoFixture> {
  @PrimaryKey @AutoIncrement @Column id!: number;
  @Column name!: string;
  @Column value!: string;
  @ForeignKey(() => ContactFixture) @Column contactId!: number;
}
@Table({ tableName: "Tags" })
class TagFixture extends Model<TagFixture> {
  @PrimaryKey @Column id!: number;
  @Column name!: string;
}
@Table({ tableName: "ContactTags", timestamps: false })
class ContactTagFixture extends Model<ContactTagFixture> {
  @ForeignKey(() => ContactFixture) @Column contactId!: number;
  @ForeignKey(() => TagFixture) @Column tagId!: number;
}

export async function InitializeContactSourceBridgeLab(): Promise<Sequelize> {
  const delivery = process.env.CRM_DELIVERY_COORDINATOR_LAB_ENABLED === "1";
  const update = process.env.CRM_UPDATE_BRIDGE_LAB_ENABLED === "1";
  if (!delivery && !update && process.env.CRM_SOURCE_BRIDGE_LAB_ENABLED !== "1")
    throw new Error("LAB_OPT_IN_REQUIRED");
  const port = delivery ? 55444 : update ? 55443 : 55442;
  const name = delivery
    ? "r13_delivery_lab"
    : update
    ? "r12_update_lab"
    : "r11_source_lab";
  const expected = delivery
    ? "D:/Samacon/worktrees/samachat-crm-p02-r13-delivery-coordinator-20261003/backend/node_modules/.cache/r13-delivery-lab/data/"
    : update
    ? "D:/Samacon/worktrees/samachat-crm-p02-r12-update-bridge-20261003/backend/node_modules/.cache/r12-update-lab/data/"
    : "D:/Samacon/worktrees/samachat-crm-p02-r11-source-bridge-20261003/backend/node_modules/.cache/r11-source-lab/data/";
  const mysql = require("mysql2/promise");
  const admin = await mysql.createConnection({
    host: "127.0.0.1",
    port,
    user: "root",
    password: ""
  });
  try {
    const [rows] = await admin.query(
      "SELECT @@datadir AS directory,VERSION() AS version"
    );
    if (
      String(rows[0].directory).replace(/\\/g, "/").toLowerCase() !==
        expected.toLowerCase() ||
      !String(rows[0].version).startsWith("10.11.10-MariaDB")
    )
      throw new Error("REFUSING_NON_BRIDGE_LAB_DATABASE");
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(
      `CREATE DATABASE ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`
    );
  } finally {
    await admin.end();
  }
  const database = new Sequelize({
    database: name,
    username: "root",
    password: "",
    host: "127.0.0.1",
    port,
    dialect: "mysql",
    dialectModule: require("mysql2"),
    logging: false,
    models: [
      ContactFixture,
      InfoFixture,
      TagFixture,
      ContactTagFixture,
      CrmOriginJournal,
      CrmOriginCaptureCommand
    ]
  });
  try {
    for (const model of [
      ContactFixture,
      InfoFixture,
      TagFixture,
      ContactTagFixture
    ])
      await model.sync();
    await TagFixture.bulkCreate([
      { id: 1, name: "Synthetic Tag" },
      { id: 2, name: "Synthetic Other Tag" }
    ]);
    await database.query(
      "CREATE TABLE Tickets(id INT PRIMARY KEY,status VARCHAR(30),userId INT,queueId INT,whatsappId INT,unreadMessages INT) ENGINE=InnoDB"
    );
    await database.query("INSERT INTO Tickets VALUES(1,'open',10,20,30,3)");
    await require("../../../../database/migrations/20261002173000-create-crm-origin-journal").up(
      database.getQueryInterface()
    );
    return database;
  } catch (error) {
    await database.close();
    throw error;
  }
}
