import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("Campaigns", {
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
      description: {
        type: DataTypes.TEXT
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "draft"
      },
      scheduledAt: {
        type: DataTypes.DATE
      },
      reviewedAt: {
        type: DataTypes.DATE
      },
      lastStatusAt: {
        type: DataTypes.DATE
      },
      dialogId: {
        type: DataTypes.INTEGER
      },
      contactListId: {
        type: DataTypes.INTEGER
      },
      tagIds: {
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
    return queryInterface.dropTable("Campaigns");
  }
};
