import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(
      "MetaMessageTemplateVariableMappings",
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        whatsappId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "Whatsapps",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        templateName: {
          type: DataTypes.STRING,
          allowNull: false
        },
        templateLanguage: {
          type: DataTypes.STRING,
          allowNull: false
        },
        componentType: {
          type: DataTypes.STRING,
          allowNull: false
        },
        position: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        variableKey: {
          type: DataTypes.STRING,
          allowNull: false
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      }
    );

    await queryInterface.addIndex(
      "MetaMessageTemplateVariableMappings",
      [
        "whatsappId",
        "templateName",
        "templateLanguage",
        "componentType",
        "position"
      ],
      {
        unique: true,
        name: "meta_template_variable_mapping_identity_unique"
      }
    );

    await queryInterface.addIndex(
      "MetaMessageTemplateVariableMappings",
      [
        "whatsappId",
        "templateName",
        "templateLanguage"
      ],
      {
        name: "meta_template_variable_mapping_template_lookup"
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(
      "MetaMessageTemplateVariableMappings"
    );
  }
};