import type { Source } from "@/lib/types";
import { Icon } from "@/components/Icon";

export function SourceChip({ source, compact = false }: { source: Source; compact?: boolean }) {
  const href = source.archive_url || source.url;
  return (
    <a className={`source-chip${compact ? " source-chip-compact" : ""}`} href={href || undefined} target={href ? "_blank" : undefined} rel={href ? "noreferrer" : undefined} aria-label={`${source.title}${source.author ? `, ${source.author}` : ""}${source.year ? `, ${source.year}` : ""}`}>
      <span className="source-kind">{source.type.replaceAll("_", " ")}</span>
      <span className="source-chip-title">{compact ? source.title : `${source.title}${source.year ? ` · ${source.year}` : ""}`}</span>
      {href ? <Icon name="external" size={13} /> : <span className="no-link-label">book / method ref</span>}
    </a>
  );
}
