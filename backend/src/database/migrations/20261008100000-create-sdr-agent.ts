import { QueryInterface, DataTypes } from "sequelize";

// Agente SDR: configuracao (linha unica) + marcador por ticket.
// Tudo nasce DESLIGADO: nada muda no atendimento ate alguem ligar.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SdrAgentSettings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      // Se ligado, tickets sem marcacao explicita (e sem atendente) tambem
      // sao atendidos pelo agente.
      autoEnableForNewTickets: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      // Lista de telefones (separados por virgula). Vazia = todos. Preenchida =
      // o agente SO responde a estes numeros (modo de teste seguro).
      allowedNumbers: { type: DataTypes.TEXT },
      agentName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Bia"
      },
      companyName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: ""
      },
      systemPrompt: { type: DataTypes.TEXT }, // null = sem prompt (o agente so responde depois de treinado)
      model: { type: DataTypes.STRING }, // null = modelo da config da OpenAI
      temperature: { type: DataTypes.FLOAT },
      maxHistoryMessages: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      maxToolRounds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      // Espera por novas mensagens antes de responder (junta mensagens picadas).
      replyDelaySeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    // null = segue a regra automatica; true/false = decisao explicita.
    await queryInterface.addColumn("Tickets", "sdrAgentEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "sdrAgentEnabled");
    await queryInterface.dropTable("SdrAgentSettings");
  }
};
