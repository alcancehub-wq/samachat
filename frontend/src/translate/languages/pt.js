const messages = {
  pt: {
    translations: {
      signup: {
        title: "Cadastre-se",
        toasts: {
          success: "Usuário criado com sucesso! Faça seu login!!!.",
          fail: "Erro ao criar usuário. Verifique os dados informados.",
        },
        form: {
          name: "Nome",
          email: "Email",
          password: "Senha",
        },
        buttons: {
          submit: "Cadastrar",
          login: "Já tem uma conta? Entre!",
        },
      },
      login: {
        title: "Login",
        form: {
          email: "Email",
          password: "Senha",
        },
        buttons: {
          submit: "Entrar",
          register: "Não tem um conta? Cadastre-se!",
        },
      },
      auth: {
        toasts: {
          success: "Login efetuado com sucesso!",
        },
      },
      dashboard: {
        title: "Visão geral estratégica",
        subtitle: "Acompanhe tickets, filas, conexões, agenda e automações em um único painel operacional.",
        lastUpdated: "Atualizado às {{time}}",
        buttons: {
          refresh: "Atualizar painel",
          tickets: "Abrir tickets",
          connections: "Ver conexões",
          tasks: "Ver tarefas",
          schedules: "Ver agenda"
        },
        periods: {
          today: "Hoje",
          "7d": "Últimos 7 dias",
          "30d": "Últimos 30 dias"
        },
        filters: {
          period: "Período",
          queue: "Fila",
          assignee: "Responsável",
          allQueues: "Todas as filas",
          allAssignees: "Todos os responsáveis",
          periodHint: "Define o recorte temporal dos indicadores e gráficos.",
          queueHint: "Foca a leitura da operação em uma fila específica.",
          assigneeHint: "Mostra os volumes priorizando o responsável selecionado."
        },
        charts: {
          perDay: {
            title: "Atendimentos hoje: ",
            yLabel: "Atendimentos",
          },
        },
        messages: {
          inAttendance: {
            title: "Em atendimento"
          },
          waiting: {
            title: "Aguardando atendimento"
          },
          closed: {
            title: "Finalizados"
          }
        },
        summary: {
          unread: "Não lidos",
          today: "hoje",
          contacts: "Contatos válidos",
          activeConnections: "Conexões ativas",
          pendingSchedules: "Agendamentos pendentes"
        },
        sections: {
          timeline: {
            title: "Evolução do volume",
            subtitle: "Tickets criados em {{period}} para acompanhar a pressão operacional."
          },
          hourly: {
            title: "Ritmo operacional do dia",
            subtitle: "Volume de atendimentos criados hoje por faixa horária."
          },
          queues: {
            title: "Distribuição por setor",
            subtitle: "Compare o volume aberto e pendente entre as filas visíveis para o usuário."
          },
          connections: {
            title: "Saúde das conexões",
            subtitle: "Status das conexões WhatsApp com destaque para sessões que exigem atenção."
          },
          workbench: {
            title: "Pendências e automação",
            subtitle: "Leitura rápida do que precisa ser tratado agora no backoffice."
          },
          recent: {
            title: "Atividade recente",
            subtitle: "Tickets atualizados há pouco com acesso rápido para ação."
          },
          tasks: {
            title: "Tarefas prioritárias",
            subtitle: "Itens em aberto com maior urgência operacional."
          },
          schedules: {
            title: "Próximos agendamentos",
            subtitle: "Mensagens planejadas para envio e acompanhamento."
          },
          empty: "Nenhum dado disponível no momento."
        },
        workbench: {
          openTasks: "Tarefas em aberto",
          overdueTasks: "Tarefas atrasadas",
          pendingSchedules: "Agendamentos pendentes",
          scheduledInPeriod: "Agendados no período",
          todaySchedules: "Envios previstos hoje",
          publishedFlows: "Fluxos publicados",
          scheduledCampaigns: "Campanhas agendadas"
        },
        connections: {
          connected: "Conectadas",
          attention: "Em atenção",
          disconnected: "Desconectadas",
          noData: "Nenhuma conexão cadastrada no momento.",
          updated: "Última atualização às {{time}}"
        },
        recent: {
          noQueue: "Sem setor",
          unassigned: "Sem responsável",
          noMessage: "Sem prévia de mensagem",
          unread: "não lidos"
        },
        status: {
          open: "Em atendimento",
          pending: "Pendente",
          closed: "Finalizado",
          connected: "Conectado",
          attention: "Atenção",
          disconnected: "Desconectado"
        },
        priority: {
          high: "Alta",
          medium: "Média",
          low: "Baixa"
        },
        sla: {
          firstResponseRate: "SLA 1ª resposta",
          respondedTickets: "tickets respondidos",
          averageFirstResponse: "Tempo médio 1ª resposta",
          averageResolution: "Tempo médio resolução",
          minutes: "min",
          hours: "h",
          target: "Meta SLA"
        },
        schedules: {
          noContact: "Contato não identificado"
        }
      },
      connections: {
        title: "Conexões",
        subtitle: "Gerencie conexões ativas do SamaChat.",
        toasts: {
          deleted: "Conexão com o WhatsApp excluída com sucesso!",
          restarted: "Reconexão solicitada com sucesso!",
        },
        confirmationModal: {
          deleteTitle: "Deletar",
          deleteMessage: "Você tem certeza? Essa ação não pode ser revertida.",
          disconnectTitle: "Desconectar",
          disconnectMessage:
            "Tem certeza? Você precisará ler o QR Code novamente.",
        },
        buttons: {
          add: "Adicionar conexão",
          disconnect: "Desconectar",
          reconnect: "Reconectar",
          reconnecting: "Reconectando",
          tryAgain: "Tentar novamente",
          qrcode: "QR CODE",
          newQr: "Novo QR CODE",
          connecting: "Conectando",
        },
        toolTips: {
          disconnected: {
            title: "Falha ao iniciar sessão do WhatsApp",
            content:
              "Certifique-se de que seu celular esteja conectado à internet e tente novamente, ou solicite um novo QR Code",
          },
          qrcode: {
            title: "Esperando leitura do QR Code",
            content:
              "Clique no botão 'QR CODE' e leia o QR Code com o seu celular para iniciar a sessão",
          },
          connected: {
            title: "Conexão estabelecida!",
          },
          timeout: {
            title: "A conexão com o celular foi perdida",
            content:
              "Certifique-se de que seu celular esteja conectado à internet e o WhatsApp esteja aberto, ou clique no botão 'Desconectar' para obter um novo QR Code",
          },
        },
        table: {
          name: "Nome",
          connectedNumber: "Número conectado",
          status: "Status",
          lastUpdate: "Última atualização",
          default: "Padrão",
          actions: "Ações",
          session: "Sessão",
        },
      },
      whatsappModal: {
        title: {
          add: "Adicionar WhatsApp",
          edit: "Editar WhatsApp",
        },
        form: {
          name: "Nome",
          default: "Padrão",
          farewellMessage: "Mensagem de despedida"
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "WhatsApp salvo com sucesso.",
      },
      qrCode: {
        message: "Leia o QrCode para iniciar a sessão",
      },
      contacts: {
        title: "Clientes",
        subtitle: "Centralize clientes e historico do SamaChat.",
        toasts: {
          deleted: "Contato excluído com sucesso!",
        },
        searchPlaceholder: "Pesquisar...",
        tagsFilter: "Filtrar tags",
        confirmationModal: {
          deleteTitle: "Deletar ",
          importTitlte: "Importar clientes",
          deleteMessage:
            "Tem certeza que deseja deletar este contato? Todos os tickets relacionados serão perdidos.",
          importMessage: "Deseja importar todos os contatos do telefone?",
        },
        buttons: {
          import: "Importar clientes",
          add: "Adicionar cliente",
        },
        table: {
          name: "Nome",
          whatsapp: "WhatsApp",
          email: "Email",
          actions: "Ações",
        },
      },
      contactModal: {
        title: {
          add: "Adicionar cliente",
          edit: "Editar cliente",
        },
        form: {
          mainInfo: "Dados do cliente",
          extraInfo: "Informações adicionais",
          name: "Nome",
          nameHelper: "Nome completo do cliente.",
          number: "Número do WhatsApp",
          numberHelper: "Inclua DDI e DDD. Ex: 5511999999999.",
          email: "Email",
          emailHelper: "Opcional. Usado para contato e avisos.",
          tags: "Tags",
          tagsPlaceholder: "Selecione tags",
          notes: "Notas",
          notesHelper: "Anotações internas sobre esse contato.",
          extraName: "Nome do campo",
          extraNameHelper: "Ex: Empresa, Cargo, Cidade.",
          extraValue: "Valor",
          extraValueHelper: "Ex: Acme, Gestor, Curitiba.",
        },
        buttons: {
          addExtraInfo: "Adicionar informação",
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Contato salvo com sucesso.",
      },
      quickAnswersModal: {
        title: {
          add: "Adicionar atalho",
          edit: "Editar atalho",
        },
        form: {
          shortcut: "Atalho",
          shortcutHelper: "Ex: /saudação",
          message: "Mensagem do atalho",
          messageHelper: "Texto enviado quando o atalho for usado.",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Atalho salvo com sucesso.",
      },
      userModal: {
        title: {
          add: "Adicionar usuário",
          edit: "Editar usuário",
        },
        form: {
          name: "Nome",
          nameHelper: "Nome completo do usuário.",
          email: "Email",
          emailHelper: "Email usado para login e avisos.",
          password: "Senha",
          passwordHelper: "Minimo 5 caracteres.",
          profile: "Perfil de acesso",
          profileHelper: "Define o nível de acesso do usuário.",
          signMessages: "Assinar mensagens por padrão",
          signMessagesHelper: "Quando ativo, as mensagens enviadas por esse usuário incluem a assinatura com o nome automaticamente.",
          whatsapp: "Conexão Padrão",
          whatsappHelper: "Conexão padrão para novos atendimentos.",
        },
        profileOptions: {
          admin: "Administrador",
          user: "Atendente",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Usuário salvo com sucesso.",
      },
      chat: {
        noTicketMessage: "Selecione um ticket para começar a conversar.",
      },
      ticketsManager: {
        buttons: {
          newTicket: "Novo atendimento",
        },
        tagsFilter: "Tags",
      },
      ticketsQueueSelect: {
        placeholder: "Setores",
      },
      tickets: {
        toasts: {
          deleted: "O atendimento que você estava foi deletado.",
        },
        notification: {
          message: "Mensagem de",
        },
        tabs: {
          open: { title: "Atendimentos" },
          followUp: { title: "Follow up" },
          closed: { title: "Resolvidos" },
          search: { title: "Busca" },
        },
        search: {
          placeholder: "Buscar atendimentos e mensagens",
        },
        buttons: {
          showAll: "Todos",
        },
      },
      transferTicketModal: {
        title: "Transferir atendimento",
        fieldLabel: "Digite para buscar usuários",
        fieldQueueLabel: "Transferir para setor",
        fieldConnectionLabel: "Transferir para conexão",
        fieldQueuePlaceholder: "Selecione um setor",
        fieldConnectionPlaceholder: "Selecione uma conexão",
        noOptions: "Nenhum usuário encontrado com esse nome",
        buttons: {
          ok: "Transferir",
          cancel: "Cancelar",
        },
      },
      ticketsList: {
        pendingHeader: "Aguardando",
        assignedHeader: "Atendendo",
        noTicketsTitle: "Nada aqui!",
        noTicketsMessage:
          "Nenhum atendimento encontrado com esse status ou termo pesquisado",
        connectionTitle: "Conexão que está sendo utilizada atualmente.",
        buttons: {
          accept: "Aceitar",
          selectAll: "Selecionar todos",
          acceptSelected: "Aceitar selecionados",
          deleteSelected: "Excluir selecionados",
        },
      },
      newTicketModal: {
        title: "Criar atendimento",
        fieldLabel: "Digite para pesquisar o cliente",
        add: "Adicionar",
        buttons: {
          ok: "Salvar",
          cancel: "Cancelar",
        },
      },
      mainDrawer: {
        title: "SamaChat",
        search: {
          placeholder: "Buscar...",
        },
        listItems: {
          dashboard: "Dashboard",
          connections: "Conexões",
          tickets: "Chats",
          contacts: "Clientes",
          quickAnswers: "Atalhos",
          tasks: "Tarefas",
          schedules: "Agendamentos",
          flows: "Fluxos",
          files: "Arquivos",
          queues: "Setores",
          tags: "Tags",
          contactLists: "Listas",
          dialogs: "Diálogos",
          campaigns: "Campanhas",
          kanban: "Kanban",
          informatives: "Informativos",
          openai: "IA",
          integrations: "Integrações",
          administration: "Administração",
          users: "Usuários",
          settings: "Configurações",
          apiAdmin: "API Admin",
        },
        groups: {
          operation: "Operação",
          communication: "Comunicação",
          aiIntegrations: "IA e Integrações",
          governance: "Governança",
        },
        submenus: {
          segmentation: "Segmentação",
        },
        appBar: {
          user: {
            profile: "Perfil",
            logout: "Sair",
          },
        },
        drawerUser: {
          menu: {
            informatives: "Informativos",
            releaseNotes: "Notas da versão",
            profile: "Perfil",
            theme: "Tema",
            manual: "Manual",
            lgpd: "LGPD",
          },
        },
      },
      notifications: {
        noTickets: "Nenhuma notificação.",
      },
      queues: {
        title: "Setores",
        subtitle: "Defina setores e organize permissões por equipe.",
        table: {
          name: "Nome",
          sortOrder: "Ordem",
          color: "Cor",
          status: "Status",
          users: "Usuarios",
          greeting: "Mensagem de saudação",
          actions: "Ações",
        },
        status: {
          active: "Ativa",
          inactive: "Inativa",
        },
        toasts: {
          deleted: "Setor excluído com sucesso.",
        },
        buttons: {
          add: "Adicionar setor",
          edit: "Editar setor",
          delete: "Excluir setor",
          permissions: "Permissões",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage:
            "Você tem certeza? Essa ação não pode ser revertida! Os tickets desse setor continuarão existindo, mas não terão mais nenhum setor atribuído.",
        },
      },
      queueSelect: {
        inputLabel: "Setores",
      },
      queueModal: {
        title: {
          add: "Adicionar setor",
          edit: "Editar setor",
        },
        form: {
          name: "Nome",
          nameHelper: "Nome do setor.",
          color: "Cor",
          colorHelper: "Escolha uma cor de destaque.",
          greetingMessage: "Mensagem de saudação",
          greetingMessageHelper: "Mensagem enviada ao iniciar o atendimento.",
          sortOrder: "Ordem",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Setor salvo com sucesso.",
      },
      sectorPermissions: {
        modal: {
          title: "Permissões do setor: {{name}}",
          cancel: "Cancelar",
          save: "Salvar",
          success: "Permissões do setor atualizadas.",
        },
        actions: {
          view: "Ver",
          create: "Criar",
          update: "Editar",
          delete: "Apagar",
          permissions: "Permissões",
          selectAll: "Selecionar todas",
        },
        groups: {
          access: "Acesso",
          sectors: "Setores",
          users: "Usuários",
          tags: "Tags",
          contacts: "Clientes",
          contactLists: "Listas",
          dialogs: "Diálogos",
          campaigns: "Campanhas",
          integrations: "Integrações",
          webhooks: "Webhooks",
          informatives: "Informativos",
          kanban: "Kanban",
          tasks: "Tarefas",
          files: "Arquivos",
          schedules: "Agendamentos",
          flows: "Fluxos",
          openai: "OpenAI / IA",
          tickets: "Atendimentos",
          messages: "Mensagens",
          connections: "Conexões",
          settings: "Ajustes",
        },
        labels: {
          adminAccess: "Acesso administrativo",
          adminMenu: "Menu administrativo",
          loginAccess: "Login",
          editUserProfile: "Editar perfil do usuário",
          assignSectors: "Vincular setores",
          importContacts: "Importar contatos",
          deleteContact: "Excluir contato",
          listContacts: "Contatos da lista",
          duplicate: "Duplicar",
          events: "Eventos",
          test: "Testar",
          logs: "Logs",
          columnsView: "Ver colunas",
          columnsCreate: "Criar colunas",
          columnsUpdate: "Editar colunas",
          columnsReorder: "Reordenar colunas",
          moveCards: "Mover cards",
          close: "Concluir",
          reopen: "Reabrir",
          cancel: "Cancelar",
          graphUpdate: "Editar grafo",
          nodesView: "Ver nós",
          publish: "Publicar",
          unpublish: "Despublicar",
          execute: "Executar",
          executionsView: "Execuções",
          settingsView: "Ver configurações",
          settingsUpdate: "Editar configurações",
          use: "Usar",
          showAll: "Ver todos",
          deleteTicket: "Excluir atendimento",
          transferConnection: "Transferir conexão",
          sessionManage: "Gerenciar sessão",
        },
      },
      tags: {
        title: "Tags",
        subtitle: "Organize clientes e atendimentos com etiquetas.",
        searchPlaceholder: "Pesquisar tags...",
        table: {
          name: "Nome",
          color: "Cor",
          actions: "Ações",
        },
        buttons: {
          add: "Adicionar tag",
        },
        toasts: {
          deleted: "Tag excluída com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage: "Tem certeza? Esta ação não pode ser desfeita.",
        },
        inputLabel: "Tags",
      },
      tagModal: {
        title: {
          add: "Adicionar tag",
          edit: "Editar tag",
        },
        form: {
          name: "Nome",
          nameHelper: "Rotulo curto para a tag.",
          color: "Cor",
          colorHelper: "Escolha uma cor de destaque.",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Tag salva com sucesso.",
      },
      ticketTagsModal: {
        title: "Tags do atendimento",
        inputLabel: "Selecione tags",
        buttons: {
          save: "Salvar",
          cancel: "Cancelar",
        },
      },
      contactLists: {
        title: "Listas",
        subtitle: "Crie segmentos para clientes e campanhas futuras.",
        table: {
          name: "Nome",
          type: "Tipo",
          description: "Descrição",
          actions: "Ações",
          manual: "Manual",
          dynamic: "Dinâmica",
        },
        buttons: {
          add: "Adicionar lista",
        },
        toasts: {
          deleted: "Lista excluída com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage: "Tem certeza? Esta ação não pode ser desfeita.",
        },
      },
      contactListModal: {
        title: {
          add: "Adicionar lista",
          edit: "Editar lista",
        },
        form: {
          name: "Nome",
          nameHelper: "Dê um nome claro para a lista.",
          description: "Descrição",
          type: "Tipo",
          manual: "Manual",
          dynamic: "Dinâmica",
          tags: "Tags",
          tagsPlaceholder: "Selecione tags",
          fields: "Campos customizados",
          fieldName: "Nome do campo",
          fieldOperator: "Operador",
          operatorEquals: "Igual",
          operatorContains: "Contem",
          fieldValue: "Valor do campo",
          addField: "Adicionar filtro",
          removeField: "Remover",
          noFields: "Nenhum filtro de campo ainda.",
          contacts: "Contatos",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Lista salva com sucesso.",
      },
      dialogs: {
        title: "Diálogos",
        subtitle: "Biblioteca de templates reutilizáveis para campanhas e automações.",
        searchPlaceholder: "Pesquisar diálogos...",
        table: {
          name: "Nome",
          status: "Status",
          updatedAt: "Atualizado",
          actions: "Ações",
          active: "Ativo",
          inactive: "Inativo",
        },
        buttons: {
          add: "Adicionar diálogo",
        },
        toasts: {
          deleted: "Diálogo excluído com sucesso.",
          duplicated: "Diálogo duplicado com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage: "Tem certeza? Esta ação não pode ser desfeita.",
        },
      },
      dialogModal: {
        title: {
          add: "Adicionar diálogo",
          edit: "Editar diálogo",
        },
        form: {
          name: "Nome",
          nameHelper: "Nome interno do diálogo.",
          description: "Descrição",
          template: "Template",
          templateHelper: "Use {{variavel}} para campos dinâmicos.",
          active: "Ativo",
          inactive: "Inativo",
          variables: "Variaveis",
          variableKey: "Chave",
          variableLabel: "Rotulo",
          variableExample: "Exemplo",
          addVariable: "Adicionar variável",
          removeVariable: "Remover",
          noVariables: "Nenhuma variável cadastrada.",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Diálogo salvo com sucesso.",
      },
      dialogPreview: {
        title: "Preview do diálogo",
        variables: "Variáveis",
        preview: "Preview",
        noVariables: "Nenhuma variável para preencher.",
        buttons: {
          close: "Fechar",
        },
      },
      campaigns: {
        title: "Campanhas",
        subtitle: "Planeje campanhas com listas, tags e diálogos.",
        searchPlaceholder: "Pesquisar campanhas...",
        table: {
          name: "Nome",
          dialog: "Diálogo",
          list: "Lista",
          tags: "Tags",
          status: "Status",
          scheduledAt: "Agendamento",
          lastStatusAt: "Atualizado",
          actions: "Ações",
        },
        buttons: {
          add: "Adicionar campanha",
        },
        toasts: {
          deleted: "Campanha excluída com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage: "Tem certeza? Esta ação não pode ser desfeita.",
        },
      },
      campaignModal: {
        title: {
          add: "Adicionar campanha",
          edit: "Editar campanha",
        },
        form: {
          name: "Nome",
          nameHelper: "Nome interno da campanha.",
          description: "Descrição",
          dialog: "Diálogo",
          dialogPlaceholder: "Selecione um diálogo",
          list: "Lista",
          listPlaceholder: "Selecione uma lista",
          tags: "Tags",
          tagsPlaceholder: "Selecione tags",
          status: "Status",
          scheduledAt: "Agendar para",
        },
        status: {
          draft: "Rascunho",
          scheduled: "Agendada",
          paused: "Pausada",
          completed: "Concluida",
          canceled: "Cancelada",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Campanha salva com sucesso.",
      },
      campaignReview: {
        title: "Revisão da campanha",
        loading: "Carregando revisão...",
        dialog: "Diálogo",
        list: "Lista",
        tags: "Tags",
        status: "Status",
        scheduledAt: "Agendamento",
        lastStatusAt: "Atualização",
        reviewedAt: "Revisado em",
        buttons: {
          close: "Fechar",
          confirm: "Confirmar revisão",
        },
        success: "Revisão registrada com sucesso.",
      },
      kanban: {
        title: "Kanban",
        subtitle: "Visualize atendimentos por etapas e prioridade.",
        searchPlaceholder: "Buscar tickets...",
        loading: "Carregando board...",
        emptyColumn: "Sem tickets nesta coluna.",
        buttons: {
          addColumn: "Adicionar coluna",
        },
        filters: {
          user: "Atendente",
          allUsers: "Todos",
        },
        card: {
          noQueue: "Sem setor",
          noUser: "Sem atendente",
        },
        columnModal: {
          title: {
            add: "Adicionar coluna",
            edit: "Editar coluna",
          },
          form: {
            name: "Nome",
            nameHelper: "Nome exibido no board.",
            key: "Chave",
            keyHelper: "Identificador único da coluna.",
            active: "Ativa",
            inactive: "Inativa",
          },
          buttons: {
            okAdd: "Adicionar",
            okEdit: "Salvar",
            cancel: "Cancelar",
          },
          success: "Coluna salva com sucesso.",
        },
      },
      informatives: {
        title: "Informativos",
        subtitle: "Comunicados internos e avisos segmentados.",
        searchPlaceholder: "Pesquisar informativos...",
        table: {
          title: "Título",
          audience: "Público",
          status: "Status",
          period: "Período",
          target: "Destino",
          actions: "Ações",
          active: "Ativo",
          inactive: "Inativo",
        },
        audience: {
          all: "Todos",
          contactList: "Lista",
          tags: "Tags",
        },
        filters: {
          status: "Status",
          audience: "Público",
          all: "Todos",
          active: "Ativos",
          inactive: "Inativos",
        },
        buttons: {
          add: "Adicionar informativo",
        },
        toasts: {
          deleted: "Informativo excluído com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage: "Tem certeza? Esta ação não pode ser desfeita.",
        },
      },
      informativeModal: {
        title: {
          add: "Adicionar informativo",
          edit: "Editar informativo",
        },
        form: {
          title: "Título",
          titleHelper: "Título curto do informativo.",
          content: "Mensagem",
          contentHelper: "Texto exibido no informativo.",
          active: "Ativo",
          inactive: "Inativo",
          audience: "Público",
          list: "Lista",
          tags: "Tags",
          tagsPlaceholder: "Selecione tags",
          startsAt: "Início",
          endsAt: "Fim",
        },
        audience: {
          all: "Todos",
          contactList: "Lista",
          tags: "Tags",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Informativo salvo com sucesso.",
      },
      integrations: {
        title: "Integrações",
        subtitle: "Conecte o SamaChat com CRMs, Make e Webhooks.",
        searchPlaceholder: "Pesquisar integrações...",
        table: {
          name: "Nome",
          type: "Tipo",
          status: "Status",
          actions: "Ações",
          active: "Ativo",
          inactive: "Inativo",
        },
        buttons: {
          add: "Adicionar integração",
        },
        toasts: {
          deleted: "Integração excluída com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage: "Tem certeza? Esta ação não pode ser desfeita.",
        },
      },
      integrationModal: {
        title: {
          add: "Adicionar integração",
          edit: "Editar integração",
        },
        form: {
          name: "Nome",
          nameHelper: "Nome interno da integração.",
          description: "Descrição",
          type: "Tipo",
          active: "Ativo",
          inactive: "Inativo",
          apiKey: "Chave da API",
        },
        type: {
          custom: "Custom",
          crm: "CRM",
          make: "Make",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Integração salva com sucesso.",
      },
      webhooks: {
        title: "Webhooks",
        subtitle: "Gerencie endpoints e eventos de entrega.",
        searchPlaceholder: "Pesquisar webhooks...",
        table: {
          name: "Nome",
          url: "URL",
          events: "Eventos",
          status: "Status",
          lastTestAt: "Último teste",
          actions: "Ações",
          active: "Ativo",
          inactive: "Inativo",
        },
        buttons: {
          add: "Adicionar webhook",
        },
        toasts: {
          deleted: "Webhook excluido com sucesso.",
          tested: "Teste enviado com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage: "Tem certeza? Esta ação não pode ser desfeita.",
        },
      },
      webhookModal: {
        title: {
          add: "Adicionar webhook",
          edit: "Editar webhook",
        },
        form: {
          name: "Nome",
          nameHelper: "Identificação interna do webhook.",
          url: "URL",
          urlHelper: "Endpoint público para receber eventos.",
          method: "Método",
          events: "Eventos",
          integration: "Integração",
          integrationPlaceholder: "Selecione uma integração",
          active: "Ativo",
          inactive: "Inativo",
          secret: "Segredo",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Webhook salvo com sucesso.",
      },
      webhookLogs: {
        title: "Logs do webhook",
        empty: "Nenhum log encontrado.",
        table: {
          event: "Evento",
          status: "Status",
          duration: "Duração",
          createdAt: "Criado em",
        },
        buttons: {
          close: "Fechar",
        },
      },
      webhookEvents: {
        "contact.created": "Contato criado",
        "contact.updated": "Contato atualizado",
        "contact.deleted": "Contato removido",
        "tag.created": "Tag criada",
        "tag.updated": "Tag atualizada",
        "tag.deleted": "Tag removida",
        "list.created": "Lista criada",
        "list.updated": "Lista atualizada",
        "list.deleted": "Lista removida",
        "dialog.created": "Diálogo criado",
        "dialog.updated": "Diálogo atualizado",
        "dialog.deleted": "Diálogo removido",
        "campaign.created": "Campanha criada",
        "campaign.updated": "Campanha atualizada",
        "campaign.deleted": "Campanha removida",
        "integration.created": "Integração criada",
        "integration.updated": "Integração atualizada",
        "integration.deleted": "Integração removida",
        "webhook.created": "Webhook criado",
        "webhook.updated": "Webhook atualizado",
        "webhook.deleted": "Webhook removido",
      },
      contactSelect: {
        searchPlaceholder: "Pesquisar contatos...",
        loadMore: "Carregar mais",
        empty: "Nenhum contato encontrado.",
      },
      quickAnswers: {
        title: "Atalhos",
        subtitle: "Padronize respostas rápidas e reduza o tempo de digitação.",
        table: {
          shortcut: "Atalho",
          message: "Mensagem",
          actions: "Ações",
        },
        buttons: {
          add: "Adicionar atalho",
        },
        toasts: {
          deleted: "Atalho excluído com sucesso.",
        },
        searchPlaceholder: "Pesquisar atalhos...",
        confirmationModal: {
          deleteTitle:
            "Você tem certeza que quer excluir este atalho: ",
          deleteMessage: "Esta ação não pode ser revertida.",
        },
      },
      users: {
        title: "Usuários",
        subtitle: "Gerencie acesso, setores e conexões padrão.",
        searchPlaceholder: "Pesquisar usuários...",
        table: {
          name: "Nome",
          email: "Email",
          profile: "Perfil de acesso",
          whatsapp: "Conexão Padrão",
          actions: "Ações",
        },
        profiles: {
          admin: "Administrador",
          user: "Atendente",
        },
        buttons: {
          add: "Adicionar usuário",
        },
        toasts: {
          deleted: "Usuário excluído com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage:
            "Todos os dados do usuário serão perdidos. Os tickets abertos deste usuário serão movidos para o setor.",
        },
      },
      settings: {
        success: "Configurações salvas com sucesso.",
        title: "Configurações",
        description: "Centralize preferências administrativas, IA, API Admin e integrações.",
        tabs: {
          general: "Geral",
          ia: "IA",
          apiAdmin: "API Admin",
          integrations: "Integrações",
        },
        apiToken: {
          label: "Token da API",
          helper: "Somente leitura. Use em integrações internas seguras.",
        },
        settings: {
          userCreation: {
            name: "Criação de usuário",
            description: "Define se novos usuários podem se cadastrar.",
            options: {
              enabled: "Ativado",
              disabled: "Desativado",
            },
          },
        },
      },
      apiAdmin: {
        title: "API Admin",
        description: "Token de API e integrações internas seguras.",
      },
      messagesList: {
        header: {
          assignedTo: "Atribuído à:",
          buttons: {
            return: "Retornar",
            resolve: "Resolver",
            reopen: "Reabrir",
            accept: "Aceitar",
          },
        },
      },
      messagesInput: {
        placeholderOpen: "Digite uma mensagem ou tecle ''/'' para utilizar as respostas rápidas cadastrada",
        placeholderClosed:
          "Reabra ou aceite esse ticket para enviar uma mensagem.",
        placeholderInternal:
          "Digite uma mensagem interna visível apenas para a equipe.",
        signMessage: "Assinar",
        internalModeLabel: "Interna",
        internalModeEnabled: "Mensagem interna ativa",
        internalModeDisabled: "Conversa com o cliente ativa",
        audioPermissionDenied:
          "O microfone está bloqueado neste navegador. Libere a permissão de microfone para gravar áudio.",
        audioUnsupported:
          "Este navegador não suporta gravação de áudio pelo SamaChat.",
        audioStartError:
          "Não foi possível iniciar a gravação de áudio agora.",
        audioSendError:
          "Não foi possível enviar o áudio gravado.",
      },
      contactDrawer: {
        header: "Dados do contato",
        notes: "Notas",
        buttons: {
          edit: "Editar contato",
          addNote: "Adicionar nota",
          editNote: "Editar nota",
        },
        extraInfo: "Outras informações",
        notesEmpty: "Nenhuma nota cadastrada para este contato.",
        extraInfoEmpty: "Nenhuma informação adicional cadastrada.",
      },
      ticketTasks: {
        title: "Tarefas",
        add: "Nova tarefa",
        empty: "Nenhuma tarefa vinculada.",
      },
      tasks: {
        title: "Tarefas",
        subtitle: "Acompanhe tarefas administrativas vinculadas a tickets e contatos.",
        searchPlaceholder: "Buscar tarefas",
        buttons: {
          add: "Nova tarefa",
          complete: "Concluir",
          reopen: "Reabrir",
        },
        status: {
          all: "Todas",
          open: "Abertas",
          completed: "Concluidas",
        },
        priority: {
          low: "Baixa",
          medium: "Media",
          high: "Alta",
        },
        filters: {
          assignee: "Responsável",
          assigneeAll: "Todos os responsáveis",
          priority: "Prioridade",
          priorityAll: "Todas as prioridades",
        },
        table: {
          title: "Título",
          status: "Status",
          priority: "Prioridade",
          dueAt: "Vencimento",
          assignee: "Responsável",
          ticket: "Ticket",
          contact: "Contato",
          actions: "Ações",
        },
        toasts: {
          deleted: "Tarefa removida com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Remover",
          deleteMessage: "Tem certeza que deseja remover esta tarefa?",
        },
      },
      taskModal: {
        title: {
          add: "Nova tarefa",
          edit: "Editar tarefa",
        },
        form: {
          title: "Título",
          description: "Descrição",
          status: "Status",
          priority: "Prioridade",
          dueAt: "Vencimento",
          assignee: "Responsável",
          assigneePlaceholder: "Sem responsável",
          ticketId: "Ticket",
          contactId: "Contato",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Tarefa salva com sucesso.",
      },
      schedules: {
        title: "Agendamentos",
        subtitle: "Gerencie mensagens e lembretes programados.",
        searchPlaceholder: "Buscar agendamentos",
        buttons: {
          add: "Novo agendamento",
          cancel: "Cancelar",
          reopen: "Reabrir",
        },
        status: {
          all: "Todos",
          pending: "Pendentes",
          sent: "Enviados",
          canceled: "Cancelados",
          failed: "Falharam",
        },
        filters: {
          assignee: "Responsável",
          assigneeAll: "Todos os responsáveis",
          dateFrom: "De",
          dateTo: "Até",
        },
        table: {
          body: "Mensagem",
          status: "Status",
          scheduledAt: "Agendado para",
          assignee: "Responsável",
          ticket: "Ticket",
          contact: "Contato",
          actions: "Ações",
        },
        toasts: {
          deleted: "Agendamento removido com sucesso.",
          canceled: "Agendamento cancelado.",
          reopened: "Agendamento reaberto.",
        },
        confirmationModal: {
          deleteTitle: "Remover",
          deleteMessage: "Tem certeza que deseja remover este agendamento?",
        },
      },
      scheduleModal: {
        title: {
          add: "Novo agendamento",
          edit: "Editar agendamento",
        },
        form: {
          body: "Mensagem",
          scheduledAt: "Agendamento",
          status: "Status",
          assignee: "Responsável",
          assigneePlaceholder: "Sem responsável",
          ticketId: "Ticket",
          contactId: "Contato",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Agendamento salvo com sucesso.",
      },
      flows: {
        title: "Fluxos",
        subtitle: "Desenhe fluxos de atendimento automatizado.",
        searchPlaceholder: "Buscar fluxos",
        buttons: {
          add: "Novo fluxo",
        },
        status: {
          draft: "Rascunho",
          published: "Publicado",
          active: "Ativo",
          inactive: "Inativo",
        },
        table: {
          name: "Nome",
          status: "Status",
          active: "Ativo",
          updatedAt: "Atualizado",
          actions: "Ações",
        },
        toasts: {
          deleted: "Fluxo removido com sucesso.",
          published: "Fluxo publicado.",
          unpublished: "Fluxo movido para rascunho.",
        },
        confirmationModal: {
          deleteTitle: "Remover",
          deleteMessage: "Tem certeza que deseja remover este fluxo?",
        },
      },
      openai: {
        title: "OpenAI / IA",
        settings: {
          title: "Configuração",
          subtitle: "Controle chave, modelo e parâmetros básicos.",
          apiKey: "Chave da API",
          apiKeyStored: "Chave salva",
          clearKey: "Remover chave",
          active: "Ativo",
          model: "Modelo",
          temperature: "Temperatura",
          topP: "Top P",
          maxTokens: "Max tokens",
          presencePenalty: "Presence penalty",
          frequencyPenalty: "Frequency penalty",
          maxRequestsPerDay: "Limite por dia",
          maxRequestsPerHour: "Limite por hora",
          systemPrompt: "Prompt do sistema",
          suggestionPrompt: "Prompt de sugestão",
          rewritePrompt: "Prompt de reformulação",
          summaryPrompt: "Prompt de resumo",
          classificationPrompt: "Prompt de classificação",
          autoReplyEnabled: "Resposta automática (isolada)",
          autoReplyPrompt: "Prompt da resposta automática",
          save: "Salvar",
          test: "Testar conexão",
          saved: "Configuração salva.",
          testSuccess: "Conexão OK."
        },
        sandbox: {
          title: "Laboratório de IA",
          subtitle: "Teste sugestões, resumo e classificação.",
          text: "Texto base",
          ticketId: "Ticket",
          suggest: "Sugestão",
          rewrite: "Melhorar texto",
          summarize: "Resumo",
          classify: "Classificar",
          result: "Resultado",
          emptyText: "Informe um texto para continuar.",
          ticketRequired: "Informe o ticket para resumir."
        },
        logs: {
          title: "Logs de uso",
          refresh: "Atualizar",
          empty: "Nenhum log encontrado.",
          columns: {
            action: "Ação",
            status: "Status",
            model: "Modelo",
            tokens: "Tokens",
            duration: "Duração",
            createdAt: "Data"
          }
        },
        ticket: {
          title: "IA do ticket",
          baseText: "Texto base",
          useLastMessage: "Usar última mensagem",
          suggest: "Sugerir resposta",
          rewrite: "Melhorar texto",
          summarize: "Resumir ticket",
          classify: "Classificar",
          suggestion: "Sugestão",
          rewriteLabel: "Reformulação",
          summary: "Resumo",
          classification: "Classificação",
          emptyText: "Digite um texto para usar a IA.",
          copySuccess: "Copiado."
        }
      },
      flowModal: {
        title: {
          add: "Novo fluxo",
          edit: "Editar fluxo",
        },
        form: {
          name: "Nome",
          description: "Descrição",
          isActive: "Ativo",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Fluxo salvo com sucesso.",
      },
      flowBuilder: {
        title: "Construtor de Fluxos",
        buttons: {
          addNode: "Adicionar nó",
          addEdge: "Adicionar conexão",
          save: "Salvar",
          test: "Testar",
          execute: "Executar",
        },
        nodes: {
          title: "Nós",
          empty: "Nenhum nó cadastrado.",
          edit: "Editar",
          remove: "Remover",
          modalTitle: "Editar nó",
          type: "Tipo",
          name: "Nome",
          message: "Mensagem",
          mediaUpload: "Enviar arquivo do nó",
          mediaUploading: "Enviando arquivo...",
          mediaFile: "Arquivo configurado",
          mediaNotSelected: "Nenhum arquivo selecionado.",
          mediaPreview: "Visualizar arquivo",
          mediaCaption: "Legenda ou texto de apoio",
          queue: "Setor",
          queuePlaceholder: "Selecione um setor",
          decisionHint: "Observação",
          summaryEmpty: "Sem conteúdo configurado.",
          summaryWaitInput: "Aguarda a resposta do cliente para seguir.",
          cancel: "Cancelar",
          save: "Salvar",
          typeHelp: {
            start: "Use apenas um início para marcar o ponto de entrada do fluxo.",
            message: "Envie exatamente o texto que o cliente deve receber nesse passo.",
            media: "Envie áudio, imagem, vídeo ou documento já aprovado por vocês para esse passo.",
            decision: "Esse nó pausa o fluxo e espera a resposta do cliente para decidir o próximo caminho.",
            queue: "Move o atendimento para um setor e continua o fluxo se houver próximo passo.",
            handoff: "Entrega a conversa para o setor escolhido e encerra a automação.",
            end: "Finaliza o fluxo sem transferir para outro setor."
          },
        },
        edges: {
          title: "Conexões",
          empty: "Nenhuma conexão cadastrada.",
          source: "Origem",
          target: "Destino",
          condition: "Condição",
          conditionValue: "Valor",
          conditionPlaceholder: "Selecione",
          priority: "Prioridade",
          remove: "Remover",
        },
        triggers: {
          title: "Entradas",
          empty: "Nenhuma entrada configurada.",
          add: "Adicionar entrada",
          type: "Tipo",
          value: "Valor",
          valuePlaceholder: "Selecione",
          status: "Status",
          active: "Ativa",
          inactive: "Inativa",
          remove: "Remover",
        },
        nodeTypes: {
          start: "Início",
          message: "Mensagem",
          media: "Mídia",
          decision: "Decisão",
          queue: "Setor",
          handoff: "Handoff",
          end: "Fim",
        },
        edgeConditions: {
          always: "Sempre",
          keyword: "Palavra-chave",
          tag: "Tag",
          queue: "Setor",
        },
        triggerTypes: {
          always: "Sempre",
          keyword: "Palavra-chave",
          tag: "Tag",
          queue: "Setor",
        },
        guide: {
          title: "Como montar um agente guiado",
          subtitle: "Monte o fluxo em blocos simples para o agente responder apenas o que foi definido por você.",
          step1Title: "Comece pelo roteiro",
          step1Text: "Crie um nó de início, depois as mensagens ou mídias que o cliente deve receber primeiro.",
          step2Title: "Abra escolhas controladas",
          step2Text: "Use um nó de decisão para esperar a resposta do cliente e conexões com palavra-chave para cada opção.",
          step3Title: "Defina o encerramento",
          step3Text: "Finalize com fim, troca de setor ou handoff para um atendente humano quando necessário."
        },
        execution: {
          title: "Execução",
          empty: "Nenhuma execução registrada.",
          status: "Status",
          id: "Execução",
          noLogs: "Sem logs disponíveis.",
        },
        toasts: {
          saved: "Fluxo salvo.",
          tested: "Fluxo testado.",
          executed: "Fluxo executado.",
          mediaUploaded: "Arquivo do fluxo enviado.",
        },
        errors: {
          needTwoNodes: "Crie ao menos dois nós para conectar.",
          singleStart: "O fluxo deve ter apenas um nó de início.",
          mediaRequired: "Selecione um arquivo antes de salvar o nó de mídia.",
        },
      },
      files: {
        title: "Lista de arquivos",
        subtitle: "Centralize anexos e arquivos já existentes no sistema.",
        searchPlaceholder: "Buscar arquivos",
        filters: {
          type: "Tipo",
          typeAll: "Todos",
          typeImage: "Imagem",
          typeVideo: "Vídeo",
          typeAudio: "Áudio",
          typeDocument: "Documento",
          ticket: "Ticket",
          contact: "Contato",
          dateFrom: "De",
          dateTo: "Até",
        },
        table: {
          name: "Arquivo",
          type: "Tipo",
          origin: "Origem",
          createdAt: "Data",
          ticket: "Ticket",
          contact: "Contato",
          actions: "Ações",
        },
        origin: {
          sent: "Enviado",
          received: "Recebido",
          unknown: "Desconhecido",
        },
        actions: {
          contact: "Contato",
        },
      },
      ticketOptionsMenu: {
        delete: "Deletar",
        transfer: "Transferir",
        followUp: "Follow up",
        markAsUnread: "Marcar como não lido",
        reopen: "Reabrir",
        confirmationModal: {
          title: "Deletar o ticket do contato",
          message:
            "Atenção! Todas as mensagens relacionadas ao ticket serão perdidas.",
        },
        buttons: {
          delete: "Excluir",
          cancel: "Cancelar",
        },
      },
      confirmationModal: {
        buttons: {
          confirm: "Ok",
          cancel: "Cancelar",
        },
      },
      messageOptionsMenu: {
        delete: "Deletar",
        reply: "Responder",
        confirmationModal: {
          title: "Apagar mensagem?",
          message: "Esta ação não pode ser revertida.",
        },
      },
      backendErrors: {
        ERR_NO_OTHER_WHATSAPP: "Deve haver pelo menos um WhatsApp padrão.",
        ERR_NO_DEF_WAPP_FOUND:
          "Nenhum WhatsApp padrão encontrado. Verifique a página de conexões.",
        ERR_WAPP_NOT_INITIALIZED:
          "Esta sessão do WhatsApp não foi inicializada. Verifique a página de conexões.",
        ERR_WAPP_CHECK_CONTACT:
          "Não foi possível verificar o contato do WhatsApp. Verifique a página de conexões",
        ERR_WAPP_INVALID_CONTACT: "Este não é um número de Whatsapp válido.",
        ERR_WAPP_DOWNLOAD_MEDIA:
          "Não foi possível baixar mídia do WhatsApp. Verifique a página de conexões.",
        ERR_INVALID_CREDENTIALS:
          "Erro de autenticação. Por favor, tente novamente.",
        ERR_SENDING_WAPP_MSG:
          "Erro ao enviar mensagem do WhatsApp. Verifique a página de conexões.",
        ERR_DELETE_WAPP_MSG: "Não foi possível excluir a mensagem do WhatsApp.",
        ERR_OTHER_OPEN_TICKET: "Já existe um tíquete aberto para este contato.",
        ERR_SESSION_EXPIRED: "Sessão expirada. Por favor entre.",
        ERR_USER_CREATION_DISABLED:
          "A criação do usuário foi desabilitada pelo administrador.",
        ERR_NO_PERMISSION: "Você não tem permissão para acessar este recurso.",
        ERR_DUPLICATED_CONTACT: "Já existe um contato com este número.",
        ERR_NO_SETTING_FOUND: "Nenhuma configuração encontrada com este ID.",
        ERR_NO_CONTACT_FOUND: "Nenhum contato encontrado com este ID.",
        ERR_NO_TICKET_FOUND: "Nenhum tíquete encontrado com este ID.",
        ERR_NO_TASK_FOUND: "Nenhuma tarefa encontrada com este ID.",
        ERR_NO_SCHEDULE_FOUND: "Nenhum agendamento encontrado com este ID.",
        ERR_FLOW_NOT_FOUND: "Nenhum fluxo encontrado com este ID.",
        ERR_FLOW_NAME_REQUIRED: "O nome do fluxo é obrigatório.",
        ERR_FLOW_EXECUTION_NOT_FOUND: "Nenhuma execução encontrada com este ID.",
        ERR_NO_USER_FOUND: "Nenhum usuário encontrado com este ID.",
        ERR_NO_WAPP_FOUND: "Nenhum WhatsApp encontrado com este ID.",
        ERR_CREATING_MESSAGE: "Erro ao criar mensagem no banco de dados.",
        ERR_CREATING_TICKET: "Erro ao criar tíquete no banco de dados.",
        ERR_TASK_TITLE_REQUIRED: "O título da tarefa é obrigatório.",
        ERR_SCHEDULE_BODY_REQUIRED: "A mensagem do agendamento é obrigatória.",
        ERR_SCHEDULE_DATE_REQUIRED: "A data do agendamento é obrigatória.",
        ERR_SCHEDULE_DATE_INVALID: "A data do agendamento é inválida.",
        ERR_FETCH_WAPP_MSG:
          "Erro ao buscar a mensagem no WhatsApp, talvez ela seja muito antiga.",
        ERR_QUEUE_COLOR_ALREADY_EXISTS:
          "Esta cor já está em uso, escolha outra.",
        ERR_WAPP_GREETING_REQUIRED:
          "A mensagem de saudação é obrigatório quando há mais de um setor.",
        ERR_DUPLICATED_DIALOG: "Já existe um diálogo com esse nome.",
        ERR_NO_DIALOG_FOUND: "Nenhum diálogo encontrado com este ID.",
        ERR_DUPLICATED_CAMPAIGN: "Já existe uma campanha com esse nome.",
        ERR_NO_CAMPAIGN_FOUND: "Nenhuma campanha encontrada com este ID.",
        ERR_CAMPAIGN_SCHEDULE_REQUIRED: "Agendamento obrigatório para campanhas agendadas.",
        ERR_CAMPAIGN_SCHEDULE_INVALID: "Data de agendamento inválida.",
        ERR_INFORMATIVE_LIST_REQUIRED: "Lista obrigatória para informativo por lista.",
        ERR_INFORMATIVE_TAGS_REQUIRED: "Tags obrigatórias para informativo por tags.",
        ERR_INFORMATIVE_DATE_INVALID: "Data do informativo inválida.",
        ERR_INFORMATIVE_DATE_RANGE: "Período do informativo inválido.",
        ERR_SCHEDULE_DUPLICATED: "Já existe um agendamento pendente com esses dados.",
        ERR_INTEGRATION_TYPE_INVALID: "Tipo de integração inválido.",
        ERR_WEBHOOK_URL_INVALID: "URL do webhook inválida.",
        ERR_WEBHOOK_METHOD_INVALID: "Método do webhook inválido.",
        ERR_FLOW_ALREADY_RUNNING: "Fluxo já em execução.",
        ERR_FLOW_EMPTY: "Fluxo sem nós.",
        ERR_FLOW_INVALID_NODES: "Fluxo precisa de início e fim.",
        ERR_FLOW_INVALID_EDGES: "Fluxo possui conexões inválidas.",
        ERR_DUPLICATED_INTEGRATION: "Já existe uma integração com esse nome.",
        ERR_NO_INTEGRATION_FOUND: "Nenhuma integração encontrada com este ID.",
        ERR_DUPLICATED_WEBHOOK: "Já existe um webhook com esse nome.",
        ERR_NO_WEBHOOK_FOUND: "Nenhum webhook encontrado com este ID.",
        ERR_WEBHOOK_TEST_FAILED: "Falha ao testar o webhook.",
        ERR_OPENAI_INACTIVE: "OpenAI está desativado.",
        ERR_OPENAI_NO_API_KEY: "Chave da OpenAI não configurada.",
        ERR_OPENAI_REQUEST_FAILED: "Falha ao consultar OpenAI.",
        ERR_OPENAI_UNAUTHORIZED: "Chave da OpenAI inválida ou sem permissão.",
        ERR_OPENAI_RATE_LIMIT: "OpenAI bloqueou por excesso de requisições.",
        ERR_OPENAI_BAD_REQUEST: "Requisição inválida para a OpenAI.",
        ERR_OPENAI_MODEL_NOT_FOUND: "Modelo da OpenAI não encontrado.",
        ERR_OPENAI_UPSTREAM: "Falha temporaria na OpenAI. Tente novamente.",
        ERR_OPENAI_LIMIT_HOUR: "Limite de IA por hora atingido.",
        ERR_OPENAI_LIMIT_DAY: "Limite de IA por dia atingido.",
      },
    },
  },
};

export { messages };
