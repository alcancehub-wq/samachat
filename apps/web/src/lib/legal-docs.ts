export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export const legalMeta = {
  companyName: 'Samacon Consultoria e Assessoria em Consorcios',
  companyCnpj: '42.026.466/0001-06',
  website: 'www.samacon.com.br',
  phone: '(11) 95927-1998',
  emailLgpd: 'lgpd@samacon.com.br',
  emailPrivacy: 'privacidade@samacon.com.br',
  termsLastUpdate: 'outubro de 2025',
  privacyLastUpdate: 'outubro de 2025',
};

export const termsSections: LegalSection[] = [
  {
    heading: '1. Objeto',
    paragraphs: [
      'Estes Termos de Uso regulam a utilizacao da plataforma Samachat e dos canais digitais da Samacon, voltados a informacoes, assessoria e consultoria especializadas em consorcios imobiliarios e patrimoniais.',
      'A Samacon nao e uma administradora de consorcios, atuando exclusivamente na intermedicao, orientacao e acompanhamento em parceria com administradoras autorizadas pelo Banco Central do Brasil.',
    ],
  },
  {
    heading: '2. Uso da plataforma',
    paragraphs: [
      'O usuario compromete-se a fornecer informacoes verdadeiras e atualizadas nos formularios e cadastros.',
      'A plataforma deve ser utilizada apenas para fins licitos e relacionados aos servicos de assessoria.',
      'Nao e permitido reproduzir, copiar, comercializar ou distribuir conteudos sem autorizacao previa da Samacon.',
    ],
  },
  {
    heading: '3. Responsabilidade',
    paragraphs: [
      'A Samacon atua como assessoria consultiva e nao se responsabiliza por decisoes financeiras tomadas sem orientacao direta de um consultor Samacon.',
      'Nao nos responsabilizamos por falhas de conexao, indisponibilidade temporaria da plataforma ou conteudos de sites externos acessados por links.',
      'As informacoes apresentadas tem carater educativo e informativo e nao substituem a analise personalizada.',
    ],
  },
  {
    heading: '4. Direitos autorais',
    paragraphs: [
      'Todo o conteudo da plataforma e de propriedade da Samacon e protegido pela legislacao de direitos autorais.',
      'Qualquer reproducao sem autorizacao previa e proibida.',
    ],
  },
  {
    heading: '5. Protecao de dados',
    paragraphs: [
      'O uso da plataforma implica a aceitacao da Politica de Privacidade.',
      'A coleta e o tratamento de dados pessoais seguem a Lei no 13.709/2018 (LGPD).',
    ],
  },
  {
    heading: '6. Alteracoes dos termos',
    paragraphs: [
      'A Samacon podera revisar e atualizar estes Termos a qualquer momento.',
      'As alteracoes entram em vigor imediatamente apos publicacao na plataforma.',
    ],
  },
  {
    heading: '7. Contato',
    paragraphs: [
      'Para duvidas sobre os Termos de Uso, entre em contato pelo email lgpd@samacon.com.br ou pelo telefone (11) 95927-1998.',
      'Acesse tambem nosso site em www.samacon.com.br.',
    ],
  },
];

export const privacySections: LegalSection[] = [
  {
    heading: '1. Coleta de informacoes',
    paragraphs: [
      'Coletamos dados pessoais de forma transparente por meio de formularios de contato e simulacao (nome, email, telefone, WhatsApp, cidade, valor desejado e interesse de consorcio).',
      'Tambem coletamos mensagens e comunicacoes via WhatsApp, email ou chat.',
      'Cookies e dados de navegacao podem ser usados para melhorar sua experiencia e campanhas publicitarias.',
      'Essas informacoes sao usadas para atendimento, assessoria, envio de propostas, conteudos educativos e informacoes comerciais.',
    ],
  },
  {
    heading: '2. Uso das informacoes',
    paragraphs: [
      'A Samacon utiliza os dados para entrar em contato por email, telefone ou WhatsApp.',
      'Os dados sao usados para elaborar simulacoes, propostas e orientacoes personalizadas.',
      'Podemos enviar comunicacoes sobre promocoes, eventos ou conteudos de interesse.',
      'Tambem utilizamos dados para cumprir obrigacoes legais e contratuais.',
    ],
  },
  {
    heading: '3. Compartilhamento de dados',
    paragraphs: [
      'Seus dados nao sao vendidos, trocados ou divulgados sem autorizacao.',
      'Podemos compartilhar com administradoras de consorcio parceiras autorizadas pelo Banco Central do Brasil, quando necessario para concluir proposta ou contratacao.',
      'Podemos compartilhar com plataformas de automacao e CRM, exclusivamente para fins operacionais de atendimento.',
      'Todo compartilhamento ocorre com controle de acesso, confidencialidade e seguranca.',
    ],
  },
  {
    heading: '4. Seguranca e armazenamento',
    paragraphs: [
      'Adotamos medidas tecnicas e administrativas para proteger seus dados contra acessos nao autorizados, perdas, alteracoes ou vazamentos.',
      'Os dados sao armazenados em servidores seguros e mantidos apenas pelo tempo necessario para cumprir as finalidades desta politica.',
    ],
  },
  {
    heading: '5. Direitos do titular',
    paragraphs: [
      'Voce pode acessar, corrigir ou excluir seus dados pessoais.',
      'Pode solicitar portabilidade e revogar consentimento a qualquer momento.',
      'Para exercer seus direitos, entre em contato pelo email privacidade@samacon.com.br.',
    ],
  },
  {
    heading: '6. Cookies e tecnologias de rastreamento',
    paragraphs: [
      'Utilizamos cookies para melhorar a performance do site, personalizar a navegacao e analisar metricas.',
      'Voce pode desativar cookies nas configuracoes do navegador.',
    ],
  },
  {
    heading: '7. Alteracoes desta politica',
    paragraphs: [
      'A Samacon pode atualizar esta Politica periodicamente.',
      'Recomendamos que voce consulte esta pagina para se manter informado sobre alteracoes.',
    ],
  },
  {
    heading: '8. Contato',
    paragraphs: [
      'Em caso de duvidas sobre esta politica ou sobre o uso de dados pessoais, entre em contato:',
      'lgpd@samacon.com.br | (11) 95927-1998 | www.samacon.com.br',
    ],
  },
];
