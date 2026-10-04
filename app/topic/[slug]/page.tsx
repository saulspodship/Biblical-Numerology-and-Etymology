import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { SourceChip } from "@/components/SourceChip";
import { Icon } from "@/components/Icon";
import { getTopicBySlug } from "@/lib/server/repositories";

type PageProps = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

function plainDescription(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 158);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopicBySlug(decodeURIComponent(slug));
  if (!topic) return { title: "Topic not found" };
  return {
    title: topic.title,
    description: plainDescription(topic.summary),
    alternates: { canonical: `/topic/${encodeURIComponent(slug)}` },
    openGraph: { title: `${topic.title} · Gematria Lab`, description: plainDescription(topic.summary), type: "article" },
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = getTopicBySlug(decodeURIComponent(slug));
  if (!topic) notFound();
  const articleSchema = {
    "@context": "https://schema.org", "@type": "Article", headline: topic.title, description: topic.summary,
    author: { "@type": "Organization", name: "Gematria Lab" }, mainEntityOfPage: `https://gematria-lab.saulspodship.com/topic/${encodeURIComponent(slug)}`,
    citation: topic.claims.flatMap((claim: any) => claim.sources.map((item: any) => item.source.url).filter(Boolean)),
  };
  const faqSchema = {
    "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
      { "@type": "Question", name: "Does a numerical match prove a historical connection?", acceptedAnswer: { "@type": "Answer", text: "No. A numerical match is an observation, not evidence of historical, semantic, or causal connection. Review the calculation and coincidence baseline." } },
      { "@type": "Question", name: "How should the claims on this page be read?", acceptedAnswer: { "@type": "Answer", text: "Each claim has a confidence tag and linked sources. A tag applies to that claim only; consult the source and its context." } },
    ],
  };
  const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

  return <main className="document-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(articleSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(faqSchema) }} />
    <Link className="document-back" href="/"><Icon name="arrow" size={14} /> Back to research lab</Link>
    <span className="kicker" style={{ marginTop: 24 }}>{topic.category} · source dossier</span>
    <h1>{topic.title}</h1>
    <p>{topic.summary}</p>
    <div className="etymology-warning"><strong>Reading guide.</strong> The confidence badge is attached to an individual sourced statement, not to an entire topic. A missing source means the assertion is not established in this catalog.</div>
    <h2>Sourced claims</h2>
    {topic.claims.length ? topic.claims.map((claim: any) => <article className="claim-card" key={claim.id} style={{ marginTop: 10 }}>
      <div className="claim-card-top"><ConfidenceBadge tag={claim.confidence} /><span className="claim-byline">{claim.made_by}</span></div>
      <p>{claim.statement}</p>
      <p className="claim-status">{claim.status_note}</p>
      <div className="claim-sources">{claim.sources.map((item: any) => <SourceChip key={`${claim.id}-${item.source.id}`} source={item.source} />)}</div>
    </article>) : <p>No approved claims are available in this topic record.</p>}
    <h2>Frequently asked questions</h2>
    <section className="faq-item"><h3>Does a numerical match prove a historical connection?</h3><p>No. Numerical equality is not evidence of history, meaning, intent, or causation. Always inspect the calculation and chance-match baseline.</p></section>
    <section className="faq-item"><h3>What does a confidence tag mean?</h3><p>It describes how a specific claim is represented by the linked source set. It is not a measure of a person's character or an endorsement of a theory.</p></section>
    <p style={{ marginTop: 25 }}><strong>Educational research tool, not proof; patterns do not establish causation.</strong></p>
  </main>;
}
