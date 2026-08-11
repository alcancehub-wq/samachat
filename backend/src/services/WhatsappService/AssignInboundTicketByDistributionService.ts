import { Op, Transaction } from "sequelize";

import sequelize from "../../database";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import WhatsappDistributionUser from "../../models/WhatsappDistributionUser";
import WhatsappSharingSetting from "../../models/WhatsappSharingSetting";

interface Request {
  ticketId: number;
  whatsappId: number;
}

interface Result {
  userId: number;
  mode: "random" | "round_robin";
}

const AssignInboundTicketByDistributionService = async ({
  ticketId,
  whatsappId
}: Request): Promise<Result | null> => {
  return sequelize.transaction(async (transaction: Transaction) => {
    const whatsapp = await Whatsapp.findByPk(whatsappId, {
      transaction
    });

    if (!whatsapp || whatsapp.providerType === "official") {
      return null;
    }

    const sharingSetting = await WhatsappSharingSetting.findOne({
      where: {
        whatsappId,
        isShared: true,
        distributionEnabled: true
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!sharingSetting) {
      return null;
    }

    const mode = sharingSetting.distributionMode;

    if (mode !== "random" && mode !== "round_robin") {
      return null;
    }

    const ticket = await Ticket.findByPk(ticketId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (
      !ticket ||
      ticket.userId ||
      !ticket.queueId ||
      Number(ticket.whatsappId) !== Number(whatsappId)
    ) {
      return null;
    }

    const configuredUsers = await WhatsappDistributionUser.findAll({
      where: {
        whatsappId
      },
      attributes: ["userId"],
      transaction
    });

    const configuredUserIds = Array.from(
      new Set(
        configuredUsers
          .map(item => Number(item.userId))
          .filter(userId => Number.isInteger(userId) && userId > 0)
      )
    );

    if (!configuredUserIds.length) {
      return null;
    }

    const eligibleUsers = await User.findAll({
      where: {
        id: {
          [Op.in]: configuredUserIds
        },
        whatsappId
      },
      include: [
        {
          association: "queues",
          where: {
            id: ticket.queueId
          },
          required: true
        }
      ],
      order: [["id", "ASC"]],
      transaction
    });

    const eligibleUserIds = Array.from(
      new Set(
        eligibleUsers
          .map(user => Number(user.id))
          .filter(userId => Number.isInteger(userId) && userId > 0)
      )
    );

    if (!eligibleUserIds.length) {
      return null;
    }

    let selectedUserId: number;

    if (mode === "random") {
      const index = Math.floor(Math.random() * eligibleUserIds.length);
      selectedUserId = eligibleUserIds[index];
    } else {
      const lastAssignedUserId = Number(sharingSetting.lastAssignedUserId);
      const lastIndex = eligibleUserIds.indexOf(lastAssignedUserId);

      selectedUserId =
        lastIndex >= 0
          ? eligibleUserIds[(lastIndex + 1) % eligibleUserIds.length]
          : eligibleUserIds[0];
    }

    const [affectedRows] = await Ticket.update(
      {
        userId: selectedUserId
      },
      {
        where: {
          id: ticket.id,
          userId: null
        },
        transaction
      }
    );

    if (affectedRows !== 1) {
      return null;
    }

    if (mode === "round_robin") {
      await sharingSetting.update(
        {
          lastAssignedUserId: selectedUserId
        },
        {
          transaction
        }
      );
    }

    return {
      userId: selectedUserId,
      mode
    };
  });
};

export default AssignInboundTicketByDistributionService;
