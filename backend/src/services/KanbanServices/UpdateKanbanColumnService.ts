import AppError from "../../errors/AppError";
import KanbanColumn from "../../models/KanbanColumn";

interface ColumnData {
  name?: string;
  key?: string;
  isActive?: boolean;
}

interface Request {
  columnId: string;
  columnData: ColumnData;
}

const sanitizeKey = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

const UpdateKanbanColumnService = async ({
  columnId,
  columnData
}: Request): Promise<KanbanColumn> => {
  const column = await KanbanColumn.findByPk(columnId);

  if (!column) {
    throw new AppError("ERR_NO_KANBAN_COLUMN_FOUND", 404);
  }

  const nextName =
    typeof columnData.name === "string"
      ? columnData.name.trim()
      : undefined;

  if (columnData.name !== undefined && !nextName) {
    throw new AppError("ERR_KANBAN_COLUMN_NAME_REQUIRED");
  }

  let nextKey: string | undefined;

  if (typeof columnData.key === "string") {
    nextKey = sanitizeKey(columnData.key);
    if (!nextKey) {
      throw new AppError("ERR_KANBAN_COLUMN_KEY_REQUIRED");
    }
  }

  if (nextKey && nextKey !== column.key) {
    const existing = await KanbanColumn.findOne({
      where: { key: nextKey }
    });

    if (existing) {
      throw new AppError("ERR_KANBAN_COLUMN_DUPLICATED");
    }
  }

  await column.update({
    name: nextName ?? column.name,
    key: nextKey ?? column.key,
    isActive:
      typeof columnData.isActive === "boolean"
        ? columnData.isActive
        : column.isActive
  });

  await column.reload();

  return column;
};

export default UpdateKanbanColumnService;
