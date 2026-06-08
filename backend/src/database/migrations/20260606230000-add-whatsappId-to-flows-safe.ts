import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable("Flows")) as Record<
      string,
      unknown
    >;

    if (table.whatsappId) {
      return;
    }

    await queryInterface.addColumn("Flows", "whatsappId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Whatsapps", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable("Flows")) as Record<
      string,
      unknown
    >;

    if (!table.whatsappId) {
      return;
    }

    await queryInterface.removeColumn("Flows", "whatsappId");
  }
};