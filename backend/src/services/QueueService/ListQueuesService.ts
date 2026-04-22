import Queue from "../../models/Queue";
import User from "../../models/User";

const ListQueuesService = async (): Promise<Queue[]> => {
  const queues = await Queue.findAll({
    include: [
      {
        model: User,
        attributes: ["id", "name"],
        through: { attributes: [] }
      }
    ],
    order: [
      ["sortOrder", "ASC"],
      ["name", "ASC"]
    ]
  });

  return queues;
};

export default ListQueuesService;
