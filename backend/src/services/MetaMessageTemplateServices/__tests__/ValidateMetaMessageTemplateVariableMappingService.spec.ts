import ValidateMetaMessageTemplateVariableMappingService from "../ValidateMetaMessageTemplateVariableMappingService";

const template = {
  name: "teste_variaveis",
  language: "pt_BR",
  components: [
    {
      type: "BODY",
      text: "Olá {{1}}, telefone {{2}}"
    }
  ]
};

describe("ValidateMetaMessageTemplateVariableMappingService", () => {
  it("accepts a complete supported mapping", () => {
    const result =
      ValidateMetaMessageTemplateVariableMappingService({
        template,
        variableMapping: [
          {
            componentType: "BODY",
            position: 1,
            variableKey: "nome"
          },
          {
            componentType: "BODY",
            position: 2,
            variableKey: "telefone"
          }
        ],
        requireComplete: true
      });

    expect(result).toEqual([
      {
        componentType: "BODY",
        position: 1,
        variableKey: "nome"
      },
      {
        componentType: "BODY",
        position: 2,
        variableKey: "telefone"
      }
    ]);
  });

  it("rejects an unsupported SamaChat variable", () => {
    expect(() =>
      ValidateMetaMessageTemplateVariableMappingService({
        template,
        variableMapping: [
          {
            componentType: "BODY",
            position: 1,
            variableKey: "variavel_inexistente"
          },
          {
            componentType: "BODY",
            position: 2,
            variableKey: "telefone"
          }
        ],
        requireComplete: true
      })
    ).toThrow(
      "ERR_META_TEMPLATE_VARIABLE_MAPPING_UNSUPPORTED:variavel_inexistente"
    );
  });

  it("fails closed when the mapping is incomplete", () => {
    expect(() =>
      ValidateMetaMessageTemplateVariableMappingService({
        template,
        variableMapping: [
          {
            componentType: "BODY",
            position: 1,
            variableKey: "nome"
          }
        ],
        requireComplete: true
      })
    ).toThrow(
      "ERR_META_TEMPLATE_VARIABLE_MAPPING_INCOMPLETE:BODY:2"
    );
  });

  it("rejects a mapping for a position not present in the template", () => {
    expect(() =>
      ValidateMetaMessageTemplateVariableMappingService({
        template,
        variableMapping: [
          {
            componentType: "BODY",
            position: 1,
            variableKey: "nome"
          },
          {
            componentType: "BODY",
            position: 2,
            variableKey: "telefone"
          },
          {
            componentType: "BODY",
            position: 3,
            variableKey: "email"
          }
        ],
        requireComplete: true
      })
    ).toThrow(
      "ERR_META_TEMPLATE_VARIABLE_MAPPING_POSITION_NOT_FOUND:BODY:3"
    );
  });

  it("rejects duplicate mappings for the same template position", () => {
    expect(() =>
      ValidateMetaMessageTemplateVariableMappingService({
        template,
        variableMapping: [
          {
            componentType: "BODY",
            position: 1,
            variableKey: "nome"
          },
          {
            componentType: "BODY",
            position: 1,
            variableKey: "telefone"
          }
        ]
      })
    ).toThrow(
      "ERR_META_TEMPLATE_VARIABLE_MAPPING_DUPLICATE:BODY:1"
    );
  });
});