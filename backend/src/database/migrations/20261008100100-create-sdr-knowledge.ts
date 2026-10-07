import { QueryInterface, DataTypes } from "sequelize";

// Base de conhecimento do agente SDR: documentos e seus trechos (com embedding
// da OpenAI guardado como JSON; a busca por similaridade roda em memoria).
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SdrKnowledgeFiles", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: { type: DataTypes.STRING, allowNull: false },
      charCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      chunkCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("SdrKnowledgeChunks", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      fileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "SdrKnowledgeFiles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      position: { type: DataTypes.INTEGER, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      embedding: { type: DataTypes.TEXT({ length: "medium" }), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("SdrKnowledgeChunks", ["fileId"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("SdrKnowledgeChunks");
    await queryInterface.dropTable("SdrKnowledgeFiles");
  }
};
