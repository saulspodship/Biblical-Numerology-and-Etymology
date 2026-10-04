import { describe, expect, it } from "vitest";
import {
  calculate, calculateWords, digitRoot, greatestCommonDivisor, isFibonacci, isTriangular, normalizeHebrewTransliteration,
  primeFactors, stripHebrewNiqqud, SYSTEM_DEFINITIONS,
} from "@/lib/calculation";

const system = (id: string) => {
  const definition = SYSTEM_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Missing test system ${id}`);
  return definition;
};

describe("deterministic gematria engine", () => {
  it("calculates well-known Hebrew standard values", () => {
    expect(calculate("שלום", system("hebrew-standard"))?.value).toBe(376);
    expect(calculate("אהבה", system("hebrew-standard"))?.value).toBe(13);
    expect(calculate("אחד", system("hebrew-standard"))?.value).toBe(13);
  });

  it("calculates each word independently in a phrase", () => {
    const results = calculateWords("שלום אהבה", system("hebrew-standard"));
    expect(results.map((item) => item.result?.value)).toEqual([376, 13]);
  });

  it("strips Hebrew niqqud and cantillation before summing", () => {
    expect(stripHebrewNiqqud("שָׁלוֹם")).toBe("שלום");
    expect(calculate("שָׁלוֹם", system("hebrew-standard"))?.value).toBe(376);
  });

  it("handles final letters explicitly in standard and Gadol systems", () => {
    expect(calculate("מלך", system("hebrew-standard"))?.value).toBe(90);
    expect(calculate("מלך", system("hebrew-gadol"))?.value).toBe(570);
    expect(calculate("שלום", system("hebrew-gadol"))?.value).toBe(936);
  });

  it("calculates ordinal, reduced, and Atbash variants from the lookup tables", () => {
    expect(calculate("שלום", system("hebrew-siduri"))?.value).toBe(52);
    expect(calculate("שלום", system("hebrew-katan"))?.value).toBe(16);
    expect(calculate("שלום", system("hebrew-atbash"))?.value).toBe(112);
  });

  it("normalizes Greek accents and final sigma for isopsephy", () => {
    expect(calculate("λόγος", system("greek-isopsephy"))?.value).toBe(373);
    expect(calculate("ΛΟΓΟΣ", system("greek-isopsephy"))?.value).toBe(373);
  });

  it("uses defined lookup tables for English, Latin, and Arabic", () => {
    expect(calculate("ABC", system("latin-ordinal"))?.value).toBe(6);
    expect(calculate("truth", system("latin-ordinal"))?.value).toBe(87);
    expect(calculate("سلام", system("arabic-abjad"))?.value).toBe(131);
  });

  it("ignores punctuation and unsupported characters, but returns null for empty input", () => {
    expect(calculate("שלום! 123", system("hebrew-standard"))?.value).toBe(376);
    expect(calculate("...---", system("hebrew-standard"))).toBeNull();
    expect(calculate("", system("hebrew-standard"))).toBeNull();
  });

  it("maps known transliteration consonants and does not invent vowel letters", () => {
    expect(normalizeHebrewTransliteration("shlm")).toBe("שלמ");
    expect(normalizeHebrewTransliteration("ch" )).toBe("ח");
  });
});

describe("number checks", () => {
  it("reduces totals to a decimal digit root", () => {
    expect(digitRoot(376)).toBe(7);
    expect(digitRoot(0)).toBe(0);
    expect(digitRoot(-3)).toBe(0);
  });

  it("simplifies ratios with the greatest common divisor", () => {
    expect(greatestCommonDivisor(376, 13)).toBe(1);
    expect(greatestCommonDivisor(18, 12)).toBe(6);
  });

  it("computes prime factors", () => {
    expect(primeFactors(12)).toEqual([2, 2, 3]);
    expect(primeFactors(47)).toEqual([47]);
    expect(primeFactors(1)).toEqual([]);
  });

  it("tests triangular and Fibonacci membership", () => {
    expect(isTriangular(10)).toBe(true);
    expect(isTriangular(11)).toBe(false);
    expect(isFibonacci(13)).toBe(true);
    expect(isFibonacci(14)).toBe(false);
  });
});
