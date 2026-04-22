import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("FlowTriggers", {
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
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      value: {
        type: DataTypes.TEXT
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    return queryInterface.dropTable("FlowTriggers");
  }
};
