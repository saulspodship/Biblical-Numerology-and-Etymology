import "server-only";
import { getDatabase } from "@/lib/server/db";
import {
  getAnalystEvidence, getBaseline, getBootstrapData, getEtymologyForQuery,
  getVerses, searchLexemes,
} from "@/lib/server/repositories";

export const catalogService = () => getBootstrapData();
export const lexemeSearchService = (query: string) => searchLexemes(query);
export const etymologyService = (query: string) => getEtymologyForQuery(query);
export const topicLibraryService = () => getBootstrapData().topics;

export function baselineService(systemId: string, value: number, wordCount: number) {
  const db = getDatabase();
  const system = db.prepare("SELECT id FROM numerology_system WHERE id=? AND enabled=1").get(systemId);
  if (!system) return { status: "unknown-system" as const };
  const result = getBaseline(systemId, value, wordCount);
  return result ? { status: "ok" as const, result } : { status: "empty" as const };
}

export function verseSearchService(params: { query?: string; systemId?: string; value?: number; limit?: number }) {
  const db = getDatabase();
  if (params.systemId && !db.prepare("SELECT 1 FROM numerology_system WHERE id=? AND enabled=1").get(params.systemId)) {
    return { status: "unknown-system" as const };
  }
  return { status: "ok" as const, verses: getVerses(params) };
}

export function analystRetrievalService(query: string, topicId?: string) {
  const evidence = getAnalystEvidence(query, topicId);
  const claims = evidence.claims.filter((claim: any) => claim.sources?.length > 0);
  return { topics: evidence.topics, claims };
}
