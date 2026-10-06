import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(
      "CrmIntegrationMappings",
      "syncEnabled",
      {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    );

    await queryInterface.addColumn(
      "CrmIntegrationMappings",
      "commercialAdmissionEnabled",
      {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    );

    await queryInterface.addColumn(
      "CrmIntegrationMappings",
      "commercialPipelineName",
      {
        type: DataTypes.STRING(150),
        allowNull: true
      }
    );

    await queryInterface.addColumn(
      "CrmIntegrationMappings",
      "commercialStageName",
      {
        type: DataTypes.STRING(150),
        allowNull: true
      }
    );

    await queryInterface.addColumn(
      "CrmIntegrationMappings",
      "commercialOwnerEmail",
      {
        type: DataTypes.STRING(255),
        allowNull: true
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(
      "CrmIntegrationMappings",
      "commercialOwnerEmail"
    );

    await queryInterface.removeColumn(
      "CrmIntegrationMappings",
      "commercialStageName"
    );

    await queryInterface.removeColumn(
      "CrmIntegrationMappings",
      "commercialPipelineName"
    );

    await queryInterface.removeColumn(
      "CrmIntegrationMappings",
      "commercialAdmissionEnabled"
    );

    await queryInterface.removeColumn(
      "CrmIntegrationMappings",
      "syncEnabled"
    );
  }
};
