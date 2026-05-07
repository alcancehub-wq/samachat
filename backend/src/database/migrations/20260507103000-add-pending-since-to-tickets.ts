import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "pendingSince", {
      type: DataTypes.DATE(6),
      allowNull: true
    });

    await queryInterface.sequelize.query(`
      UPDATE Tickets
      SET pendingSince = CASE
        WHEN status = 'pending' THEN COALESCE(updatedAt, createdAt)
        ELSE createdAt
      END
      WHERE pendingSince IS NULL
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "pendingSince");
  }
};