import { QueryInterface, DataTypes } from "sequelize";

const SHARING_SETTINGS_TABLE = "WhatsappSharingSettings";
const DISTRIBUTION_USERS_TABLE = "WhatsappDistributionUsers";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(SHARING_SETTINGS_TABLE, {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
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
      isShared: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      distributionEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      distributionMode: {
        type: DataTypes.STRING(32),
        allowNull: true
      },
      lastAssignedUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
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
      SHARING_SETTINGS_TABLE,
      ["whatsappId"],
      {
        unique: true,
        name: "whatsapp_sharing_settings_whatsapp_unique"
      }
    );

    await queryInterface.createTable(DISTRIBUTION_USERS_TABLE, {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
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
      DISTRIBUTION_USERS_TABLE,
      ["whatsappId", "userId"],
      {
        unique: true,
        name: "whatsapp_distribution_users_whatsapp_user_unique"
      }
    );

    await queryInterface.addIndex(
      DISTRIBUTION_USERS_TABLE,
      ["userId"],
      {
        name: "whatsapp_distribution_users_user_idx"
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(DISTRIBUTION_USERS_TABLE);
    await queryInterface.dropTable(SHARING_SETTINGS_TABLE);
  }
};
