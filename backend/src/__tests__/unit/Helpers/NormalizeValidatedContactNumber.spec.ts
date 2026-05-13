import NormalizeValidatedContactNumber from "../../../helpers/NormalizeValidatedContactNumber";

describe("NormalizeValidatedContactNumber", () => {
  it("returns the whatsapp canonical phone when the lookup is c.us", () => {
    expect(
      NormalizeValidatedContactNumber("5511996829132", {
        user: "5511996829132",
        server: "c.us",
        _serialized: "5511996829132@c.us"
      })
    ).toBe("5511996829132");
  });

  it("falls back to the candidate digits when whatsapp resolves to lid", () => {
    expect(
      NormalizeValidatedContactNumber("5511996829132", {
        user: "179473865519257",
        server: "lid",
        _serialized: "179473865519257@lid"
      })
    ).toBe("5511996829132");
  });

  it("returns empty when the lookup has no resolved user", () => {
    expect(
      NormalizeValidatedContactNumber("5511996829132", {
        user: "",
        server: "c.us",
        _serialized: ""
      })
    ).toBe("");
  });
});