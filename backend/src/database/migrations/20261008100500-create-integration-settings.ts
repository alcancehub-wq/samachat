import { QueryInterface, DataTypes } from "sequelize";

// Credenciais e opcoes das integracoes externas (Gemini, Claude, ElevenLabs). Segredos cifrados (AES-256-GCM) pela aplicacao.
// Uma linha por provedor; `config` e um JSON em texto.
module.exports = {
  up: (queryInterface: QueryInterface) =>
    queryInterface.createTable("IntegrationSettings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      config: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }),

  down: (queryInterface: QueryInterface) =>
    queryInterface.dropTable("IntegrationSettings")
};
