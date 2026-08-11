import { Transaction } from "sequelize";

import Whatsapp from "../../models/Whatsapp";

const AssociateWhatsappQueue = async (
  whatsapp: Whatsapp,
  queueIds: number[],
  transaction?: Transaction
): Promise<void> => {
  if (transaction) {
    await whatsapp.$set("queues", queueIds, {
      transaction
    });

    await whatsapp.reload({
      transaction
    });

    return;
  }

  await whatsapp.$set("queues", queueIds);
  await whatsapp.reload();
};

export default AssociateWhatsappQueue;
