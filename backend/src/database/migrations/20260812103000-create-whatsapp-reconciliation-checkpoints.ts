import { QueryInterface, DataTypes } from "sequelize";

const TABLE_NAME = "WhatsappReconciliationCheckpoints";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Whatsapps",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      checkpointAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      }
    });

    await queryInterface.addIndex(
      TABLE_NAME,
      ["whatsappId"],
      {
        unique: true,
        name: "whatsapp_reconciliation_checkpoints_whatsapp_unique"
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE_NAME);
  }
};