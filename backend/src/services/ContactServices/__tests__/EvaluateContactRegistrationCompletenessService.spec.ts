import EvaluateContactRegistrationCompletenessService from "../EvaluateContactRegistrationCompletenessService";

describe("EvaluateContactRegistrationCompletenessService", () => {
  const base = {
    name: "Maria Silva",
    number: "5511999999999",
    captureChannel: "WhatsApp"
  };

  it("marks legacy/unknown referral decision as incomplete", () => {
    const result = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: null
    });

    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual(["wasReferred"]);
  });

  it("accepts a complete contact that was not referred", () => {
    const result = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: false
    });

    expect(result).toEqual({
      complete: true,
      missingFields: []
    });
  });

  it("requires the basic registration fields", () => {
    const result = EvaluateContactRegistrationCompletenessService({
      name: "",
      number: "",
      captureChannel: "",
      wasReferred: null
    });

    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual([
      "name",
      "number",
      "captureChannel",
      "wasReferred"
    ]);
  });

  it("requires referral type when contact was referred", () => {
    const result = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true
    });

    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual(["referralType"]);
  });

  it("requires referralContactId for cliente referral", () => {
    const incomplete = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true,
      referralType: "cliente"
    });

    expect(incomplete.complete).toBe(false);
    expect(incomplete.missingFields).toEqual(["referralContactId"]);

    const complete = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true,
      referralType: "cliente",
      referralContactId: 15
    });

    expect(complete.complete).toBe(true);
    expect(complete.missingFields).toEqual([]);
  });

  it("requires referralUserId for usuario referral", () => {
    const incomplete = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true,
      referralType: "usuario"
    });

    expect(incomplete.complete).toBe(false);
    expect(incomplete.missingFields).toEqual(["referralUserId"]);

    const complete = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true,
      referralType: "usuario",
      referralUserId: 7
    });

    expect(complete.complete).toBe(true);
  });

  it("requires referralPartnerName for parceiro referral", () => {
    const incomplete = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true,
      referralType: "parceiro",
      referralPartnerName: "   "
    });

    expect(incomplete.complete).toBe(false);
    expect(incomplete.missingFields).toEqual(["referralPartnerName"]);

    const complete = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true,
      referralType: "parceiro",
      referralPartnerName: "Parceiro XPTO"
    });

    expect(complete.complete).toBe(true);
  });

  it("accepts outro referral without inventing an extra required field", () => {
    const result = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true,
      referralType: "outro"
    });

    expect(result).toEqual({
      complete: true,
      missingFields: []
    });
  });

  it("rejects an unsupported referral type", () => {
    const result = EvaluateContactRegistrationCompletenessService({
      ...base,
      wasReferred: true,
      referralType: "qualquer-coisa"
    });

    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual(["referralType"]);
  });
});