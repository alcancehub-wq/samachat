import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("EduzzIntegrationRules", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      integrationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Integrations", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      eventName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "myeduzz.invoice_paid"
      },
      productId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      messageBody: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      messageMode: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "text"
      },
      metaTemplateName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      metaTemplateLanguage: {
        type: DataTypes.STRING,
        allowNull: true
      },
      metaTemplateComponents: {
        type: DataTypes.JSON,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex(
      "EduzzIntegrationRules",
      ["integrationId", "eventName", "productId"],
      { name: "idx_eduzz_rules_integration_event_product" }
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("EduzzIntegrationRules");
  }
};
