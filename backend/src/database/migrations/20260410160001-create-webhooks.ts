import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("Webhooks", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false
      },
      method: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "POST"
      },
      events: {
        type: DataTypes.TEXT
      },
      secret: {
        type: DataTypes.STRING
      },
      integrationId: {
        type: DataTypes.INTEGER
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      lastTestAt: {
        type: DataTypes.DATE
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
    return queryInterface.dropTable("Webhooks");
  }
};
