import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("EduzzWebhookEvents", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      integrationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Integrations", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      eventId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      eventName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false
      },
      productId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      buyerPhone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex(
      "EduzzWebhookEvents",
      ["integrationId", "eventName"],
      { name: "idx_eduzz_events_integration_event" }
    );

    await queryInterface.addIndex(
      "EduzzWebhookEvents",
      ["integrationId", "eventId"],
      {
        name: "idx_eduzz_events_integration_event_id",
        unique: true
      }
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("EduzzWebhookEvents");
  }
};
