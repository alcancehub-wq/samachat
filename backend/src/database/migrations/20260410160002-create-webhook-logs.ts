import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("WebhookLogs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      webhookId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      event: {
        type: DataTypes.STRING,
        allowNull: false
      },
      statusCode: {
        type: DataTypes.INTEGER
      },
      durationMs: {
        type: DataTypes.INTEGER
      },
      requestBody: {
        type: DataTypes.TEXT
      },
      responseBody: {
        type: DataTypes.TEXT
      },
      error: {
        type: DataTypes.TEXT
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
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("WebhookLogs");
  }
};
