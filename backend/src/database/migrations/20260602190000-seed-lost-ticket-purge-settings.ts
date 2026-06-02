import { QueryInterface } from "sequelize";

const buildLostTicketPurgeSettings = () => {
  const now = new Date();

  return [
    {
      key: "lostTicketPurgeEnabled",
      value: "false",
      createdAt: now,
      updatedAt: now
    },
    {
      key: "lostTicketPurgeAmount",
      value: "90",
      createdAt: now,
      updatedAt: now
    },
    {
      key: "lostTicketPurgeUnit",
      value: "days",
      createdAt: now,
      updatedAt: now
    }
  ];
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    for (const setting of buildLostTicketPurgeSettings()) {
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO Settings (\`key\`, value, createdAt, updatedAt)
         VALUES (:key, :value, :createdAt, :updatedAt)`,
        {
          replacements: setting
        }
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete("Settings", {
      key: [
        "lostTicketPurgeEnabled",
        "lostTicketPurgeAmount",
        "lostTicketPurgeUnit"
      ]
    });
  }
};