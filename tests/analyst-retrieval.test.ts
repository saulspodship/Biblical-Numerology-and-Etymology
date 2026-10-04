import { describe, expect, it } from "vitest";
import { analystTerms, selectAnalystClaims, selectAnalystTopics } from "@/lib/analyst-retrieval";

const topics = [
  { id: "antarctica", title: "Antarctica & the Antarctic Treaty", category: "Treaty and policy", summary: "Read the treaty and official summaries." },
  { id: "eleusis", title: "Ancient religions & mystery traditions", category: "Ancient history", summary: "Study evidence about initiation traditions." },
  { id: "families", title: "Influential families: records, not myths", category: "Historical research", summary: "Review archival records; names are not evidence of a plot." },
];

const claims = [
  { statement: "The Antarctic Treaty was signed in Washington in 1959.", status_note: "An official treaty record.", made_by: "Antarctic Treaty Secretariat" },
  { statement: "The Eleusinian Mysteries were ancient rites at Eleusis.", status_note: "A source-led historical summary.", made_by: "Cornell University Library" },
];

describe("source-constrained analyst retrieval", () => {
  it("drops generic question words and chooses the strongest topic-title match", () => {
    const query = "What do the curated records say about the Antarctic Treaty?";
    expect(analystTerms(query)).toEqual(["antarctic", "treaty"]);
    expect(selectAnalystTopics(query, topics).map((topic) => topic.id)).toEqual(["antarctica"]);
  });

  it("does not return unrelated claims from a weak stopword-only query", () => {
    expect(selectAnalystTopics("What do you know about it?", topics)).toEqual([]);
  });

  it("filters claims to relevant query terms", () => {
    expect(selectAnalystClaims("Antarctic Treaty", claims)).toEqual([claims[0]]);
  });
});
