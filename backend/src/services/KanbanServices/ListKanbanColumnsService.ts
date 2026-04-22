import KanbanColumn from "../../models/KanbanColumn";

const ListKanbanColumnsService = async (): Promise<KanbanColumn[]> => {
  const columns = await KanbanColumn.findAll({
    order: [["position", "ASC"]]
  });

  return columns;
};

export default ListKanbanColumnsService;
