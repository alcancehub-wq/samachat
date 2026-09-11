import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("IntegrationCredentials", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      integrationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Integrations",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "HMAC_SECRET"
      },
      secret: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex(
      "IntegrationCredentials",
      ["integrationId", "name"],
      {
        unique: true,
        name: "integration_credentials_integration_name_unique"
      }
    );

    await queryInterface.addIndex(
      "IntegrationCredentials",
      ["integrationId", "type", "isDefault", "isActive"],
      {
        name: "integration_credentials_lookup_idx"
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("IntegrationCredentials");
  }
};