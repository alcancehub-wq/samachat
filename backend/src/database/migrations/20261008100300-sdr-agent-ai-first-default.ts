import { QueryInterface, DataTypes } from "sequelize";

// A IA passa a atender primeiro por padrao (a equipe assume pelo botao IA | Humano).
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("SdrAgentSettings", "autoEnableForNewTickets", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.sequelize.query(
      "UPDATE SdrAgentSettings SET autoEnableForNewTickets = 1"
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("SdrAgentSettings", "autoEnableForNewTickets", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }
};
