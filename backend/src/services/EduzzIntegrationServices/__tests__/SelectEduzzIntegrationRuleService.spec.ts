import SelectEduzzIntegrationRuleService from "../SelectEduzzIntegrationRuleService";

interface Rule {
  id: number;
  eventName: string;
  productId?: string | null;
  label: string;
}

describe(
  "SelectEduzzIntegrationRuleService",
  () => {
    it("prioritizes a matching product rule over a generic rule", () => {
      const rules: Rule[] = [
        {
          id: 1,
          eventName: "myeduzz.invoice_paid",
          productId: null,
          label: "generic"
        },
        {
          id: 2,
          eventName: "myeduzz.invoice_paid",
          productId: "product-20",
          label: "specific"
        }
      ];

      const result =
        SelectEduzzIntegrationRuleService({
          rules,
          eventName: "myeduzz.invoice_paid",
          productIds: [
            "product-10",
            "product-20"
          ]
        });

      expect(result?.label).toBe("specific");
    });

    it("uses the generic rule when no product rule matches", () => {
      const rules: Rule[] = [
        {
          id: 1,
          eventName: "myeduzz.invoice_paid",
          productId: null,
          label: "generic"
        },
        {
          id: 2,
          eventName: "myeduzz.invoice_paid",
          productId: "product-99",
          label: "specific"
        }
      ];

      const result =
        SelectEduzzIntegrationRuleService({
          rules,
          eventName: "myeduzz.invoice_paid",
          productIds: ["product-20"]
        });

      expect(result?.label).toBe("generic");
    });

    it("returns null when no rule matches", () => {
      const result =
        SelectEduzzIntegrationRuleService({
          rules: [],
          eventName: "myeduzz.invoice_paid",
          productIds: ["product-20"]
        });

      expect(result).toBeNull();
    });

    it("blocks two matching product rules", () => {
      const rules: Rule[] = [
        {
          id: 1,
          eventName: "myeduzz.invoice_paid",
          productId: "product-20",
          label: "one"
        },
        {
          id: 2,
          eventName: "myeduzz.invoice_paid",
          productId: "product-20",
          label: "two"
        }
      ];

      expect(() =>
        SelectEduzzIntegrationRuleService({
          rules,
          eventName: "myeduzz.invoice_paid",
          productIds: ["product-20"]
        })
      ).toThrow(
        "ERR_EDUZZ_MULTIPLE_MATCHING_PRODUCT_RULES"
      );
    });

    it("blocks two generic rules", () => {
      const rules: Rule[] = [
        {
          id: 1,
          eventName: "myeduzz.invoice_paid",
          productId: null,
          label: "one"
        },
        {
          id: 2,
          eventName: "myeduzz.invoice_paid",
          productId: "",
          label: "two"
        }
      ];

      expect(() =>
        SelectEduzzIntegrationRuleService({
          rules,
          eventName: "myeduzz.invoice_paid",
          productIds: ["product-20"]
        })
      ).toThrow(
        "ERR_EDUZZ_MULTIPLE_GENERIC_RULES"
      );
    });
  }
);
