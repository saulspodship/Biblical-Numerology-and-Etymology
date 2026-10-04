export type SupportedLanguage = "heb" | "grc" | "arc" | "lat" | "eng" | "ara";
export type CalculationAlgorithm = "direct" | "hebrew-atbash" | "latin-pythagorean";

export interface NumerologySystemDefinition {
  id: string;
  name: string;
  language: SupportedLanguage;
  algorithm: CalculationAlgorithm;
  letterValues: Record<string, number>;
  description: string;
  sourceRef: string;
  sortOrder: number;
}

export interface LetterValue {
  position: number;
  char: string;
  value: number;
  transformed?: string;
}

export interface CalculationResult {
  systemId: string;
  value: number;
  reducedValue: number;
  recognizedLetters: number;
  breakdown: LetterValue[];
}

const HEBREW_ALPHABET = [..."אבגדהוזחטיכלמנסעפצקרשת"];
const HEBREW_STANDARD: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80,
  צ: 90, ק: 100, ר: 200, ש: 300, ת: 400,
  ך: 20, ם: 40, ן: 50, ף: 80, ץ: 90,
};
const HEBREW_GADOL: Record<string, number> = {
  ...HEBREW_STANDARD, ך: 500, ם: 600, ן: 700, ף: 800, ץ: 900,
};
const HEBREW_SIDURI: Record<string, number> = Object.fromEntries(
  [...HEBREW_ALPHABET, "ך", "ם", "ן", "ף", "ץ"].map((letter, index) => {
    const canonical = ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" } as Record<string, string>)[letter] ?? letter;
    return [letter, HEBREW_ALPHABET.indexOf(canonical) + 1];
  }),
);
const HEBREW_KATAN: Record<string, number> = Object.fromEntries(
  Object.entries(HEBREW_STANDARD).map(([letter, value]) => [letter, ((value - 1) % 9) + 1]),
);

const GREEK_VALUES: Record<string, number> = {
  α: 1, β: 2, γ: 3, δ: 4, ε: 5, ϛ: 6, ϝ: 6, ς: 200, ζ: 7, η: 8, θ: 9,
  ι: 10, κ: 20, λ: 30, μ: 40, ν: 50, ξ: 60, ο: 70, π: 80, ϟ: 90, Ϙ: 90, ϙ: 90,
  ρ: 100, σ: 200, τ: 300, υ: 400, φ: 500, χ: 600, ψ: 700, ω: 800, ϡ: 900,
};
const ARABIC_ABJAD: Record<string, number> = {
  ا: 1, ب: 2, ج: 3, د: 4, ه: 5, و: 6, ز: 7, ح: 8, ط: 9,
  ي: 10, ك: 20, ل: 30, م: 40, ن: 50, س: 60, ع: 70, ف: 80,
  ص: 90, ق: 100, ر: 200, ش: 300, ت: 400, ث: 500, خ: 600,
  ذ: 700, ض: 800, ظ: 900, غ: 1000,
};
const LATIN_ORDINAL = Object.fromEntries(
  [..."abcdefghijklmnopqrstuvwxyz"].map((letter, index) => [letter, index + 1]),
);

export const SYSTEM_DEFINITIONS: NumerologySystemDefinition[] = [
  {
    id: "hebrew-standard", name: "Standard · Mispar Hechrachi", language: "heb", algorithm: "direct",
    letterValues: HEBREW_STANDARD, description: "Traditional Hebrew letter values; final forms share their ordinary letter values.",
    sourceRef: "src-jewish-encyclopedia-gematria", sortOrder: 1,
  },
  {
    id: "hebrew-gadol", name: "Gadol · final letters", language: "heb", algorithm: "direct",
    letterValues: HEBREW_GADOL, description: "Standard Hebrew values with final forms ך ם ן ף ץ valued 500–900.",
    sourceRef: "src-jewish-encyclopedia-gematria", sortOrder: 2,
  },
  {
    id: "hebrew-siduri", name: "Siduri · ordinal", language: "heb", algorithm: "direct",
    letterValues: HEBREW_SIDURI, description: "Alphabetical position, alef = 1 through tav = 22; final forms use their base letter.",
    sourceRef: "src-jewish-encyclopedia-gematria", sortOrder: 3,
  },
  {
    id: "hebrew-katan", name: "Katan · reduced", language: "heb", algorithm: "direct",
    letterValues: HEBREW_KATAN, description: "Each Hebrew letter is reduced to its digital root before summing.",
    sourceRef: "src-jewish-encyclopedia-gematria", sortOrder: 4,
  },
  {
    id: "hebrew-atbash", name: "Atbash · substitution", language: "heb", algorithm: "hebrew-atbash",
    letterValues: HEBREW_STANDARD, description: "Maps each Hebrew letter to its alphabetic reverse, then sums the transformed letters with standard values.",
    sourceRef: "src-jewish-encyclopedia-gematria", sortOrder: 5,
  },
  {
    id: "greek-isopsephy", name: "Greek · Isopsephy", language: "grc", algorithm: "direct",
    letterValues: GREEK_VALUES, description: "Milesian Greek numeral values; accented forms are normalized and final sigma equals sigma.",
    sourceRef: "src-greek-isopsephy-barry", sortOrder: 6,
  },
  {
    id: "latin-ordinal", name: "English · ordinal (A1–Z26)", language: "lat", algorithm: "direct",
    letterValues: LATIN_ORDINAL, description: "A = 1 through Z = 26. A modern comparison scheme, not an ancient Latin standard.",
    sourceRef: "src-project-defined-method", sortOrder: 7,
  },
  {
    id: "latin-pythagorean", name: "English · Pythagorean (1–9)", language: "lat", algorithm: "latin-pythagorean",
    letterValues: LATIN_ORDINAL, description: "Modern 1–9 repeating letter chart; not presented as an ancient historical method.",
    sourceRef: "src-project-defined-method", sortOrder: 8,
  },
  {
    id: "arabic-abjad", name: "Arabic · Abjad", language: "ara", algorithm: "direct",
    letterValues: ARABIC_ABJAD, description: "Traditional Abjad letter values for the 28 basic Arabic letters.",
    sourceRef: "src-abjad-iranica", sortOrder: 9,
  },
];

