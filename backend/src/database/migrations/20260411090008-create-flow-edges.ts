import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("FlowEdges", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      flowId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Flows", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      sourceNodeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "FlowNodes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      targetNodeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "FlowNodes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      conditionType: {
        type: DataTypes.STRING
      },
      conditionValue: {
        type: DataTypes.TEXT
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    return queryInterface.dropTable("FlowEdges");
  }
};
