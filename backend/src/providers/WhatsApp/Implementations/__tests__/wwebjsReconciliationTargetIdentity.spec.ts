import ResolveWWebJsTargetProviderAliases from "../wwebjsReconciliationTargetIdentity";

describe(
  "wwebjsReconciliationTargetIdentity",
  () => {
    it(
      "resolves provider phone and LID aliases without global contact enumeration",
      async () => {
        const getContactLidAndPhone =
          jest.fn(async () => [
            {
              pn: "5551982438188@c.us",
              lid: "123456789012345@lid"
            }
          ]);

        const aliases =
          await ResolveWWebJsTargetProviderAliases({
            session: {
              getContactLidAndPhone
            },
            numberCandidates: [
              "5551982438188"
            ]
          });

        expect(
          getContactLidAndPhone
        ).toHaveBeenCalledWith([
          "5551982438188@c.us"
        ]);

        expect(
          new Set(aliases)
        ).toEqual(
          new Set([
            "5551982438188@c.us",
            "123456789012345@lid"
          ])
        );
      }
    );

    it(
      "stays compatible when provider alias lookup is unavailable",
      async () => {
        await expect(
          ResolveWWebJsTargetProviderAliases({
            session: {},
            numberCandidates: [
              "5551982438188"
            ]
          })
        ).resolves.toEqual([]);
      }
    );
  }
);
