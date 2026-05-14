import ResolveContactName from "../../../helpers/ResolveContactName";

describe("ResolveContactName", () => {
  it("keeps an existing meaningful name", () => {
    expect(
      ResolveContactName({
        currentName: "Maria Clara",
        incomingName: "Maria C.",
        number: "5511987654321"
      })
    ).toBe("Maria Clara");
  });

  it("replaces a numeric placeholder with the incoming contact name", () => {
    expect(
      ResolveContactName({
        currentName: "5511987654321",
        incomingName: "Maria Clara",
        number: "5511987654321"
      })
    ).toBe("Maria Clara");
  });

  it("replaces a lid placeholder with the incoming contact name", () => {
    expect(
      ResolveContactName({
        currentName: "179473865519257",
        incomingName: "Renata Oliveira",
        lid: "179473865519257@lid"
      })
    ).toBe("Renata Oliveira");
  });

  it("falls back to number when no meaningful name exists", () => {
    expect(
      ResolveContactName({
        currentName: "",
        incomingName: "5511987654321",
        number: "5511987654321"
      })
    ).toBe("5511987654321");
  });
});