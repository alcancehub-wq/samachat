import IsPlausiblePhoneNumber from "../../../helpers/IsPlausiblePhoneNumber";

describe("IsPlausiblePhoneNumber", () => {
  it("accepts Brazilian numbers with country and area code", () => {
    expect(IsPlausiblePhoneNumber("5511999999999")).toBe(true);
  });

  it("accepts international numbers with country code", () => {
    expect(IsPlausiblePhoneNumber("14155552671")).toBe(true);
    expect(IsPlausiblePhoneNumber("351912345678")).toBe(true);
  });

  it("accepts formatted numbers after sanitization", () => {
    expect(IsPlausiblePhoneNumber("+55 (11) 91234-5678")).toBe(true);
  });

  it("rejects empty or implausibly short values", () => {
    expect(IsPlausiblePhoneNumber("")).toBe(false);
    expect(IsPlausiblePhoneNumber("55123")).toBe(false);
    expect(IsPlausiblePhoneNumber("abc")).toBe(false);
  });
});