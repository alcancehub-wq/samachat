import { QueryInterface, DataTypes } from "sequelize";

const TABLE_NAME = "Schedules";
const COLUMN_NAME = "senderWhatsappId";

type TableDescription = Record<string, unknown>;

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable(
      TABLE_NAME
    )) as TableDescription;

    if (!table[COLUMN_NAME]) {
      await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Whatsapps",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable(
      TABLE_NAME
    )) as TableDescription;

    if (table[COLUMN_NAME]) {
      await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME);
    }
  }
};
