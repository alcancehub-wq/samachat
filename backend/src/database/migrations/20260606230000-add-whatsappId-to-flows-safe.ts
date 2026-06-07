import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Flows", "whatsappId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Whatsapps", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Flows", "whatsappId");
  }
};