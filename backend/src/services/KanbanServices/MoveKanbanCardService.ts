import { Transaction } from "sequelize";
import sequelize from "../../database";
import KanbanCard from "../../models/KanbanCard";
import KanbanColumn from "../../models/KanbanColumn";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";

interface Request {
  ticketId: number;
  columnId: number;
  orderedTicketIds: number[];
}

const MoveKanbanCardService = async ({
  ticketId,
  columnId,
  orderedTicketIds
}: Request): Promise<void> => {
  const column = await KanbanColumn.findByPk(columnId);
  if (!column) {
    throw new AppError("ERR_NO_KANBAN_COLUMN_FOUND", 404);
  }

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  await sequelize.transaction(async (transaction: Transaction) => {
    const [card] = await KanbanCard.findOrCreate({
      where: { ticketId },
      defaults: {
        ticketId,
        columnId,
        position: 0
      },
      transaction
    });

    await card.update({ columnId }, { transaction });

    const uniqueIds = Array.from(
      new Set(orderedTicketIds.filter(id => typeof id === "number"))
    );

    await Promise.all(
      uniqueIds.map((id, index) =>
        KanbanCard.upsert(
          {
            ticketId: id,
            columnId,
            position: index
          },
          { transaction }
        )
      )
    );
  });
};

export default MoveKanbanCardService;
