const SAFE_ACCENT_MAP = Object.freeze({
  mae: "mãe",
  maes: "mães",
  voce: "você",
  voces: "vocês",
  nao: "não",
  tambem: "também",
  amanha: "amanhã",
  irmao: "irmão",
  irma: "irmã",
  irmaos: "irmãos",
  irmas: "irmãs",
  coracao: "coração",
  coracoes: "corações",
  informacao: "informação",
  informacoes: "informações",
  atencao: "atenção",
  reuniao: "reunião",
  reunioes: "reuniões",
  situacao: "situação",
  situacoes: "situações",
  solucao: "solução",
  solucoes: "soluções",
  condicao: "condição",
  condicoes: "condições",
  opcao: "opção",
  opcoes: "opções",
  questao: "questão",
  questoes: "questões",
  razao: "razão",
  razoes: "razões",
  entao: "então",
  ja: "já",
  sera: "será",
  serao: "serão",
  sao: "são",
  estao: "estão",
  estavamos: "estávamos",
  estariamos: "estaríamos",
  eramos: "éramos",
  teriamos: "teríamos",
  podiamos: "podíamos",
  deveriamos: "deveríamos",
  fariamos: "faríamos",
  iriamos: "iríamos",
  tinhamos: "tínhamos",
  haviamos: "havíamos",
  possivel: "possível",
  impossivel: "impossível",
  facil: "fácil",
  dificil: "difícil",
  rapido: "rápido",
  rapida: "rápida",
  proximo: "próximo",
  proximos: "próximos",
  proxima: "próxima",
  proximas: "próximas",
  ultimo: "último",
  ultimos: "últimos",
  ultima: "última",
  ultimas: "últimas",
  numero: "número",
  numeros: "números",
  codigo: "código",
  codigos: "códigos",
  pagina: "página",
  paginas: "páginas",
  usuario: "usuário",
  usuarios: "usuários",
  horario: "horário",
  horarios: "horários",
  necessario: "necessário",
  necessaria: "necessária",
  necessarios: "necessários",
  necessarias: "necessárias"
});

const FIRST_PERSON_PLURAL_VERBS = new Set([
  "vamos",
  "somos",
  "temos",
  "estamos",
  "fomos",
  "iremos",
  "queremos",
  "precisamos",
  "podemos",
  "devemos",
  "conseguimos",
  "fazemos",
  "falamos",
  "trabalhamos",
  "saimos",
  "chegamos",
  "voltamos",
  "usamos",
  "enviamos",
  "recebemos",
  "resolvemos",
  "atendemos",
  "continuamos",
  "comecamos",
  "terminamos",
  "marcamos",
  "combinamos",
  "achamos",
  "gostamos",
  "pensamos",
  "sabemos",
  "vemos",
  "vimos",
  "compramos",
  "vendemos",
  "pagamos",
  "aguardamos"
]);

const SUBJECT_PRONOUNS = new Set([
  "ele",
  "ela",
  "voce",
  "isso",
  "isto",
  "aquilo",
  "quem"
]);

const PLURAL_SUBJECT_PRONOUNS = new Set([
  "eles",
  "elas",
  "voces"
]);

const PREDICATE_WORDS = new Set([
  "aqui",
  "ali",
  "la",
  "bem",
  "bom",
  "boa",
  "certo",
  "certa",
  "pronto",
  "pronta",
  "disponivel",
  "aberto",
  "aberta",
  "fechado",
  "fechada",
  "funcionando",
  "acontecendo",
  "tudo",
  "ok",
  "correto",
  "correta"
]);

const WORD_REGEX = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;

export const stripNativeDiacritics = value =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeWord = value =>
  stripNativeDiacritics(value).toLowerCase();

const preserveCharacterCase = (original, corrected) => {
  const sourceChars = Array.from(original);
  const targetChars = Array.from(corrected);

  if (sourceChars.length !== targetChars.length) {
    return original;
  }

  return targetChars
    .map((char, index) => {
      const source = sourceChars[index];

      if (
        source.toUpperCase() === source &&
        source.toLowerCase() !== source
      ) {
        return char.toUpperCase();
      }

      return char.toLowerCase();
    })
    .join("");
};

const resolveContextualCandidate = (tokens, index) => {
  const current = normalizeWord(tokens[index].value);
  const previous =
    index > 0 ? normalizeWord(tokens[index - 1].value) : "";
  const next =
    index + 1 < tokens.length
      ? normalizeWord(tokens[index + 1].value)
      : "";

  if (
    current === "nos" &&
    (
      FIRST_PERSON_PLURAL_VERBS.has(next) ||
      ["dois", "duas", "mesmos", "mesmas"].includes(next)
    )
  ) {
    return "nós";
  }

  if (
    current === "esta" &&
    (
      SUBJECT_PRONOUNS.has(previous) ||
      PREDICATE_WORDS.has(next) ||
      /(?:ando|endo|indo)$/.test(next)
    )
  ) {
    return "está";
  }

  if (
    current === "tem" &&
    PLURAL_SUBJECT_PRONOUNS.has(previous)
  ) {
    return "têm";
  }

  if (
    current === "vem" &&
    PLURAL_SUBJECT_PRONOUNS.has(previous)
  ) {
    return "vêm";
  }

  if (
    current === "e" &&
    SUBJECT_PRONOUNS.has(previous) &&
    PREDICATE_WORDS.has(next)
  ) {
    return "é";
  }

  return null;
};

const collectTokens = text => {
  const tokens = [];
  const regex = new RegExp(WORD_REGEX.source, "g");
  let match;

  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tokens;
};

export const isNativeAccentOnlyCorrection = (
  original,
  candidate
) => {
  if (
    typeof original !== "string" ||
    typeof candidate !== "string"
  ) {
    return false;
  }

  return (
    stripNativeDiacritics(original) ===
    stripNativeDiacritics(candidate)
  );
};

const correctNativeText = text => {
  if (typeof text !== "string" || !text) {
    return text;
  }

  const tokens = collectTokens(text);

  if (!tokens.length) {
    return text;
  }

  let cursor = 0;
  let corrected = "";

  tokens.forEach((token, index) => {
    corrected += text.slice(cursor, token.start);

    const normalized = normalizeWord(token.value);

    const contextual =
      resolveContextualCandidate(tokens, index);

    const dictionary =
      SAFE_ACCENT_MAP[normalized] || null;

    const candidate =
      contextual || dictionary;

    corrected += candidate
      ? preserveCharacterCase(token.value, candidate)
      : token.value;

    cursor = token.end;
  });

  corrected += text.slice(cursor);

  if (!isNativeAccentOnlyCorrection(text, corrected)) {
    return text;
  }

  return corrected;
};

export default correctNativeText;