import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Dialogs", "mediaFileName", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("Dialogs", "mediaOriginalName", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("Dialogs", "mediaMimeType", {
        type: DataTypes.STRING,
        allowNull: true
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Dialogs", "mediaMimeType"),
      queryInterface.removeColumn("Dialogs", "mediaOriginalName"),
      queryInterface.removeColumn("Dialogs", "mediaFileName")
    ]);
  }
};
