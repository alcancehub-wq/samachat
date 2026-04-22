import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Queues", "isActive", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }),
      queryInterface.addColumn("Queues", "sortOrder", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Queues", "isActive"),
      queryInterface.removeColumn("Queues", "sortOrder")
    ]);
  }
};
