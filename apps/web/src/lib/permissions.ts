export interface PermissionItem {
  id: string;
  label: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  items: PermissionItem[];
}

export const permissionGroups: PermissionGroup[] = [
  {
    id: 'tags',
    label: 'Tags',
    items: [
      { id: 'tags:view', label: 'Visualizar tags' },
      { id: 'tags:assign', label: 'Atribuir tag no chat' },
      { id: 'tags:remove', label: 'Retirar tag do chat' },
      { id: 'tags:create', label: 'Criar' },
      { id: 'tags:delete', label: 'Apagar' },
    ],
  },
  {
    id: 'files',
    label: 'Arquivos',
    items: [
      { id: 'files:create', label: 'Enviar/Criar' },
      { id: 'files:edit_caption', label: 'Mudar descricao/legenda' },
      { id: 'files:edit_tags', label: 'Alterar tags do arquivo' },
      { id: 'files:delete', label: 'Apagar' },
    ],
  },
  {
    id: 'login',
    label: 'Login',
    items: [
      { id: 'login:mobile', label: 'Permitir login atraves de dispositivos moveis' },
    ],
  },
  {
    id: 'messages',
    label: 'Mensagens',
    items: [
      { id: 'messages:view', label: 'Ver mensagens' },
      { id: 'messages:send', label: 'Enviar mensagens' },
      { id: 'messages:schedule', label: 'Agendar mensagem' },
      { id: 'messages:reload_recent', label: 'Recarregar mensagens recentes' },
      { id: 'messages:reload_old', label: 'Recarregar mensagens antigas (so texto)' },
      { id: 'messages:recheck_edits', label: 'Reverificar mensagens recentes editadas' },
      { id: 'messages:send_template', label: 'Enviar mensagens template' },
    ],
  },
  {
    id: 'automations',
    label: 'Automacoes',
    items: [
      { id: 'automations:view', label: 'Ver automacoes' },
      { id: 'automations:create', label: 'Criar automacao' },
      { id: 'automations:toggle', label: 'Ativar/pausar automacao' },
    ],
  },
  {
    id: 'connections',
    label: 'Conexoes',
    items: [
      { id: 'connections:view', label: 'Ver conexoes' },
      { id: 'connections:create', label: 'Criar conexao' },
      { id: 'connections:qr', label: 'Ver QR code' },
      { id: 'connections:disconnect', label: 'Desconectar' },
    ],
  },
  {
    id: 'dialogs',
    label: 'Dialogos',
    items: [
      { id: 'dialogs:view', label: 'Ver dialogos' },
      { id: 'dialogs:create', label: 'Criar dialogo' },
      { id: 'dialogs:edit', label: 'Editar dialogo' },
      { id: 'dialogs:delete', label: 'Apagar dialogo' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    items: [{ id: 'crm:create_lead', label: 'Criar lead no CRM' }],
  },
  {
    id: 'system',
    label: 'Sistema',
    items: [{ id: 'system:health', label: 'Ver saude do sistema' }],
  },
  {
    id: 'campaigns',
    label: 'Campanhas',
    items: [
      { id: 'campaigns:view', label: 'Ver campanhas' },
      { id: 'campaigns:create', label: 'Criar campanha' },
      { id: 'campaigns:pause', label: 'Pausar campanha' },
      { id: 'campaigns:resume', label: 'Resumir/Iniciar campanha' },
      { id: 'campaigns:delete', label: 'Apagar campanha' },
    ],
  },
  {
    id: 'reports',
    label: 'Relatorios',
    items: [
      { id: 'reports:notes_view', label: 'Anotacoes internas (consultar/ver)' },
      { id: 'reports:access_view', label: 'Acessos (consultar/ver)' },
      { id: 'reports:chats_added_view', label: 'Chats adicionados (consultar/ver)' },
      { id: 'reports:chats_added_delete', label: 'Chats adicionados (apagar registros)' },
      { id: 'reports:chats_view', label: 'Chats (consultar/ver)' },
      { id: 'reports:chats_charts', label: 'Chats (ver graficos)' },
      { id: 'reports:chats_edit', label: 'Chats (criar/alterar)' },
      { id: 'reports:chats_delete', label: 'Chats (apagar)' },
      { id: 'reports:chats_export', label: 'Chats (exportar)' },
      { id: 'reports:messages_view', label: 'Mensagens (consultar/ver)' },
      { id: 'reports:messages_delete', label: 'Mensagens (apagar registros)' },
      { id: 'reports:dialogs_view', label: 'Dialogos (consultar/ver)' },
      { id: 'reports:users_view', label: 'Usuarios (consultar/ver)' },
    ],
  },
  {
    id: 'chatbot',
    label: 'Chatbot',
    items: [
      { id: 'chatbot:dialogs_edit', label: 'Criar/alterar dialogos' },
      { id: 'chatbot:dialogs_run', label: 'Executar dialogo' },
      { id: 'chatbot:message_processing', label: 'Processamento da mensagem' },
      { id: 'chatbot:add_example', label: 'Adicionar exemplo' },
      { id: 'chatbot:reprocess', label: 'Reprocessar mensagem' },
      { id: 'chatbot:approve', label: 'Aprovar mensagem' },
      { id: 'chatbot:view_context', label: 'Ver contexto' },
      { id: 'chatbot:delete_actions', label: 'Deletar dialogos/acoes' },
    ],
  },
  {
    id: 'chats',
    label: 'Chats',
    items: [
      { id: 'chats:view', label: 'Ver chats' },
      { id: 'chats:filter_user', label: 'Filtrar chats por usuario' },
      { id: 'chats:filter_name', label: 'Filtrar chats por nome' },
      { id: 'chats:filter_whatsapp', label: 'Filtrar chats por WhatsApp' },
      { id: 'chats:filter_phone', label: 'Filtrar chats por celular' },
      { id: 'chats:filter_tag', label: 'Filtrar chats por tag' },
      { id: 'chats:filter_archived', label: 'Filtrar chats arquivados' },
      { id: 'chats:filter_broadcast', label: 'Filtrar chats broadcasts' },
      { id: 'chats:filter_unread', label: 'Filtrar chats nao lidos' },
      { id: 'chats:filter_funnel', label: 'Filtrar por etapa do funil' },
      { id: 'chats:filter_favorites', label: 'Filtrar chats favoritos' },
      { id: 'chats:sort_list', label: 'Ordenar lista de chats' },
      { id: 'chats:delegate', label: 'Delegar chats' },
      { id: 'chats:rename', label: 'Mudar nome do chat' },
      { id: 'chats:view_notes', label: 'Ver anotacoes' },
      { id: 'chats:add_note', label: 'Adicionar anotacao' },
      { id: 'chats:delete_bot_context', label: 'Apagar contexto do chatbot' },
      { id: 'chats:delete_own_note', label: 'Apagar propria anotacao' },
      { id: 'chats:delete_any_note', label: 'Apagar qualquer anotacao' },
      { id: 'chats:view_all', label: 'Ver todos os chats' },
      { id: 'chats:toggle_bot', label: 'Ligar/desligar chatbot p/ chat' },
      { id: 'chats:archive', label: 'Arquivar/desarquivar chat' },
      { id: 'chats:view_whatsapp_number', label: 'Ver numero do WhatsApp' },
      { id: 'chats:recheck_read', label: 'Reverificar leitura das mensagens' },
      { id: 'chats:mark_unread', label: 'Marcar chat nao lido' },
      { id: 'chats:mark_read', label: 'Marcar chat como lido' },
      { id: 'chats:reload', label: 'Recarregar chats' },
      { id: 'chats:reload_profile', label: 'Recarregar foto de perfil' },
      { id: 'chats:add', label: 'Adicionar chats' },
      { id: 'chats:delete_messages', label: 'Apagar todas mensagens do chat' },
      { id: 'chats:delegation_history', label: 'Ver historico de delegados do chat' },
      { id: 'chats:view_department', label: 'Ver chats delegados ao depto que faz parte' },
    ],
  },
  {
    id: 'custom_fields',
    label: 'Campos personalizados',
    items: [
      { id: 'custom_fields:view', label: 'Visualizar no chat' },
      { id: 'custom_fields:fill', label: 'Preencher no chat' },
      { id: 'custom_fields:create', label: 'Criar campos personalizados' },
      { id: 'custom_fields:delete', label: 'Apagar campos personalizados' },
    ],
  },
  {
    id: 'users',
    label: 'Usuarios',
    items: [
      { id: 'users:view', label: 'Ver usuarios' },
      { id: 'users:assign_chat', label: 'Atribuir ao chat' },
      { id: 'users:create', label: 'Criar' },
      { id: 'users:edit', label: 'Editar' },
      { id: 'users:delete', label: 'Apagar' },
      { id: 'users:manage_profiles', label: 'Gerenciar perfis de acesso' },
    ],
  },
];

export const allPermissionIds = permissionGroups.flatMap((group) =>
  group.items.map((item) => item.id),
);

export function normalizePermissions(value: string[] | null | undefined) {
  if (!value || value.length === 0) {
    return [];
  }
  if (value.includes('*')) {
    return allPermissionIds;
  }
  return value;
}

export function hasPermission(userPermissions: string[], required: string | string[]) {
  if (userPermissions.includes('*')) {
    return true;
  }
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((permission) => userPermissions.includes(permission));
}
