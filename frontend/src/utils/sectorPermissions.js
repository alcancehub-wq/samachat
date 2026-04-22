export const SECTOR_PERMISSION_GROUPS = [
  {
    key: "access",
    titleKey: "sectorPermissions.groups.access",
    items: [
      { key: "admin.access", labelKey: "sectorPermissions.labels.adminAccess" },
      { key: "drawer-admin-items:view", labelKey: "sectorPermissions.labels.adminMenu" },
      { key: "login.access", labelKey: "sectorPermissions.labels.loginAccess" }
    ]
  },
  {
    key: "sectors",
    titleKey: "sectorPermissions.groups.sectors",
    items: [
      { key: "sectors.view", actionKey: "view" },
      { key: "sectors.create", actionKey: "create" },
      { key: "sectors.update", actionKey: "update" },
      { key: "sectors.delete", actionKey: "delete" },
      { key: "sectors.permissions.update", actionKey: "permissions" }
    ]
  },
  {
    key: "users",
    titleKey: "sectorPermissions.groups.users",
    items: [
      { key: "users.view", actionKey: "view" },
      { key: "users.create", actionKey: "create" },
      { key: "users.update", actionKey: "update" },
      { key: "users.delete", actionKey: "delete" },
      { key: "user-modal:editProfile", labelKey: "sectorPermissions.labels.editUserProfile" },
      { key: "user-modal:editQueues", labelKey: "sectorPermissions.labels.assignSectors" }
    ]
  },
  {
    key: "tags",
    titleKey: "sectorPermissions.groups.tags",
    items: [
      { key: "tags.view", actionKey: "view" },
      { key: "tags.create", actionKey: "create" },
      { key: "tags.update", actionKey: "update" },
      { key: "tags.delete", actionKey: "delete" }
    ]
  },
  {
    key: "contacts",
    titleKey: "sectorPermissions.groups.contacts",
    items: [
      { key: "contacts.view", actionKey: "view" },
      { key: "contacts.create", actionKey: "create" },
      { key: "contacts.update", actionKey: "update" },
      { key: "contacts.delete", actionKey: "delete" },
      { key: "contacts.import", labelKey: "sectorPermissions.labels.importContacts" },
      { key: "contacts-page:deleteContact", labelKey: "sectorPermissions.labels.deleteContact" }
    ]
  },
  {
    key: "contactLists",
    titleKey: "sectorPermissions.groups.contactLists",
    items: [
      { key: "contactLists.view", actionKey: "view" },
      { key: "contactLists.create", actionKey: "create" },
      { key: "contactLists.update", actionKey: "update" },
      { key: "contactLists.delete", actionKey: "delete" },
      { key: "contactLists.contacts.view", labelKey: "sectorPermissions.labels.listContacts" }
    ]
  },
  {
    key: "dialogs",
    titleKey: "sectorPermissions.groups.dialogs",
    items: [
      { key: "dialogs.view", actionKey: "view" },
      { key: "dialogs.create", actionKey: "create" },
      { key: "dialogs.update", actionKey: "update" },
      { key: "dialogs.delete", actionKey: "delete" },
      { key: "dialogs.duplicate", labelKey: "sectorPermissions.labels.duplicate" }
    ]
  },
  {
    key: "campaigns",
    titleKey: "sectorPermissions.groups.campaigns",
    items: [
      { key: "campaigns.view", actionKey: "view" },
      { key: "campaigns.create", actionKey: "create" },
      { key: "campaigns.update", actionKey: "update" },
      { key: "campaigns.delete", actionKey: "delete" }
    ]
  },
  {
    key: "integrations",
    titleKey: "sectorPermissions.groups.integrations",
    items: [
      { key: "integrations.view", actionKey: "view" },
      { key: "integrations.create", actionKey: "create" },
      { key: "integrations.update", actionKey: "update" },
      { key: "integrations.delete", actionKey: "delete" }
    ]
  },
  {
    key: "webhooks",
    titleKey: "sectorPermissions.groups.webhooks",
    items: [
      { key: "webhooks.view", actionKey: "view" },
      { key: "webhooks.create", actionKey: "create" },
      { key: "webhooks.update", actionKey: "update" },
      { key: "webhooks.delete", actionKey: "delete" },
      { key: "webhooks.events", labelKey: "sectorPermissions.labels.events" },
      { key: "webhooks.test", labelKey: "sectorPermissions.labels.test" },
      { key: "webhooks.logs", labelKey: "sectorPermissions.labels.logs" }
    ]
  },
  {
    key: "informatives",
    titleKey: "sectorPermissions.groups.informatives",
    items: [
      { key: "informatives.view", actionKey: "view" },
      { key: "informatives.create", actionKey: "create" },
      { key: "informatives.update", actionKey: "update" },
      { key: "informatives.delete", actionKey: "delete" }
    ]
  },
  {
    key: "kanban",
    titleKey: "sectorPermissions.groups.kanban",
    items: [
      { key: "kanban.view", actionKey: "view" },
      { key: "kanban.columns.view", labelKey: "sectorPermissions.labels.columnsView" },
      { key: "kanban.columns.create", labelKey: "sectorPermissions.labels.columnsCreate" },
      { key: "kanban.columns.update", labelKey: "sectorPermissions.labels.columnsUpdate" },
      { key: "kanban.columns.reorder", labelKey: "sectorPermissions.labels.columnsReorder" },
      { key: "kanban.move", labelKey: "sectorPermissions.labels.moveCards" }
    ]
  },
  {
    key: "tasks",
    titleKey: "sectorPermissions.groups.tasks",
    items: [
      { key: "tasks.view", actionKey: "view" },
      { key: "tasks.create", actionKey: "create" },
      { key: "tasks.update", actionKey: "update" },
      { key: "tasks.delete", actionKey: "delete" },
      { key: "tasks.close", labelKey: "sectorPermissions.labels.close" },
      { key: "tasks.reopen", labelKey: "sectorPermissions.labels.reopen" }
    ]
  },
  {
    key: "files",
    titleKey: "sectorPermissions.groups.files",
    items: [{ key: "files.view", actionKey: "view" }]
  },
  {
    key: "schedules",
    titleKey: "sectorPermissions.groups.schedules",
    items: [
      { key: "schedules.view", actionKey: "view" },
      { key: "schedules.create", actionKey: "create" },
      { key: "schedules.update", actionKey: "update" },
      { key: "schedules.delete", actionKey: "delete" },
      { key: "schedules.cancel", labelKey: "sectorPermissions.labels.cancel" },
      { key: "schedules.reopen", labelKey: "sectorPermissions.labels.reopen" }
    ]
  },
  {
    key: "flows",
    titleKey: "sectorPermissions.groups.flows",
    items: [
      { key: "flows.view", actionKey: "view" },
      { key: "flows.create", actionKey: "create" },
      { key: "flows.update", actionKey: "update" },
      { key: "flows.delete", actionKey: "delete" },
      { key: "flows.graph.update", labelKey: "sectorPermissions.labels.graphUpdate" },
      { key: "flows.nodes.view", labelKey: "sectorPermissions.labels.nodesView" },
      { key: "flows.publish", labelKey: "sectorPermissions.labels.publish" },
      { key: "flows.unpublish", labelKey: "sectorPermissions.labels.unpublish" },
      { key: "flows.test", labelKey: "sectorPermissions.labels.test" },
      { key: "flows.execute", labelKey: "sectorPermissions.labels.execute" },
      { key: "flows.executions.view", labelKey: "sectorPermissions.labels.executionsView" }
    ]
  },
  {
    key: "openai",
    titleKey: "sectorPermissions.groups.openai",
    items: [
      { key: "openai.settings.view", labelKey: "sectorPermissions.labels.settingsView" },
      { key: "openai.settings.update", labelKey: "sectorPermissions.labels.settingsUpdate" },
      { key: "openai.settings.test", labelKey: "sectorPermissions.labels.test" },
      { key: "openai.logs.view", labelKey: "sectorPermissions.labels.logs" },
      { key: "openai.use", labelKey: "sectorPermissions.labels.use" }
    ]
  },
  {
    key: "tickets",
    titleKey: "sectorPermissions.groups.tickets",
    items: [
      { key: "tickets.view", actionKey: "view" },
      { key: "tickets.create", actionKey: "create" },
      { key: "tickets.update", actionKey: "update" },
      { key: "tickets.delete", actionKey: "delete" },
      { key: "tickets.showAll", labelKey: "sectorPermissions.labels.showAll" },
      { key: "tickets-manager:showall", labelKey: "sectorPermissions.labels.showAll" },
      { key: "ticket-options:deleteTicket", labelKey: "sectorPermissions.labels.deleteTicket" },
      { key: "ticket-options:transferWhatsapp", labelKey: "sectorPermissions.labels.transferConnection" }
    ]
  },
  {
    key: "messages",
    titleKey: "sectorPermissions.groups.messages",
    items: [
      { key: "messages.view", actionKey: "view" },
      { key: "messages.create", actionKey: "create" },
      { key: "messages.delete", actionKey: "delete" }
    ]
  },
  {
    key: "connections",
    titleKey: "sectorPermissions.groups.connections",
    items: [
      { key: "connections.view", actionKey: "view" },
      { key: "connections.create", actionKey: "create" },
      { key: "connections.update", actionKey: "update" },
      { key: "connections.delete", actionKey: "delete" },
      { key: "connections.session.manage", labelKey: "sectorPermissions.labels.sessionManage" }
    ]
  },
  {
    key: "settings",
    titleKey: "sectorPermissions.groups.settings",
    items: [
      { key: "settings.view", actionKey: "view" },
      { key: "settings.update", actionKey: "update" }
    ]
  }
];

export const SECTOR_PERMISSION_ACTION_LABELS = {
  view: "sectorPermissions.actions.view",
  create: "sectorPermissions.actions.create",
  update: "sectorPermissions.actions.update",
  delete: "sectorPermissions.actions.delete",
  permissions: "sectorPermissions.actions.permissions"
};
