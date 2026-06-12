import BuildEquivalentContactNumberCandidates from "../../../helpers/BuildEquivalentContactNumberCandidates";

describe("BuildEquivalentContactNumberCandidates", () => {
  it("keeps the incoming number first and adds brazilian equivalents with and without country code", () => {
    expect(BuildEquivalentContactNumberCandidates("5541988065095")).toEqual([
      "5541988065095",
      "41988065095",
      "4188065095",
      "554188065095"
    ]);
  });

  it("adds the brazilian mobile variant with the ninth digit when whatsapp omits it", () => {
    expect(BuildEquivalentContactNumberCandidates("554188065095")).toEqual([
      "554188065095",
      "4188065095",
      "41988065095",
      "5541988065095"
    ]);
  });

  it("matches the Fabiana case with country code and local number variants", () => {
    expect(BuildEquivalentContactNumberCandidates("5535997337733")).toEqual([
      "5535997337733",
      "35997337733",
      "3597337733",
      "553597337733"
    ]);
  });

  it("does not create fake variants for non-brazilian numbers", () => {
    expect(BuildEquivalentContactNumberCandidates("12125550123")).toEqual([
      "12125550123"
    ]);
  });
});
