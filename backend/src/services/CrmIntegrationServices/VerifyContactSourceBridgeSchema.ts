import { QueryTypes, Sequelize } from "sequelize";

export default async function VerifyContactSourceBridgeSchema(
  database: Sequelize
): Promise<void> {
  const tables = [
    "Contacts",
    "ContactCustomFields",
    "ContactTags",
    "CrmOriginJournals",
    "CrmOriginCaptureCommands"
  ];
  const engines = await database.query<{
    tableName: string;
    engine: string;
    caseMode: number;
  }>(
    "SELECT TABLE_NAME AS tableName,ENGINE AS engine,@@lower_case_table_names AS caseMode FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (:tables)",
    { type: QueryTypes.SELECT, replacements: { tables } }
  );
  if (
    tables.some(
      table =>
        !engines.some(
          row =>
            row.engine === "InnoDB" &&
            ([1, 2].includes(Number(row.caseMode))
              ? row.tableName.toLowerCase() === table.toLowerCase()
              : row.tableName === table)
        )
    )
  )
    throw new Error("SOURCE_BRIDGE_SCHEMA_NOT_TRANSACTIONAL");
}
