import { QueryTypes, Sequelize } from "sequelize";

export const ContactSourceBridgeTables = [
  "Contacts",
  "ContactCustomFields",
  "ContactTags",
  "CrmOriginJournals",
  "CrmOriginCaptureCommands"
] as const;

export function SourceBridgeTableMatches(
  actual: string,
  expected: string,
  caseMode: number
): boolean {
  return [1, 2].includes(Number(caseMode))
    ? actual.toLowerCase() === expected.toLowerCase()
    : actual === expected;
}

export default async function VerifyContactSourceBridgeSchema(
  database: Sequelize
): Promise<void> {
  const tables = [...ContactSourceBridgeTables];
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
            SourceBridgeTableMatches(row.tableName, table, row.caseMode)
        )
    )
  )
    throw new Error("SOURCE_BRIDGE_SCHEMA_NOT_TRANSACTIONAL");
}
