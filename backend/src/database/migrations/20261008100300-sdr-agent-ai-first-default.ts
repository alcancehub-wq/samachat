import { QueryInterface, DataTypes } from "sequelize";

// Rollout controlado: a equipe atende primeiro por padrao.
// A IA so assume automaticamente quando essa opcao for habilitada explicitamente.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("SdrAgentSettings", "autoEnableForNewTickets", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.sequelize.query(
      "UPDATE SdrAgentSettings SET autoEnableForNewTickets = 0"
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
