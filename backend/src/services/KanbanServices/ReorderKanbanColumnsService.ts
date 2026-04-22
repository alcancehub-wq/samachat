import { Transaction } from "sequelize";
import sequelize from "../../database";
import KanbanColumn from "../../models/KanbanColumn";
import AppError from "../../errors/AppError";

interface Request {
  orderedColumnIds: number[];
}

const ReorderKanbanColumnsService = async ({
  orderedColumnIds
}: Request): Promise<void> => {
  const uniqueIds = Array.from(
    new Set(orderedColumnIds.filter(id => typeof id === "number"))
  );

  if (uniqueIds.length === 0) {
    throw new AppError("ERR_KANBAN_COLUMNS_REQUIRED");
  }

  const columns = await KanbanColumn.findAll({
    where: { id: uniqueIds }
  });

  if (columns.length !== uniqueIds.length) {
    throw new AppError("ERR_NO_KANBAN_COLUMN_FOUND", 404);
  }

  await sequelize.transaction(async (transaction: Transaction) => {
    await Promise.all(
      uniqueIds.map((id, index) =>
        KanbanColumn.update(
          { position: index },
          { where: { id }, transaction }
        )
      )
    );
  });
};

export default ReorderKanbanColumnsService;
