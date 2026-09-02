import { DataTypes, QueryInterface } from "sequelize";

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  definition: any
): Promise<void> => {
  const table = (await queryInterface.describeTable(tableName)) as Record<
    string,
    unknown
  >;
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const consumerColumns = {
      outboundMode: { type: DataTypes.STRING, allowNull: false, defaultValue: "STANDARD" },
      ownerQueueId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Queues", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      deliveryWhatsappId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Whatsapps", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      templateName: { type: DataTypes.STRING, allowNull: true },
      templateLanguage: { type: DataTypes.STRING, allowNull: true },
      templateComponents: { type: DataTypes.TEXT, allowNull: true }
    };

    for (const [columnName, definition] of Object.entries(consumerColumns)) {
      await addColumnIfMissing(queryInterface, "Schedules", columnName, definition);
      await addColumnIfMissing(queryInterface, "Campaigns", columnName, definition);
    }

    await addColumnIfMissing(queryInterface, "Campaigns", "ownerUserId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.createTable("OfficialOutboundOrigins", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      consumerType: { type: DataTypes.STRING, allowNull: false },
      consumerId: { type: DataTypes.INTEGER, allowNull: false },
      ownerUserId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Users", key: "id" } },
      ownerQueueId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Queues", key: "id" } },
      deliveryWhatsappId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Whatsapps", key: "id" } },
      contactId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Contacts", key: "id" } },
      ticketId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Tickets", key: "id" } },
      providerMessageId: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("OfficialOutboundOrigins", ["contactId", "deliveryWhatsappId"]);
    await queryInterface.addIndex("OfficialOutboundOrigins", ["providerMessageId"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("OfficialOutboundOrigins");
    for (const columnName of ["ownerUserId", "outboundMode", "ownerQueueId", "deliveryWhatsappId", "templateName", "templateLanguage", "templateComponents"]) {
      const table = (await queryInterface.describeTable("Campaigns")) as Record<
        string,
        unknown
      >;
      if (table[columnName]) await queryInterface.removeColumn("Campaigns", columnName);
    }
    for (const columnName of ["outboundMode", "ownerQueueId", "deliveryWhatsappId", "templateName", "templateLanguage", "templateComponents"]) {
      const table = (await queryInterface.describeTable("Schedules")) as Record<
        string,
        unknown
      >;
      if (table[columnName]) await queryInterface.removeColumn("Schedules", columnName);
    }
  }
};