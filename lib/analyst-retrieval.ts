export interface TopicMatchCandidate {
  id: string;
  title: string;
  summary: string;
  category: string;
}

export interface AnalystClaimText {
  statement: string;
  status_note: string | null;
  made_by: string;
}

const STOP_WORDS = new Set([
  "what", "when", "where", "which", "who", "whom", "whose", "why", "how", "does", "did", "can", "could", "would", "should",
  "tell", "show", "find", "give", "about", "from", "into", "with", "without", "that", "this", "these", "those", "the", "and",
  "for", "are", "was", "were", "has", "have", "had", "not", "but", "you", "your", "our", "their", "they", "them", "its",
  "also", "please", "curated", "records", "say", "says", "research", "any", "some", "all", "data", "evidence", "source", "sources",
]);

export function analystTerms(query: string): string[] {
  const normalized = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  return [...new Set(normalized.split(/\s+/u).filter((term) => term.length > 2 && !STOP_WORDS.has(term)))].slice(0, 8);
}

export function selectAnalystTopics<T extends TopicMatchCandidate>(query: string, topics: T[], pinnedTopicId?: string): T[] {
  if (pinnedTopicId) return topics.filter((topic) => topic.id === pinnedTopicId);
  const terms = analystTerms(query);
  if (!terms.length) return [];
  const scored = topics.map((topic) => {
    const title = `${topic.title} ${topic.category}`.toLowerCase();
    const summary = topic.summary.toLowerCase();
    const titleMatches = terms.filter((term) => title.includes(term)).length;
    const summaryMatches = terms.filter((term) => summary.includes(term)).length;
    return { topic, score: titleMatches * 3 + summaryMatches };
  });
  const highest = Math.max(0, ...scored.map((item) => item.score));
  return highest ? scored.filter((item) => item.score === highest).map((item) => item.topic) : [];
}

export function selectAnalystClaims<T extends AnalystClaimText>(query: string, claims: T[]): T[] {
  const terms = analystTerms(query);
  if (!terms.length) return [];
  return claims.filter((claim) => terms.some((term) => `${claim.statement} ${claim.status_note ?? ""} ${claim.made_by}`.toLowerCase().includes(term)));
}
