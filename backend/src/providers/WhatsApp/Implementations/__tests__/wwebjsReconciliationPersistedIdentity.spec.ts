import ExtractWWebJsPersistedTargetLidAliases from "../wwebjsReconciliationPersistedIdentity";

describe(
  "wwebjs persisted targeted identity",
  () => {
    it(
      "recovers Fernanda provider LID from persisted ticket message id",
      () => {
        expect(
          ExtractWWebJsPersistedTargetLidAliases([
            "e7dadaf3-9dbc-40b6-88b3-f6692cb0e05b",
            "fallback_1787770805_unknown_140582986985630@lid_qdnbz9"
          ])
        ).toEqual([
          "140582986985630@lid"
        ]);
      }
    );

    it(
      "deduplicates persisted LID candidates",
      () => {
        expect(
          ExtractWWebJsPersistedTargetLidAliases([
            "false_140582986985630@lid_a",
            "fallback_1_unknown_140582986985630@lid_b",
            "false_5551982438188@c.us_c"
          ])
        ).toEqual([
          "140582986985630@lid"
        ]);
      }
    );
  }
);
