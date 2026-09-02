import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "replyOutboundMode", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "STANDARD"
    });
    await queryInterface.addColumn("Tickets", "replyDeliveryWhatsappId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "replyDeliveryWhatsappId");
    await queryInterface.removeColumn("Tickets", "replyOutboundMode");
  }
};