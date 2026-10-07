import { QueryInterface, DataTypes } from "sequelize";

// Motor de IA escolhido no agente SDR (openai | gemini | claude). Vazio = usa o
// primeiro motor disponivel. A escolha e do agente, nao do sistema todo.
module.exports = {
  up: (queryInterface: QueryInterface) =>
    queryInterface.addColumn("SdrAgentSettings", "aiEngine", {
      type: DataTypes.STRING,
      allowNull: true
    }),

  down: (queryInterface: QueryInterface) =>
    queryInterface.removeColumn("SdrAgentSettings", "aiEngine")
};
