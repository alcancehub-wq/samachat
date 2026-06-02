import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "lostAt", {
      type: DataTypes.DATE(6),
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "lostAt");
  }
};