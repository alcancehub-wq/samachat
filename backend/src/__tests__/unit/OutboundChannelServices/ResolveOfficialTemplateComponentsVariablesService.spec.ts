import AppError from "../../../errors/AppError";
import ResolveOfficialTemplateComponentsVariablesService, {
  hasOfficialTemplateSystemVariables
} from "../../../services/OutboundChannelServices/ResolveOfficialTemplateComponentsVariablesService";

describe("ResolveOfficialTemplateComponentsVariablesService", () => {
  it("should resolve supported SamaChat variables inside Meta text parameters", () => {
    const result = ResolveOfficialTemplateComponentsVariablesService({
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: "{{bom_dia}} {{nome}} - {{telefone}}"
            },
            {
              type: "text",
              text: "{{responsavel}} / {{fila}} / #{{ticket_id}}"
            }
          ]
        }
      ],
      contact: {
        name: "ANA SAMACON",
        number: "5511999999999",
        email: "ana@samacon.com"
      },
      ticket: {
        id: 111,
        user: {
          name: "Dionatan"
        },
        queue: {
          name: "Comercial"
        }
      },
      now: new Date("2026-05-08T16:20:00-03:00")
    });

    expect(result).toEqual([
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: "Bom dia Ana - 5511999999999"
          },
          {
            type: "text",
            text: "Dionatan / Comercial / #111"
          }
        ]
      }
    ]);
  });

  it("should preserve unknown placeholders and non-text parameters", () => {
    const result = ResolveOfficialTemplateComponentsVariablesService({
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: "Oi {{nome}} {{variavel_externa}}"
            },
            {
              type: "image",
              image: {
                link: "https://example.com/image.jpg"
              }
            }
          ]
        }
      ],
      contact: {
        name: "CARLOS SILVA"
      }
    });

    expect(result).toEqual([
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: "Oi Carlos {{variavel_externa}}"
          },
          {
            type: "image",
            image: {
              link: "https://example.com/image.jpg"
            }
          }
        ]
      }
    ]);
  });

  it("should fail closed when a supported variable has no value", () => {
    expect(() =>
      ResolveOfficialTemplateComponentsVariablesService({
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: "{{email}}"
              }
            ]
          }
        ],
        contact: {
          name: "Ana",
          email: null
        }
      })
    ).toThrow(AppError);

    try {
      ResolveOfficialTemplateComponentsVariablesService({
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: "{{email}}"
              }
            ]
          }
        ],
        contact: {
          name: "Ana",
          email: null
        }
      });
    } catch (error) {
      expect((error as AppError).message).toBe(
        "ERR_META_TEMPLATE_VARIABLE_EMPTY:email"
      );
    }
  });

  it("should detect supported SamaChat variables before context loading", () => {
    expect(
      hasOfficialTemplateSystemVariables([
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: "Olá {{ nome }}"
            }
          ]
        }
      ])
    ).toBe(true);
  });

  it("should not require context loading for plain text or external placeholders", () => {
    expect(
      hasOfficialTemplateSystemVariables([
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: "Olá cliente"
            },
            {
              type: "text",
              text: "{{variavel_externa}}"
            }
          ]
        }
      ])
    ).toBe(false);
  });
  it("should return undefined when components are absent", () => {
    expect(
      ResolveOfficialTemplateComponentsVariablesService({})
    ).toBeUndefined();
  });
});