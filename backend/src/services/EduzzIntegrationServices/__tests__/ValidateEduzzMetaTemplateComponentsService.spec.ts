import ValidateEduzzMetaTemplateComponentsService from "../ValidateEduzzMetaTemplateComponentsService";

describe(
  "ValidateEduzzMetaTemplateComponentsService",
  () => {
    it("accepts deterministic BODY text mappings", () => {
      const result =
        ValidateEduzzMetaTemplateComponentsService([
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: "{{eduzz_comprador_nome}}"
              },
              {
                type: "text",
                text: "{{blinket_ingresso_nome}}"
              }
            ]
          }
        ]);

      expect(result).toEqual([
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: "{{eduzz_comprador_nome}}"
            },
            {
              type: "text",
              text: "{{blinket_ingresso_nome}}"
            }
          ]
        }
      ]);
    });

    it("accepts HEADER text mapping", () => {
      const result =
        ValidateEduzzMetaTemplateComponentsService([
          {
            type: "header",
            parameters: [
              {
                type: "text",
                text: "{{nome}}"
              }
            ]
          }
        ]);

      expect(result).toEqual([
        {
          type: "header",
          parameters: [
            {
              type: "text",
              text: "{{nome}}"
            }
          ]
        }
      ]);
    });

    it("rejects unsupported component types", () => {
      expect(() =>
        ValidateEduzzMetaTemplateComponentsService([
          {
            type: "button",
            parameters: [
              {
                type: "text",
                text: "{{nome}}"
              }
            ]
          }
        ])
      ).toThrow(
        "ERR_EDUZZ_META_TEMPLATE_COMPONENT_TYPE_UNSUPPORTED"
      );
    });

    it("rejects unsupported parameter types", () => {
      expect(() =>
        ValidateEduzzMetaTemplateComponentsService([
          {
            type: "header",
            parameters: [
              {
                type: "image",
                text: "{{nome}}"
              }
            ]
          }
        ])
      ).toThrow(
        "ERR_EDUZZ_META_TEMPLATE_PARAMETER_TYPE_UNSUPPORTED"
      );
    });

    it("rejects variables outside the allowlist", () => {
      expect(() =>
        ValidateEduzzMetaTemplateComponentsService([
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: "{{variavel_inexistente}}"
              }
            ]
          }
        ])
      ).toThrow(
        "ERR_EDUZZ_META_TEMPLATE_VARIABLE_NOT_ALLOWED"
      );
    });
  }
);
