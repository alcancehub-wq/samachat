import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn("Contacts", "city", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Contacts", "state", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Contacts", "captureChannel", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Contacts", "wasReferred", {
      type: DataTypes.BOOLEAN,
      allowNull: true
    });

    await queryInterface.addColumn("Contacts", "referralType", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Contacts", "referralContactId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Contacts", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.addColumn("Contacts", "referralUserId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.addColumn("Contacts", "referralPartnerName", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Contacts", "referralNote", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("Contacts", "referralNote");
    await queryInterface.removeColumn("Contacts", "referralPartnerName");
    await queryInterface.removeColumn("Contacts", "referralUserId");
    await queryInterface.removeColumn("Contacts", "referralContactId");
    await queryInterface.removeColumn("Contacts", "referralType");
    await queryInterface.removeColumn("Contacts", "wasReferred");
    await queryInterface.removeColumn("Contacts", "captureChannel");
    await queryInterface.removeColumn("Contacts", "state");
    await queryInterface.removeColumn("Contacts", "city");
  }
};