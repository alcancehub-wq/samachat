import {
  buildWWebJsFallbackReconciliationContactMetadata,
  mapWWebJsContactToReconciliationMetadata,
  normalizeWWebJsReconciliationLid
} from "../wwebjsReconciliationContactMetadata";

describe(
  "wwebjsReconciliationContactMetadata",
  () => {
    it(
      "normalizes LID identifiers",
      () => {
        expect(
          normalizeWWebJsReconciliationLid(
            "123456"
          )
        ).toBe("123456@lid");

        expect(
          normalizeWWebJsReconciliationLid(
            "123456@lid"
          )
        ).toBe("123456@lid");

        expect(
          normalizeWWebJsReconciliationLid(
            undefined
          )
        ).toBeUndefined();
      }
    );

    it(
      "builds phone metadata directly from inbound raw message",
      () => {
        expect(
          buildWWebJsFallbackReconciliationContactMetadata({
            fromMe: false,
            from: "5511999999999@c.us",
            notifyName: "Pessoa"
          })
        ).toEqual({
          name: "Pessoa",
          number: "5511999999999",
          profilePicUrl: undefined,
          isGroup: false
        });
      }
    );

    it(
      "builds group metadata from raw message identity",
      () => {
        expect(
          buildWWebJsFallbackReconciliationContactMetadata({
            fromMe: false,
            from: "123456789@g.us",
            notifyName: "Grupo"
          })
        ).toEqual({
          name: "Grupo",
          number: "123456789",
          profilePicUrl: undefined,
          isGroup: true
        });
      }
    );

    it(
      "builds LID metadata without message payload conversion",
      () => {
        const result =
          buildWWebJsFallbackReconciliationContactMetadata({
            fromMe: false,
            from: "abc123@lid",
            pushname: "Contato LID"
          });

        expect(result).toEqual({
          name: "Contato LID",
          number: "",
          lid: "abc123@lid",
          profilePicUrl: undefined,
          isGroup: false
        });
      }
    );

    it(
      "returns null when raw message has no usable identity",
      () => {
        expect(
          buildWWebJsFallbackReconciliationContactMetadata({})
        ).toBeNull();
      }
    );

    it(
      "maps canonical contact phone identity and profile picture",
      async () => {
        const getProfilePicUrl =
          jest.fn().mockResolvedValue(
            "https://example.invalid/photo.jpg"
          );

        await expect(
          mapWWebJsContactToReconciliationMetadata({
            id: {
              user: "5511888888888",
              _serialized:
                "5511888888888@c.us"
            },
            name: "Nome salvo",
            pushname: "Push",
            isGroup: false,
            getProfilePicUrl
          })
        ).resolves.toEqual({
          name: "Nome salvo",
          number: "5511888888888",
          lid: undefined,
          profilePicUrl:
            "https://example.invalid/photo.jpg",
          isGroup: false
        });

        expect(
          getProfilePicUrl
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "maps LID canonical contact",
      async () => {
        await expect(
          mapWWebJsContactToReconciliationMetadata({
            id: {
              user: "abc123",
              _serialized: "abc123@lid"
            },
            pushname: "LID",
            isGroup: false
          })
        ).resolves.toEqual({
          name: "LID",
          number: "",
          lid: "abc123@lid",
          profilePicUrl: undefined,
          isGroup: false
        });
      }
    );

    it(
      "keeps profile picture lookup failure non-fatal",
      async () => {
        const getProfilePicUrl =
          jest.fn().mockRejectedValue(
            new Error("photo lookup failed")
          );

        await expect(
          mapWWebJsContactToReconciliationMetadata({
            id: {
              user: "5511777777777",
              _serialized:
                "5511777777777@c.us"
            },
            pushname: "Contato",
            isGroup: false,
            getProfilePicUrl
          })
        ).resolves.toEqual({
          name: "Contato",
          number: "5511777777777",
          lid: undefined,
          profilePicUrl: undefined,
          isGroup: false
        });
      }
    );

    it(
      "rejects contact without phone or LID identity",
      async () => {
        await expect(
          mapWWebJsContactToReconciliationMetadata({
            id: {},
            name: "Sem identidade",
            isGroup: false
          })
        ).rejects.toThrow(
          "Invalid contact number from WhatsApp payload"
        );
      }
    );
  }
);