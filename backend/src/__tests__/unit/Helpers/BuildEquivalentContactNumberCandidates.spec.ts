import BuildEquivalentContactNumberCandidates from "../../../helpers/BuildEquivalentContactNumberCandidates";

describe("BuildEquivalentContactNumberCandidates", () => {
  it("keeps the incoming number first and adds the brazilian mobile variant without the ninth digit", () => {
    expect(BuildEquivalentContactNumberCandidates("5541988065095")).toEqual([
      "5541988065095",
      "554188065095"
    ]);
  });

  it("adds the brazilian mobile variant with the ninth digit when whatsapp omits it", () => {
    expect(BuildEquivalentContactNumberCandidates("554188065095")).toEqual([
      "554188065095",
      "5541988065095"
    ]);
  });

  it("does not create fake variants for non-brazilian numbers", () => {
    expect(BuildEquivalentContactNumberCandidates("15551234567")).toEqual([
      "15551234567"
    ]);
  });
});