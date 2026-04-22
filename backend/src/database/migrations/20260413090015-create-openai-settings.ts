import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("OpenAISettings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      apiKey: {
        type: DataTypes.TEXT
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      model: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "gpt-4o-mini"
      },
      temperature: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.7
      },
      topP: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1
      },
      maxTokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 400
      },
      presencePenalty: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      frequencyPenalty: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      systemPrompt: {
        type: DataTypes.TEXT
      },
      suggestionPrompt: {
        type: DataTypes.TEXT
      },
      rewritePrompt: {
        type: DataTypes.TEXT
      },
      summaryPrompt: {
        type: DataTypes.TEXT
      },
      classificationPrompt: {
        type: DataTypes.TEXT
      },
      autoReplyEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      autoReplyPrompt: {
        type: DataTypes.TEXT
      },
      maxRequestsPerDay: {
        type: DataTypes.INTEGER
      },
      maxRequestsPerHour: {
        type: DataTypes.INTEGER
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
    return queryInterface.dropTable("OpenAISettings");
  }
};
