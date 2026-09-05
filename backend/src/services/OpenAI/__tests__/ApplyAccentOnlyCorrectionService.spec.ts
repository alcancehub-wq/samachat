import ApplyAccentOnlyCorrectionService, {
  isAccentOnlyCorrection
} from "../ApplyAccentOnlyCorrectionService";

describe("ApplyAccentOnlyCorrectionService", () => {
  it.each([
    ["voce", "você"],
    ["nao", "não"],
    ["coracao", "coração"],
    ["Podemos combinar as 10 horas", "Podemos combinar às 10 horas"]
  ])("accepts accent-only correction: %s -> %s", (original, candidate) => {
    expect(isAccentOnlyCorrection(original, candidate)).toBe(true);
    expect(
      ApplyAccentOnlyCorrectionService({ original, candidate })
    ).toBe(candidate);
  });

  it.each([
    ["Podemos combinar às 10 horas", "Podemos combinar às 10 horas?"],
    [
      "Podemos combinar às 10 horas",
      "Podemos combinar às 10 horas e está confirmado."
    ],
    ["Oi João", "Olá João"],
    [
      "Valor 10.000 link https://x.com",
      "Valor: 10.000 - link https://x.com"
    ],
    ["ola joao", "Olá João"]
  ])("rejects non-accent mutation: %s -> %s", (original, candidate) => {
    expect(isAccentOnlyCorrection(original, candidate)).toBe(false);
    expect(
      ApplyAccentOnlyCorrectionService({ original, candidate })
    ).toBe(original);
  });

  it("preserves an already correct text", () => {
    const original = "Você não precisa alterar nada.";

    expect(
      ApplyAccentOnlyCorrectionService({
        original,
        candidate: original
      })
    ).toBe(original);
  });
});