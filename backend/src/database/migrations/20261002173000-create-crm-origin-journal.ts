import { DataTypes, QueryInterface, QueryTypes } from "sequelize";

const immutable = [
  "eventId",
  "correlationId",
  "sourceInstanceId",
  "integrationId",
  "organizationId",
  "sourceContactId",
  "sourceRevision",
  "operation",
  "schemaVersion",
  "canonicalBody",
  "bodyHash",
  "semanticHash",
  "provenance",
  "provider",
  "occurredAt",
  "commercialOperation",
  "createdAt"
];
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(
      "CrmOriginCaptureCommands",
      {
        captureKey: {
          type: DataTypes.STRING(36),
          primaryKey: true,
          allowNull: false
        },
        sourceInstanceId: { type: DataTypes.STRING(100), allowNull: false },
        integrationId: { type: DataTypes.STRING(100), allowNull: false },
        organizationId: { type: DataTypes.STRING(36), allowNull: false },
        inputHash: { type: DataTypes.STRING(64), allowNull: false },
        outcome: { type: DataTypes.TEXT, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false }
      },
      { engine: "InnoDB", charset: "utf8mb4", collate: "utf8mb4_bin" }
    );
    await queryInterface.createTable(
      "CrmOriginJournals",
      {
        eventId: {
          type: DataTypes.STRING(36),
          primaryKey: true,
          allowNull: false
        },
        correlationId: { type: DataTypes.STRING(36), allowNull: false },
        sourceInstanceId: { type: DataTypes.STRING(100), allowNull: false },
        integrationId: { type: DataTypes.STRING(100), allowNull: false },
        organizationId: { type: DataTypes.STRING(36), allowNull: false },
        sourceContactId: { type: DataTypes.STRING(20), allowNull: false },
        sourceRevision: { type: DataTypes.BIGINT, allowNull: false },
        operation: { type: DataTypes.STRING(40), allowNull: false },
        schemaVersion: { type: DataTypes.INTEGER, allowNull: false },
        canonicalBody: { type: DataTypes.TEXT, allowNull: false },
        bodyHash: { type: DataTypes.STRING(64), allowNull: false },
        semanticHash: { type: DataTypes.STRING(64), allowNull: false },
        provenance: { type: DataTypes.STRING(30), allowNull: false },
        provider: { type: DataTypes.STRING(30), allowNull: false },
        occurredAt: { type: DataTypes.STRING(24), allowNull: false },
        state: { type: DataTypes.STRING(40), allowNull: false },
        stateVersion: { type: DataTypes.INTEGER, allowNull: false },
        attemptCount: { type: DataTypes.INTEGER, allowNull: false },
        attemptId: { type: DataTypes.STRING(36), allowNull: true },
        leaseExpiresAt: { type: DataTypes.STRING(24), allowNull: true },
        transportAcceptedAt: { type: DataTypes.STRING(24), allowNull: true },
        receiptValidatedAt: { type: DataTypes.STRING(24), allowNull: true },
        contactConfirmedAt: { type: DataTypes.STRING(24), allowNull: true },
        receipt: { type: DataTypes.TEXT, allowNull: true },
        lastErrorCode: { type: DataTypes.STRING(100), allowNull: true },
        commercialOperation: { type: DataTypes.STRING(30), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false }
      },
      { engine: "InnoDB", charset: "utf8mb4", collate: "utf8mb4_bin" }
    );
    await queryInterface.addIndex(
      "CrmOriginJournals",
      ["sourceInstanceId", "sourceContactId", "sourceRevision"],
      { unique: true, name: "crm_origin_identity_revision_unique" }
    );
    await queryInterface.addIndex(
      "CrmOriginJournals",
      ["sourceInstanceId", "integrationId", "organizationId", "state"],
      { name: "crm_origin_pending_scope" }
    );
    await queryInterface.sequelize
      .query(`CREATE TRIGGER crm_origin_journal_immutable BEFORE UPDATE ON CrmOriginJournals
      FOR EACH ROW BEGIN IF ${immutable
        .map(field => `NOT (NEW.${field} <=> OLD.${field})`)
        .join(" OR ")}
      THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ORIGIN_JOURNAL_IMMUTABLE'; END IF; END`);
    await queryInterface.sequelize
      .query(`CREATE TRIGGER crm_origin_command_immutable BEFORE UPDATE ON CrmOriginCaptureCommands
      FOR EACH ROW BEGIN IF ${[
        "captureKey",
        "sourceInstanceId",
        "integrationId",
        "organizationId",
        "inputHash",
        "createdAt"
      ]
        .map(field => `NOT (NEW.${field} <=> OLD.${field})`)
        .join(" OR ")}
      OR (OLD.outcome IS NOT NULL AND NOT (NEW.outcome <=> OLD.outcome))
      THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ORIGIN_COMMAND_IMMUTABLE'; END IF; END`);
  },
  down: async (queryInterface: QueryInterface) => {
    const rows = await queryInterface.sequelize.query(
      "SELECT (SELECT COUNT(*) FROM CrmOriginJournals) + (SELECT COUNT(*) FROM CrmOriginCaptureCommands) AS total",
      { type: QueryTypes.SELECT }
    );
    if (Number((rows[0] as { total: unknown }).total) !== 0)
      throw new Error("ORIGIN_ROLLBACK_REQUIRES_DATA_PRESERVATION");
    await queryInterface.dropTable("CrmOriginJournals");
    await queryInterface.dropTable("CrmOriginCaptureCommands");
  }
};