const FINAL_TO_BASE: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const ATBASH_MAP: Record<string, string> = Object.fromEntries(
  HEBREW_ALPHABET.map((letter, index) => [letter, HEBREW_ALPHABET[HEBREW_ALPHABET.length - 1 - index]]),
);

export function stripHebrewNiqqud(value: string): string {
  return value.normalize("NFD").replace(/[\u0591-\u05C7]/g, "");
}

export function normalizeForSystem(value: string, system: NumerologySystemDefinition): string {
  let normalized = value.normalize("NFD");
  if (system.language === "heb") {
    normalized = normalized.replace(/[\u0591-\u05C7]/g, "");
    return normalized;
  }
  if (system.language === "grc") {
    return normalized
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[ς]/g, "σ")
      .toLocaleLowerCase("el");
  }
  if (system.language === "ara") {
    return normalized
      .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
      .replace(/[\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي");
  }
  return normalized.replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function digitRoot(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return ((Math.trunc(value) - 1) % 9) + 1;
}

export function calculate(text: string, system: NumerologySystemDefinition): CalculationResult | null {
  if (!text.trim()) return null;
  const normalized = normalizeForSystem(text, system);
  const breakdown: LetterValue[] = [];
  let total = 0;

  for (const char of [...normalized]) {
    const isHebrewFinal = system.language === "heb" && Object.hasOwn(FINAL_TO_BASE, char);
    const baseChar = isHebrewFinal ? FINAL_TO_BASE[char] : char;
    let value: number | undefined;
    let transformed: string | undefined;

    if (system.algorithm === "hebrew-atbash") {
      transformed = ATBASH_MAP[baseChar];
      value = transformed ? system.letterValues[transformed] : undefined;
    } else if (system.algorithm === "latin-pythagorean" && /^[a-z]$/.test(char)) {
      value = ((char.charCodeAt(0) - 97) % 9) + 1;
    } else {
      value = system.letterValues[char] ?? system.letterValues[baseChar];
    }

    if (value === undefined) continue;
    total += value;
    breakdown.push({ position: breakdown.length + 1, char, value, ...(transformed ? { transformed } : {}) });
  }

  if (!breakdown.length) return null;
  return {
    systemId: system.id,
    value: total,
    reducedValue: digitRoot(total),
    recognizedLetters: breakdown.length,
    breakdown,
  };
}

export function calculateWords(text: string, system: NumerologySystemDefinition) {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  return words.map((word) => ({ word, result: calculate(word, system) }));
}

export function normalizeHebrewTransliteration(input: string): string {
  // Longest-match conversion for a practical study transliteration, not a linguistic transcription engine.
  const map: Record<string, string> = {
    sh: "ש", ch: "ח", kh: "ח", tz: "צ", ts: "צ", th: "ת", ph: "פ",
    b: "ב", g: "ג", d: "ד", h: "ה", v: "ו", w: "ו", z: "ז",
    t: "ת", y: "י", k: "כ", c: "כ", l: "ל", m: "מ", n: "נ", s: "ס",
    p: "פ", f: "פ", q: "ק", r: "ר", "'": "ע", "ʻ": "ע",
  };
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  const compact = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let output = "";
  for (let index = 0; index < compact.length;) {
    const match = keys.find((key) => compact.startsWith(key, index));
    if (match) {
      output += map[match];
      index += match.length;
    } else {
      const char = compact[index];
      // Unmarked transliteration vowels are omitted; dictionary matches are preferred by the UI.
      output += /\s|[.,!?;:()\-]/.test(char) ? char : "";
      index += 1;
    }
  }
  return output;
}

export function greatestCommonDivisor(first: number, second: number): number {
  let a = Math.abs(Math.trunc(first));
  let b = Math.abs(Math.trunc(second));
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

export function primeFactors(value: number): number[] {
  let remaining = Math.abs(Math.trunc(value));
  if (remaining < 2) return [];
  const factors: number[] = [];
  for (let divisor = 2; divisor * divisor <= remaining; divisor += divisor === 2 ? 1 : 2) {
    while (remaining % divisor === 0) {
      factors.push(divisor);
      remaining /= divisor;
    }
  }
  if (remaining > 1) factors.push(remaining);
  return factors;
}

export function isTriangular(value: number): boolean {
  if (value < 0) return false;
  const discriminant = 8 * value + 1;
  const root = Math.floor(Math.sqrt(discriminant));
  return root * root === discriminant;
}

export function isFibonacci(value: number): boolean {
  if (value < 0) return false;
  const square = (number: number) => Math.floor(Math.sqrt(number)) ** 2 === number;
  return square(5 * value * value + 4) || square(5 * value * value - 4);
}
