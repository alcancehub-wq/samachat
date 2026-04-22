import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("FlowExecutionLogs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      flowExecutionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "FlowExecutions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      nodeId: {
        type: DataTypes.INTEGER,
        references: { model: "FlowNodes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      event: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT
      },
      data: {
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
    return queryInterface.dropTable("FlowExecutionLogs");
  }
};
