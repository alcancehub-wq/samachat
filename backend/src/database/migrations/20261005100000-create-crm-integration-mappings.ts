import { DataTypes, QueryInterface, QueryTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(
      "CrmIntegrationMappings",
      {
        integrationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: {
            model: "Integrations",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },

        m2mIntegrationId: {
          type: DataTypes.STRING(100),
          allowNull: false
        },

        organizationId: {
          type: DataTypes.STRING(36),
          allowNull: false
        },

        sourceInstanceId: {
          type: DataTypes.STRING(100),
          allowNull: false
        },

        endpoint: {
          type: DataTypes.STRING(2048),
          allowNull: false
        },

        approvedEndpoint: {
          type: DataTypes.STRING(2048),
          allowNull: false
        },

        keyId: {
          type: DataTypes.STRING(100),
          allowNull: false
        },

        secretReference: {
          type: DataTypes.STRING(255),
          allowNull: false
        },

        m2mEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },

        mappingVersion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1
        },

        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },

        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      },
      {
        engine: "InnoDB",
        charset: "utf8mb4",
        collate: "utf8mb4_bin"
      }
    );

    await queryInterface.addIndex(
      "CrmIntegrationMappings",
      ["sourceInstanceId"],
      {
        unique: true,
        name: "crm_integration_mapping_source_instance_unique"
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    const rows = await queryInterface.sequelize.query<{ total: unknown }>(
      "SELECT COUNT(*) AS total FROM CrmIntegrationMappings",
      { type: QueryTypes.SELECT }
    );

    if (
      rows.length !== 1 ||
      Number(rows[0].total) !== 0
    ) {
      throw new Error(
        "CRM_MAPPING_ROLLBACK_REQUIRES_DATA_PRESERVATION"
      );
    }

    await queryInterface.dropTable("CrmIntegrationMappings");
  }
};
