import { QueryInterface, DataTypes } from "sequelize";

const TABLE_NAME = "QuickAnswers";
const COLUMN_NAME = "userId";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDefinition = (await queryInterface.describeTable(TABLE_NAME)) as Record<string, unknown>;

    if (!tableDefinition[COLUMN_NAME]) {
      await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
        type: DataTypes.INTEGER,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDefinition = (await queryInterface.describeTable(TABLE_NAME)) as Record<string, unknown>;

    if (tableDefinition[COLUMN_NAME]) {
      await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME);
    }
  }
};
