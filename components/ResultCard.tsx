import type { CalculationResult } from "@/lib/calculation";
import type { NumerologySystem } from "@/lib/types";
import { Icon } from "@/components/Icon";

export function ResultCard({
  system,
  result,
  selected = false,
  onSelect,
}: {
  system: NumerologySystem;
  result: CalculationResult;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button type="button" className={`result-card${selected ? " result-card-selected" : ""}`} onClick={onSelect} aria-pressed={selected}>
      <span className="result-card-top">
        <span className="system-name">{system.name}</span>
        <span className="result-card-arrow"><Icon name="arrow" size={15} /></span>
      </span>
      <span className="result-value-row">
        <span className="result-value">{result.value.toLocaleString()}</span>
        <span className="reduced-chip">root {result.reducedValue}</span>
      </span>
      <span className="result-card-description">{system.description}</span>
      <span className="letter-breakdown" aria-label={`Letter values: ${result.breakdown.map((part) => `${part.char}${part.transformed ? ` to ${part.transformed}` : ""} ${part.value}`).join(", ")}`}>
        {result.breakdown.map((part, index) => (
          <span className="letter-value" key={`${part.position}-${part.char}`} style={{ animationDelay: `${index * 32}ms` }}>
            <span className="letter-glyph" dir="auto">{part.char}</span>
            {part.transformed && <span className="letter-transform">→ {part.transformed}</span>}
            <span className="letter-number">{part.value}</span>
          </span>
        ))}
      </span>
      <span className="result-card-footer"><span>{result.recognizedLetters} letters counted</span><span className="show-baseline">Inspect baseline <Icon name="arrow" size={12} /></span></span>
    </button>
  );
}
