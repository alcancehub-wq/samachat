import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Whatsapps", "providerType", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "web"
    });

    await queryInterface.addColumn("Whatsapps", "wabaId", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "phoneNumberId", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "businessAccountId", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "accessToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "verifyToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "appSecret", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "apiVersion", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "v20.0"
    });

    await queryInterface.addColumn("Whatsapps", "cloudApiStatus", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "cloudApiLastError", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "cloudApiLastError");
    await queryInterface.removeColumn("Whatsapps", "cloudApiStatus");
    await queryInterface.removeColumn("Whatsapps", "apiVersion");
    await queryInterface.removeColumn("Whatsapps", "appSecret");
    await queryInterface.removeColumn("Whatsapps", "verifyToken");
    await queryInterface.removeColumn("Whatsapps", "accessToken");
    await queryInterface.removeColumn("Whatsapps", "businessAccountId");
    await queryInterface.removeColumn("Whatsapps", "phoneNumberId");
    await queryInterface.removeColumn("Whatsapps", "wabaId");
    await queryInterface.removeColumn("Whatsapps", "providerType");
  }
};
