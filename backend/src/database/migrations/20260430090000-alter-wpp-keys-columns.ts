import { QueryInterface, DataTypes } from "sequelize";

type TableColumn = {
  type?: string;
  allowNull?: boolean;
};

const isVarchar191 = (column?: TableColumn) =>
  (column?.type || "").toLowerCase().includes("varchar(191)");

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable("WppKeys")) as Record<
      string,
      TableColumn
    >;

    if (!isVarchar191(table.type)) {
      await queryInterface.changeColumn("WppKeys", "type", {
        type: DataTypes.STRING(191),
        allowNull: false
      });
    }

    if (!isVarchar191(table.keyId)) {
      await queryInterface.changeColumn("WppKeys", "keyId", {
        type: DataTypes.STRING(191),
        allowNull: false
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("WppKeys", "type", {
      type: DataTypes.TEXT,
      allowNull: false
    });

    await queryInterface.changeColumn("WppKeys", "keyId", {
      type: DataTypes.TEXT,
      allowNull: false
    });
  }
};