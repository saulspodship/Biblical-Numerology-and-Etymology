import type { Claim } from "@/lib/types";

export function ConfidenceBadge({ tag }: { tag: Claim["confidence"] }) {
  return <span className={`confidence-badge confidence-${tag.toLowerCase()}`}><span className="confidence-dot" />{tag}</span>;
}
