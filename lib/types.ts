import type { CalculationAlgorithm, SupportedLanguage } from "@/lib/calculation";

export interface NumerologySystem {
  id: string;
  name: string;
  language: SupportedLanguage;
  algorithm: CalculationAlgorithm;
  letter_values_json: string;
  letterValues: Record<string, number>;
  description: string;
  source_ref: string;
  sort_order: number;
  version: string;
}

export interface Lexeme {
  id: number;
  text: string;
  language: SupportedLanguage;
  transliteration: string | null;
  strongs_id: string | null;
  root_id: number | null;
  part_of_speech: string | null;
  gloss: string | null;
  notes?: string | null;
}

export interface Source {
  id: string;
  type: string;
  title: string;
  author: string | null;
  year: number | null;
  url: string | null;
  archive_url: string | null;
  reliability_grade: string;
  access_note: string | null;
}

export interface LexemeValue {
  lexeme_id: number;
  system_id: string;
  value: number;
  reduced_value: number;
}

export interface LexemeSourceLink {
  lexeme_id: number;
  relation: string;
  confidence: Claim["confidence"];
  note: string;
  source: Source;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  summary: string;
  claims: Claim[];
}

export interface Claim {
  id: string;
  topic_id: string;
  statement: string;
  made_by: string;
  confidence: "DOCUMENTED" | "CONTESTED" | "SPECULATIVE" | "DEBUNKED";
  status_note: string;
  claim_kind: string;
  sources: Array<{ source: Source; supports: string; note: string | null }>;
}

export interface EtymologyEntry {
  id: number;
  lexeme_id: number;
  step_order: number;
  from_lexeme_id: number | null;
  relation: string;
  explanation: string;
  confidence: Claim["confidence"];
  lexeme: Lexeme;
  fromLexeme: Lexeme | null;
  source: Source;
}

export interface VerseRecord {
  id: number;
  corpus_id: string;
  book: string;
  chapter: number;
  verse_no: number;
  text: string;
  language: SupportedLanguage;
  source?: Source | null;
  matches?: Array<{ position: number; surface_form: string; lexeme: Lexeme; values: LexemeValue[] }>;
}

export interface BaselineRecord {
  systemId: string;
  value: number;
  matchCount: number;
  total: number;
  matchingLexemes: Array<{ id: number; text: string; transliteration: string | null; gloss: string | null }>;
  randomPhraseMatches: number;
  randomPhraseTrials: number;
  wordCount: number;
  model: string;
}

export interface ResearchConnection {
  id: string;
  from_ref_type: string;
  from_ref_id: string;
  to_ref_type: string;
  to_ref_id: string;
  kind: string;
  basis: "documented" | "numerological";
  note: string;
  source: Source | null;
  fromLabel: string;
  toLabel: string;
}

export interface BootstrapData {
  systems: NumerologySystem[];
  lexemes: Lexeme[];
  lexemeValues: LexemeValue[];
  lexemeSources: LexemeSourceLink[];
  sources: Source[];
  topics: Topic[];
  etymology: EtymologyEntry[];
  verses: VerseRecord[];
  connections: ResearchConnection[];
}

export interface LocalHistoryItem {
  id: string;
  inputText: string;
  systemIds: string[];
  timestamp: string;
}

export interface LocalSavedNote {
  id: string;
  refType: string;
  refId: string;
  title: string;
  note: string;
  createdAt: string;
  deletedAt?: string;
}
