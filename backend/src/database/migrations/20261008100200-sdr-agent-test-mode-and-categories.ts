import { QueryInterface, DataTypes } from "sequelize";

// - Modo teste passa a ser um interruptor proprio (antes: lista preenchida = teste).
// - Documentos da base de conhecimento ganham categoria.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("SdrAgentSettings", "testMode", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // Quem ja tinha uma lista preenchida estava, na pratica, em modo teste.
    await queryInterface.sequelize.query(
      "UPDATE SdrAgentSettings SET testMode = 1 WHERE allowedNumbers IS NOT NULL AND allowedNumbers <> ''"
    );

    await queryInterface.addColumn("SdrKnowledgeFiles", "category", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Outros"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("SdrKnowledgeFiles", "category");
    await queryInterface.removeColumn("SdrAgentSettings", "testMode");
  }
};
