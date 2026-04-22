import AppError from "../../errors/AppError";
import KanbanColumn from "../../models/KanbanColumn";

interface Request {
  name: string;
  key?: string;
  isActive?: boolean;
}

const sanitizeKey = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

const CreateKanbanColumnService = async ({
  name,
  key,
  isActive = true
}: Request): Promise<KanbanColumn> => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new AppError("ERR_KANBAN_COLUMN_NAME_REQUIRED");
  }

  const nextKey = sanitizeKey(key ? key : trimmedName);

  if (!nextKey) {
    throw new AppError("ERR_KANBAN_COLUMN_KEY_REQUIRED");
  }

  const existing = await KanbanColumn.findOne({
    where: { key: nextKey }
  });

  if (existing) {
    throw new AppError("ERR_KANBAN_COLUMN_DUPLICATED");
  }

  const maxPosition = await KanbanColumn.max("position");
  const position = Number.isFinite(maxPosition)
    ? Number(maxPosition) + 1
    : 0;

  const column = await KanbanColumn.create({
    name: trimmedName,
    key: nextKey,
    isActive,
    position
  });

  return column;
};

export default CreateKanbanColumnService;
