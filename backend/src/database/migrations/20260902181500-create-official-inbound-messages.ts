import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("OfficialInboundMessages", {
      providerMessageId: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
      providerTimestamp: { type: DataTypes.BIGINT, allowNull: false },
      contextProviderMessageId: { type: DataTypes.STRING, allowNull: true },
      deliveryWhatsappId: { type: DataTypes.INTEGER, allowNull: false },
      contactId: { type: DataTypes.INTEGER, allowNull: false },
      ticketId: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex(
      "OfficialInboundMessages",
      ["ticketId", "deliveryWhatsappId", "providerTimestamp"],
      { name: "idx_official_inbound_ticket_delivery_ts" }
    );
    await queryInterface.addIndex("OfficialInboundMessages", ["contextProviderMessageId"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("OfficialInboundMessages");
  }
};