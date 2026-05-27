import BuildContactNumberCandidates from "../../../helpers/BuildContactNumberCandidates";

describe("BuildContactNumberCandidates", () => {
  it("keeps a full international number as-is", () => {
    expect(BuildContactNumberCandidates("15551234567", "5511999999999")).toEqual([
      "15551234567"
    ]);
  });

  it("adds brazilian country code for ddd numbers when the session is brazilian", () => {
    expect(BuildContactNumberCandidates("11987654321", "5511999999999")).toEqual([
      "5511987654321",
      "11987654321"
    ]);
  });

  it("normalizes formatted input before building candidates", () => {
    expect(BuildContactNumberCandidates("(11) 98765-4321", "5511999999999")).toEqual([
      "5511987654321",
      "11987654321"
    ]);
  });

  it("keeps the Larissa regression number normalized with 55 first", () => {
    expect(BuildContactNumberCandidates("11959207315", "5511981901577")).toEqual([
      "5511959207315",
      "11959207315"
    ]);
  });
});