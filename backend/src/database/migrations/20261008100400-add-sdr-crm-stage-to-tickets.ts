import { QueryInterface, DataTypes } from "sequelize";

// Etapa atual do lead no funil SDR do CRM, gravada pela BIA depois que o CRM confirma
// o avanco (CrmM2mSdrStageAdvanceService). Aditiva: so adiciona uma coluna anulavel.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "sdrCrmStage", {
      type: DataTypes.STRING(150),
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "sdrCrmStage");
  }
};
