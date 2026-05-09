import ResolveMessageVariablesService from "../../../services/Variables/ResolveMessageVariablesService";

describe("ResolveMessageVariablesService", () => {
  it("should replace supported variables with ticket and contact context", () => {
    const result = ResolveMessageVariablesService({
      template:
        "{{bom_dia}} {{nome}}, seu telefone é {{telefone}}. Atendimento #{{ticket_id}} com {{responsavel}} na fila {{fila}} em {{data_atual}} às {{hora_atual}}.",
      contact: {
        name: "ANA SAMACON",
        number: "5511999999999",
        email: "ana@samacon.com"
      },
      ticket: {
        id: 111,
        user: { name: "Dionatan" },
        queue: { name: "Comercial" }
      },
      now: new Date("2026-05-08T16:20:00-03:00")
    });

    expect(result.text).toBe(
      "Bom dia Ana, seu telefone é 5511999999999. Atendimento #111 com Dionatan na fila Comercial em 08/05/2026 às 16:20."
    );
    expect(result.foundVariables).toEqual([
      "bom_dia",
      "nome",
      "telefone",
      "ticket_id",
      "responsavel",
      "fila",
      "data_atual",
      "hora_atual"
    ]);
    expect(result.unresolvedVariables).toEqual([]);
  });

  it("should resolve supported variables with empty string when data is missing", () => {
    const result = ResolveMessageVariablesService({
      template:
        "{{nome}}|{{telefone}}|{{email}}|{{ticket_id}}|{{responsavel}}|{{fila}}|{{boa_tarde}}|{{boa_noite}}",
      contact: {
        name: null,
        number: null,
        email: null
      },
      ticket: {
        id: undefined,
        user: { name: null },
        queue: { name: null }
      },
      now: new Date("2026-05-08T16:20:00-03:00")
    });

    expect(result.text).toBe("||||||Boa tarde|Boa noite");
    expect(result.unresolvedVariables).toEqual([]);
  });

  it("should report unknown variables as unresolved and replace them safely", () => {
    const result = ResolveMessageVariablesService({
      template: "Oi {{nome}} {{variavel_inexistente}} {{custom}}",
      contact: { name: "cArLoS silva" },
      extraData: { custom: "VIP" }
    });

    expect(result.text).toBe("Oi Carlos  VIP");
    expect(result.foundVariables).toEqual(["nome", "variavel_inexistente", "custom"]);
    expect(result.unresolvedVariables).toEqual(["variavel_inexistente"]);
  });

  it("should keep the legacy {{name}} alias using the same first-name formatting", () => {
    const result = ResolveMessageVariablesService({
      template: "Hello {{name}}",
      contact: { name: "mARIA da conceicao" }
    });

    expect(result.text).toBe("Hello Maria");
    expect(result.unresolvedVariables).toEqual([]);
  });
});