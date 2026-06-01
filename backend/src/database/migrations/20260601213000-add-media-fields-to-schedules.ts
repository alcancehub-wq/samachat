import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Schedules", "mediaFileName", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Schedules", "mediaOriginalName", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Schedules", "mediaMimeType", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Schedules", "mediaMimeType");
    await queryInterface.removeColumn("Schedules", "mediaOriginalName");
    await queryInterface.removeColumn("Schedules", "mediaFileName");
  }
};