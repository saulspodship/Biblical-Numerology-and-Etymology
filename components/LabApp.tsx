"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { ResultCard } from "@/components/ResultCard";
import { SourceChip } from "@/components/SourceChip";
import {
  calculate, calculateWords, digitRoot, greatestCommonDivisor, isFibonacci, isTriangular, normalizeHebrewTransliteration,
  primeFactors, SYSTEM_DEFINITIONS,
} from "@/lib/calculation";
import {
  clearHistory, deleteSavedNote, dismissPrivacyNotice, loadHistory, loadPrivacyNoticeDismissed, loadSavedNotes, loadTheme, loadVisibleSystems,
  saveHistory, saveNote, saveTheme, saveVisibleSystems, updateSavedNote,
} from "@/lib/local-store";
import type {
  BaselineRecord, BootstrapData, Claim, EtymologyEntry, Lexeme, LocalHistoryItem, LocalSavedNote,
  NumerologySystem, Source, Topic, VerseRecord,
} from "@/lib/types";

 type WorkspaceTab = "calculator" | "etymology" | "verses" | "analyst" | "topics" | "graph" | "sources" | "saved" | "history";
type InputMode = "hebrew" | "transliteration" | "greek" | "english" | "arabic";
type AnalystPayload = {
  mode: "ai-summary" | "curated-retrieval";
  answer: string;
  documented: Claim[];
  contestedOrClaimed: Claim[];
  unsupportedNote: string;
  numerologicalNote: string;
  topics: Array<{ id: string; title: string; category: string }>;
  sources: Source[];
  disclaimer: string;
};
type EtymologyPayload = { lexeme: Lexeme | null; entries: EtymologyEntry[] };
type VerseResult = VerseRecord & { matches?: Array<{ position: number; surface_form: string; lexeme: Lexeme; values: Array<{ lexeme_id: number; system_id: string; value: number; reduced_value: number }> }> };

const NAV_GROUPS: Array<{ label: string; items: Array<{ id: WorkspaceTab; label: string; icon: IconName }> }> = [
  { label: "Study", items: [
    { id: "calculator", label: "Calculator", icon: "calculator" },
    { id: "etymology", label: "Etymology", icon: "book" },
    { id: "verses", label: "Verse finder", icon: "search" },
  ] },
  { label: "Research", items: [
    { id: "analyst", label: "Research analyst", icon: "message" },
    { id: "topics", label: "Topics & claims", icon: "document" },
    { id: "graph", label: "Connection graph", icon: "network" },
    { id: "sources", label: "Sources", icon: "link" },
  ] },
  { label: "Your workspace", items: [
    { id: "saved", label: "Saved notes", icon: "bookmark" },
    { id: "history", label: "History", icon: "history" },
  ] },
];

const MODE_SYSTEM_LANGUAGE: Record<InputMode, string> = {
  hebrew: "heb", transliteration: "heb", greek: "grc", english: "lat", arabic: "ara",
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
  return data as T;
}

function safeSlugTerm(lexeme: Lexeme) {
  return (lexeme.transliteration || lexeme.text).toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, "-");
}

function inferMode(text: string): InputMode {
  if (/[\u0590-\u05ff]/u.test(text)) return "hebrew";
  if (/[\u0600-\u06ff]/u.test(text)) return "arabic";
  if (/[\u0370-\u03ff\u1f00-\u1fff]/u.test(text)) return "greek";
  return "english";
}

function resolveTransliteration(text: string, lexemes: Lexeme[]) {
  const hebrewTerms = new Map(lexemes.filter((lexeme) => lexeme.language === "heb" && lexeme.transliteration)
    .map((lexeme) => [(lexeme.transliteration as string).toLowerCase(), lexeme.text]));
  return text.split(/(\s+)/u).map((segment) => {
    if (!segment || /^\s+$/u.test(segment)) return segment;
    const word = segment.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    const mapped = hebrewTerms.get(word.toLowerCase()) ?? normalizeHebrewTransliteration(word);
    return mapped || segment;
  }).join("");
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatRatio(first: number, second: number) {
  const divisor = greatestCommonDivisor(first, second);
  return divisor === 0 ? `${first}:${second}` : `${first / divisor}:${second / divisor}`;
}

function EmptyState({ icon = "search", title, text }: { icon?: IconName; title: string; text: string }) {
  return <div className="empty-state"><span className="empty-state-icon"><Icon name={icon} size={18} /></span><h3>{title}</h3><p>{text}</p></div>;
}

export function LabApp() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("calculator");
  const [input, setInput] = useState("שלום");
  const [inputMode, setInputMode] = useState<InputMode>("hebrew");
  const [selectedSystemId, setSelectedSystemId] = useState("hebrew-standard");
  const [ratioTarget, setRatioTarget] = useState("");
  const [visibleSystemIds, setVisibleSystemIds] = useState<string[] | null>(null);
  const [calculationVersion, setCalculationVersion] = useState(0);
  const [inputError, setInputError] = useState("");
  const [baseline, setBaseline] = useState<BaselineRecord | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineError, setBaselineError] = useState("");
  const [verseMode, setVerseMode] = useState<"word" | "value">("word");
  const [verseQuery, setVerseQuery] = useState("שלום");
  const [verseResults, setVerseResults] = useState<VerseResult[]>([]);
  const [verseLoading, setVerseLoading] = useState(false);
  const [verseError, setVerseError] = useState("");
  const [etymologyTerm, setEtymologyTerm] = useState("shalom");
  const [etymologyData, setEtymologyData] = useState<EtymologyPayload | null>(null);
  const [lexemeSuggestions, setLexemeSuggestions] = useState<Array<Lexeme & { match?: string }>>([]);
  const [etymologyLoading, setEtymologyLoading] = useState(false);
  const [etymologyError, setEtymologyError] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [analystQuestion, setAnalystQuestion] = useState("");
  const [analystTopicId, setAnalystTopicId] = useState("");
  const [analystResponse, setAnalystResponse] = useState<AnalystPayload | null>(null);
  const [analystLoading, setAnalystLoading] = useState(false);
  const [analystError, setAnalystError] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [history, setHistory] = useState<LocalHistoryItem[]>([]);
  const [savedNotes, setSavedNotes] = useState<LocalSavedNote[]>([]);
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyNoticeDismissed, setPrivacyNoticeDismissed] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let live = true;
    fetchJson<BootstrapData>("/api/bootstrap")
      .then((payload) => {
        if (!live) return;
        setData(payload);
        const persisted = loadVisibleSystems();
        setVisibleSystemIds(persisted ?? payload.systems.map((system) => system.id));
        setLoading(false);
      })
      .catch((error: Error) => {
        if (!live) return;
        setLoadError(error.message || "Could not load the research catalog.");
        setLoading(false);
      });
    setHistory(loadHistory());
    setSavedNotes(loadSavedNotes());
    setTheme(loadTheme());
    setPrivacyNoticeDismissed(loadPrivacyNoticeDismissed());
    return () => { live = false; };
  }, []);

  const calculationText = useMemo(() => inputMode === "transliteration" && data
    ? resolveTransliteration(input, data.lexemes)
    : input, [input, inputMode, data]);

  const eligibleSystems = useMemo(() => {
    if (!data) return [];
    const expectedLanguage = MODE_SYSTEM_LANGUAGE[inputMode];
    return data.systems.filter((system) => system.language === expectedLanguage && (visibleSystemIds === null || visibleSystemIds.includes(system.id)));
  }, [data, inputMode, visibleSystemIds]);

  const calculatedResults = useMemo(() => {
    const pairs = eligibleSystems.flatMap((system) => {
      const definition = SYSTEM_DEFINITIONS.find((candidate) => candidate.id === system.id);
      if (!definition) return [];
      const result = calculate(calculationText, definition);
      return result ? [{ system, result }] : [];
    });
    return pairs;
  }, [eligibleSystems, calculationText]);

  const selectedPair = calculatedResults.find((pair) => pair.system.id === selectedSystemId) ?? calculatedResults[0] ?? null;
  const selectedSystem = selectedPair?.system ?? null;
  const selectedResult = selectedPair?.result ?? null;
  const currentWordCount = Math.max(1, input.trim().split(/\s+/u).filter(Boolean).length);
  const lexemeById = useMemo(() => new Map((data?.lexemes ?? []).map((lexeme) => [lexeme.id, lexeme])), [data]);
  const sourceById = useMemo(() => new Map((data?.sources ?? []).map((source) => [source.id, source])), [data]);
  const selectedMethodSource = selectedSystem ? sourceById.get(selectedSystem.source_ref) ?? null : null;

  useEffect(() => {
    if (!data || !selectedPair) {
      setBaseline(null);
      setBaselineError("");
      return;
    }
    let live = true;
    setBaselineLoading(true);
    setBaselineError("");
    const params = new URLSearchParams({ systemId: selectedPair.system.id, value: String(selectedPair.result.value), wordCount: String(currentWordCount) });
    fetchJson<BaselineRecord>(`/api/baseline?${params}`)
      .then((result) => { if (live) setBaseline(result); })
      .catch((error: Error) => { if (live) { setBaseline(null); setBaselineError(error.message); } })
      .finally(() => { if (live) setBaselineLoading(false); });
    return () => { live = false; };
  }, [data, selectedSystemId, calculationVersion, inputMode]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const setExample = (value: string, mode: InputMode) => {
    setInput(value);
    setInputMode(mode);
    setInputError("");
    setBaseline(null);
    const language = MODE_SYSTEM_LANGUAGE[mode];
    const firstSystem = data?.systems.find((system) => system.language === language && (visibleSystemIds === null || visibleSystemIds.includes(system.id)));
    if (firstSystem) setSelectedSystemId(firstSystem.id);
  };

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setInputError("");
    setBaseline(null);
    const language = MODE_SYSTEM_LANGUAGE[mode];
    const firstSystem = data?.systems.find((system) => system.language === language && (visibleSystemIds === null || visibleSystemIds.includes(system.id)));
    if (firstSystem) setSelectedSystemId(firstSystem.id);
  };

  const handleCalculate = () => {
    if (!input.trim()) {
      setInputError("Enter a word, phrase, or sentence to calculate.");
      return;
    }
    if (input.length > 260) {
      setInputError("Please keep a calculation under 260 characters.");
      return;
    }
    if (!calculatedResults.length) {
      setInputError("No supported letters were found for this input mode. Check the script or choose another mode.");
      return;
    }
    setInputError("");
    setCalculationVersion((value) => value + 1);
    setHistory(saveHistory(input, calculatedResults.map((pair) => pair.system.id)));
    showToast("Calculation recorded in local history.");
  };

  const loadEtymology = useCallback(async (term: string) => {
    const q = term.trim();
    if (!q) {
      setEtymologyError("Enter a term or transliteration to look up.");
      return;
    }
    setEtymologyLoading(true);
    setEtymologyError("");
    try {
      const result = await fetchJson<EtymologyPayload>(`/api/etymology?q=${encodeURIComponent(q)}`);
      setEtymologyData(result);
      if (!result.lexeme) {
        setEtymologyError("No exact lexeme match was found in the curated catalog.");
        const nearby = await fetchJson<{ results: Array<Lexeme & { match?: string }> }>(`/api/search?q=${encodeURIComponent(q)}`);
        setLexemeSuggestions(nearby.results);
      } else {
        setLexemeSuggestions([]);
      }
    } catch (error) {
      setEtymologyError(error instanceof Error ? error.message : "Lookup failed.");
    } finally {
      setEtymologyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    void loadEtymology("shalom");
    void runVerseSearch("שלום", "word");
    // Initial demo content is loaded once; further lookups are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function runVerseSearch(query = verseQuery, mode = verseMode) {
    setVerseLoading(true);
    setVerseError("");
    try {
      const params = new URLSearchParams();
      if (mode === "word") params.set("q", query.trim());
      else if (selectedPair) {
        params.set("systemId", selectedPair.system.id);
        params.set("value", String(selectedPair.result.value));
      }
      if (!params.size) throw new Error("Select a valid calculated result first.");
      const result = await fetchJson<{ verses: VerseResult[] }>(`/api/verses?${params}`);
      setVerseResults(result.verses);
      if (!result.verses.length) setVerseError("No matching verse is present in the compact sample corpus.");
    } catch (error) {
      setVerseResults([]);
      setVerseError(error instanceof Error ? error.message : "Verse search failed.");
    } finally {
      setVerseLoading(false);
    }
  }

  async function submitAnalyst(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analystQuestion.trim()) {
      setAnalystError("Enter a question for the Research Analyst.");
      return;
    }
    setAnalystLoading(true);
    setAnalystError("");
    setAnalystResponse(null);
    try {
      const result = await fetchJson<AnalystPayload>("/api/analyst", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: analystQuestion.trim(), topicId: analystTopicId || undefined }),
      });
      setAnalystResponse(result);
    } catch (error) {
      setAnalystError(error instanceof Error ? error.message : "Research Analyst request failed.");
    } finally {
      setAnalystLoading(false);
    }
  }

  const saveCurrentResult = () => {
    if (!selectedResult || !selectedSystem) {
      showToast("Calculate a supported word first.");
      return;
    }
    const noteTitle = `${input} · ${selectedSystem.name} = ${selectedResult.value}`;
    const noteBody = `Calculation saved from the deterministic ${selectedSystem.name} system. Reduced value: ${selectedResult.reducedValue}.`;
    setSavedNotes(saveNote({ refType: "calculation", refId: `${selectedSystem.id}:${selectedResult.value}`, title: noteTitle, note: noteBody }));
    showToast("Saved to this browser.");
  };

  const exportMarkdown = (title = "Gematria Lab research session", body?: string) => {
    const sourceLines = selectedMethodSource ? [`- Method source: ${selectedMethodSource.title}${selectedMethodSource.url ? ` — ${selectedMethodSource.url}` : ""}`] : [];
    const resultLines = selectedResult && selectedSystem ? [
      `Input: ${input}`,
      `Mode: ${inputMode}`,
      `System: ${selectedSystem.name}`,
      `Value: ${selectedResult.value}`,
      `Reduced value: ${selectedResult.reducedValue}`,
      `Letter breakdown: ${selectedResult.breakdown.map((part) => `${part.char}${part.transformed ? `→${part.transformed}` : ""} ${part.value}`).join(" · ")}`,
      ...(baseline ? [`Reference lexicon: ${baseline.matchCount}/${baseline.total} entries share this value.`, `Random phrase simulation: ${baseline.randomPhraseMatches}/${baseline.randomPhraseTrials} matches for ${baseline.wordCount} token(s). Model: ${baseline.model}`] : []),
      ...sourceLines,
    ] : [];
    const markdown = [
      `# ${title}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      ...(body ? [body, ""] : []),
      ...(resultLines.length ? ["## Calculation", ...resultLines, ""] : []),
      "## Research boundary",
      "Educational research tool, not proof; patterns do not establish causation. A numeric match alone is not evidence of historical, semantic, or causal connection.",
      "",
      ...(data ? ["## Curated source catalog", ...data.sources.slice(0, 8).map((source) => `- ${source.title}${source.url ? ` — ${source.url}` : ""}`)] : []),
    ].join("\n");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gematria-lab-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Markdown export downloaded.");
  };

  const handleHistoryOpen = (item: LocalHistoryItem) => {
    setInput(item.inputText);
    setInputMode(inferMode(item.inputText));
    const mode = inferMode(item.inputText);
    const firstSystem = data?.systems.find((system) => system.language === MODE_SYSTEM_LANGUAGE[mode] && item.systemIds.includes(system.id));
    if (firstSystem) setSelectedSystemId(firstSystem.id);
    setActiveTab("calculator");
    setCalculationVersion((value) => value + 1);
  };

  const updateVisibility = (systemId: string, checked: boolean) => {
    const next = new Set(visibleSystemIds ?? data?.systems.map((system) => system.id) ?? []);
    if (checked) next.add(systemId); else next.delete(systemId);
    const visible = [...next];
    setVisibleSystemIds(visible);
    saveVisibleSystems(visible);
    if (!visible.includes(selectedSystemId)) {
      const firstVisible = data?.systems.find((system) => visible.includes(system.id) && system.language === MODE_SYSTEM_LANGUAGE[inputMode]);
      if (firstVisible) setSelectedSystemId(firstVisible.id);
    }
  };

  const sameValueMatches = useMemo(() => {
    if (!data || !selectedResult || !selectedSystem) return [];
    const queryWords = new Set(calculationText.toLowerCase().split(/\s+/u).map((word) => word.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean));
    return data.lexemeValues.filter((entry) => entry.system_id === selectedSystem.id && entry.value === selectedResult.value)
      .map((entry) => lexemeById.get(entry.lexeme_id))
      .filter((lexeme): lexeme is Lexeme => Boolean(lexeme) && !queryWords.has((lexeme as Lexeme).text.toLowerCase()))
      .slice(0, 10);
  }, [data, selectedResult, selectedSystem, lexemeById, calculationText]);

  const crossLanguageMatches = useMemo(() => {
    if (!data || !selectedResult || !selectedSystem) return [];
    const nativeSystemByLanguage: Record<string, string> = { heb: "hebrew-standard", grc: "greek-isopsephy", eng: "latin-ordinal", lat: "latin-ordinal", ara: "arabic-abjad", arc: "hebrew-standard" };
    const currentLanguageFamily = new Set(inputMode === "hebrew" || inputMode === "transliteration" ? ["heb", "arc"] : inputMode === "english" ? ["eng", "lat"] : [MODE_SYSTEM_LANGUAGE[inputMode]]);
    const totals = new Map<string, number>();
    const matches = new Map<string, number>();
    for (const entry of data.lexemeValues) {
      totals.set(entry.system_id, (totals.get(entry.system_id) ?? 0) + 1);
      if (entry.value === selectedResult.value) matches.set(entry.system_id, (matches.get(entry.system_id) ?? 0) + 1);
    }
    return data.lexemeValues.flatMap((entry) => {
      if (entry.value !== selectedResult.value) return [];
      const lexeme = lexemeById.get(entry.lexeme_id);
      if (!lexeme || currentLanguageFamily.has(lexeme.language)) return [];
      const nativeSystemId = nativeSystemByLanguage[lexeme.language];
      if (entry.system_id !== nativeSystemId) return [];
      const nativeSystem = data.systems.find((system) => system.id === nativeSystemId);
      if (!nativeSystem) return [];
      return [{ lexeme, system: nativeSystem, matchCount: matches.get(nativeSystemId) ?? 0, total: totals.get(nativeSystemId) ?? 0 }];
    }).slice(0, 8);
  }, [data, selectedResult, selectedSystem, lexemeById, inputMode]);

  const activeTopic = data?.topics.find((topic) => topic.id === selectedTopicId) ?? null;
  const filteredTopics = (data?.topics ?? []).filter((topic) => `${topic.title} ${topic.category} ${topic.summary}`.toLowerCase().includes(topicFilter.toLowerCase()));
  const filteredSources = (data?.sources ?? []).filter((source) => `${source.title} ${source.author ?? ""} ${source.type}`.toLowerCase().includes(sourceFilter.toLowerCase()));
  const activeEtymologyEntry = etymologyData?.entries[0];
  const etymologyRoot = activeEtymologyEntry?.fromLexeme ?? (etymologyData?.lexeme?.root_id ? lexemeById.get(etymologyData.lexeme.root_id) ?? null : null);
  const currentLexemeSources = etymologyData?.lexeme ? (data?.lexemeSources ?? []).filter((link) => link.lexeme_id === etymologyData.lexeme?.id) : [];
  const wordBreakdown = selectedSystem ? calculateWords(calculationText, SYSTEM_DEFINITIONS.find((system) => system.id === selectedSystem.id)!).filter((item) => item.word.trim()) : [];
  const mathFactors = selectedResult ? primeFactors(selectedResult.value) : [];
  const isPrime = selectedResult ? selectedResult.value > 1 && mathFactors.length === 1 && mathFactors[0] === selectedResult.value : false;

  const setThemeValue = (next: "light" | "dark") => {
    setTheme(next);
    saveTheme(next);
  };

  const renderSourceLinks = (claim: Claim) => (
    <div className="claim-sources">
      {claim.sources.map((item) => <SourceChip key={`${claim.id}-${item.source.id}`} source={item.source} compact />)}
    </div>
  );

  const renderClaim = (claim: Claim) => (
    <article className="claim-card" key={claim.id}>
      <div className="claim-card-top"><ConfidenceBadge tag={claim.confidence} /><span className="claim-card-byline" /></div>
      <p>{claim.statement}</p>
      <div className="claim-byline">Attributed to: {claim.made_by}</div>
      <p className="claim-status">{claim.status_note}</p>
      {renderSourceLinks(claim)}
    </article>
  );

  const renderCalculator = () => (
    <>
      <div className="view-header">
        <div className="view-title-wrap">
          <span className="kicker">01 · deterministic engine</span>
          <h2>Gematria calculator</h2>
          <p>See each letter, its lookup-table value, the total, and a transparent comparison baseline. No AI is involved in the math.</p>
        </div>
        <div className="view-tools">
          <button type="button" className="quiet-button" onClick={saveCurrentResult}><Icon name="bookmark" size={15} /> Save</button>
          <button type="button" className="quiet-button" onClick={() => exportMarkdown()}><Icon name="download" size={15} /> Export .md</button>
          <button type="button" className="quiet-button" onClick={() => window.print()}><Icon name="document" size={15} /> Print / PDF</button>
        </div>
      </div>
      <div className="calculator-layout">
        <div className="calc-main">
          <div className="input-panel">
            <div className="input-panel-top"><label className="field-label" htmlFor="calculator-input">Word · phrase · sentence</label><span className="character-count">{input.length}/260</span></div>
            <div className="mode-switch" role="group" aria-label="Input writing system">
              {([
                ["hebrew", "Hebrew"], ["transliteration", "Latin transliteration"], ["greek", "Greek"], ["english", "English"], ["arabic", "Arabic"],
              ] as Array<[InputMode, string]>).map(([mode, label]) => <button key={mode} type="button" className={`mode-button${inputMode === mode ? " mode-button-active" : ""}`} onClick={() => handleModeChange(mode)} aria-pressed={inputMode === mode}>{label}</button>)}
            </div>
            <textarea
              id="calculator-input"
              className="input-textarea"
              value={input}
              onChange={(event) => { setInput(event.target.value.slice(0, 260)); setBaseline(null); setInputError(""); }}
              maxLength={260}
              dir={inputMode === "hebrew" || inputMode === "arabic" ? "rtl" : "ltr"}
              lang={inputMode === "hebrew" || inputMode === "transliteration" ? "he" : inputMode === "greek" ? "el" : inputMode === "arabic" ? "ar" : "en"}
              placeholder={inputMode === "hebrew" ? "הקלידו מילה או משפט" : "Enter a word or phrase"}
              aria-describedby="input-help"
            />
            <div className="input-footer">
              <span className="input-hint" id="input-help">
                {inputMode === "hebrew" ? "Niqqud and cantillation marks are stripped before calculation. Final-letter rules are explicit per system." : inputMode === "transliteration" ? "Known catalog spellings use their lexicon form; unknown spellings use a consonant-focused transliteration helper." : "Unsupported characters and punctuation are ignored; only letters present in the selected lookup table count."}
              </span>
              <div className="input-actions">
                <button type="button" className="tiny-button" onClick={() => { setInput(""); setBaseline(null); setInputError(""); }} aria-label="Clear calculator input">Clear</button>
                <button type="button" className="primary-button" onClick={handleCalculate}><Icon name="spark" size={16} /> Calculate values</button>
              </div>
            </div>
            {inputError && <p className="input-notice" role="alert">{inputError}</p>}
            <div className="example-row"><span className="example-label">Try a seeded term</span>
              <button type="button" className="example-chip" onClick={() => setExample("שלום", "hebrew")}>שלום</button>
              <button type="button" className="example-chip" onClick={() => setExample("אהבה", "hebrew")}>אהבה</button>
              <button type="button" className="example-chip" onClick={() => setExample("shalom", "transliteration")}>shalom</button>
              <button type="button" className="example-chip" onClick={() => setExample("λόγος", "greek")}>λόγος</button>
              <button type="button" className="example-chip" onClick={() => setExample("truth", "english")}>truth</button>
              <button type="button" className="example-chip" onClick={() => setExample("سلام", "arabic")}>سلام</button>
            </div>
          </div>

          <div className="calc-meta-row"><span className="result-count">{calculatedResults.length ? `${calculatedResults.length} applicable system${calculatedResults.length === 1 ? "" : "s"} · combined total across ${currentWordCount} word${currentWordCount === 1 ? "" : "s"}` : "No compatible system result"}</span><span className="deterministic-tag"><Icon name="shield" size={13} /> lookup-table math</span></div>
          {calculatedResults.length ? (
            <div className="results-grid" key={`${input}-${calculationVersion}-${inputMode}`}>
              {calculatedResults.map(({ system, result }) => <ResultCard key={`${system.id}-${calculationVersion}`} system={system} result={result} selected={system.id === selectedPair?.system.id} onSelect={() => { setSelectedSystemId(system.id); setCalculationVersion((value) => value + 1); }} />)}
            </div>
          ) : <EmptyState icon="calculator" title="No letters were recognized" text="Choose a writing-system tab that matches your input, or enter a term in one of the supported scripts." />}

          {currentWordCount > 1 && selectedSystem && wordBreakdown.length > 0 && (
            <div className="phrase-breakdown">
              <div className="phrase-breakdown-head"><strong>Word-by-word breakdown</strong><span>{selectedSystem.name} · spaces preserved</span></div>
              <div className="word-totals" dir={inputMode === "hebrew" ? "rtl" : "ltr"}>
                {wordBreakdown.map(({ word, result }, index) => <span className="word-total" key={`${index}-${word}`}><span className="word-total-text">{word}</span><span className="word-total-number">{result?.value ?? "—"}</span></span>)}
              </div>
            </div>
          )}
          {selectedMethodSource && selectedSystem && <div className="method-footnote" style={{ marginTop: 12 }}>
            Method: {selectedSystem.description} {selectedMethodSource && <SourceChip source={selectedMethodSource} compact />}
          </div>}
        </div>

        <aside className="calc-rail" aria-label="Baseline and number checks">
          <section className="rail-card">
            <div className="rail-card-head"><h3 className="rail-title"><span className="rail-icon"><Icon name="filter" size={15} /></span>Coincidence baseline</h3><span className="confidence-badge confidence-contested">CONTEXT</span></div>
            <div className="rail-card-body">
              {baselineLoading ? <div className="loading-state" style={{ minHeight: 85 }}><span className="spinner" /> Running sample</div> : baseline ? <>
                <p className="baseline-intro">Same-value entries in the compatible reference lexicon. This is a compact seed corpus, not a universal base rate.</p>
                <div className="baseline-numbers"><strong className="baseline-big">{baseline.matchCount}<span style={{ fontSize: 16, color: "var(--subtle)" }}> / {baseline.total}</span></strong><span className="baseline-side">catalog terms<br />share this value</span></div>
                <div className="baseline-bar" aria-label={`${baseline.matchCount} of ${baseline.total} terms match`}><span className="baseline-bar-fill" style={{ width: `${Math.max(1, baseline.matchCount / baseline.total * 100)}%` }} /></div>
                <div className="baseline-caption"><span>Observed lexeme frequency</span><span>{(baseline.matchCount / baseline.total * 100).toFixed(1)}%</span></div>
                <div className="baseline-sim"><span>{baseline.randomPhraseTrials.toLocaleString()} simulated phrase draws<br /><small>{baseline.wordCount} token{baseline.wordCount === 1 ? "" : "s"}, same system</small></span><strong>{baseline.randomPhraseMatches} / {baseline.randomPhraseTrials.toLocaleString()}</strong></div>
                <p className="method-footnote">{baseline.model} Values are seeded and reproducible. A low or high match rate does not show meaning or causation.</p>
              </> : <div className="rail-empty">{baselineError || "A baseline will appear after a supported term is calculated."}</div>}
            </div>
          </section>

          <section className="rail-card">
            <div className="rail-card-head"><h3 className="rail-title"><span className="rail-icon"><Icon name="link" size={15} /></span>Same value in catalog</h3><span className="nav-badge">{sameValueMatches.length}</span></div>
            <div className="rail-card-body">
              <p className="baseline-intro">Numerical equality only. These are not asserted to share an etymology or historical connection.</p>
              {sameValueMatches.length ? <div className="match-list">{sameValueMatches.slice(0, 5).map((lexeme) => <button type="button" key={lexeme.id} className="match-row" onClick={() => { setEtymologyTerm(lexeme.transliteration || lexeme.text); setActiveTab("etymology"); void loadEtymology(lexeme.transliteration || lexeme.text); }}><span className="match-word"><span className="match-glyph" dir="auto">{lexeme.text}</span><span className="match-translit">{lexeme.transliteration}</span></span><span className="match-value">{selectedResult?.value}</span></button>)}</div> : <div className="rail-empty">No other catalog entries share this total yet. Try אהבה: its standard value also appears in the word אחד.</div>}
            </div>
          </section>

          <section className="rail-card">
            <div className="rail-card-head"><h3 className="rail-title"><span className="rail-icon"><Icon name="globe" size={15} /></span>Cross-language totals</h3><span className="nav-badge">{crossLanguageMatches.length}</span></div>
            <div className="rail-card-body">
              <p className="baseline-intro">Each language uses its named comparison system. The observed match fraction is shown beside every cross-language equality.</p>
              {crossLanguageMatches.length ? <div className="match-list">{crossLanguageMatches.map(({ lexeme, system, matchCount, total }) => <button type="button" key={`${lexeme.id}-${system.id}`} className="match-row" onClick={() => { setEtymologyTerm(lexeme.transliteration || lexeme.text); setActiveTab("etymology"); void loadEtymology(lexeme.transliteration || lexeme.text); }}><span className="match-word"><span className="match-glyph" dir="auto">{lexeme.text}</span><span className="match-translit">{system.name}</span></span><span className="match-value">{matchCount}/{total}</span></button>)}</div> : <div className="rail-empty">No cross-language lexeme in the seed catalog has this total under its listed comparison system.</div>}
              <p className="method-footnote">Different languages and schemes are not semantically comparable. Numeric equality only; baseline shown as matching entries / total entries in each native scheme.</p>
            </div>
          </section>

          <section className="rail-card">
            <div className="rail-card-head"><h3 className="rail-title"><span className="rail-icon"><Icon name="spark" size={15} /></span>Number checks</h3></div>
            <div className="rail-card-body">
              {selectedResult ? <>
                <div className="math-facts">
                  <div className="math-fact"><span>Prime</span><strong>{selectedResult.value === 1 ? "Neither" : isPrime ? "Yes" : "No"}</strong></div>
                  <div className="math-fact"><span>Digit root</span><strong>{digitRoot(selectedResult.value)}</strong></div>
                  <div className="math-fact"><span>Triangular</span><strong>{isTriangular(selectedResult.value) ? "Yes" : "No"}</strong></div>
                  <div className="math-fact"><span>Fibonacci</span><strong>{isFibonacci(selectedResult.value) ? "Yes" : "No"}</strong></div>
                  <div className="math-fact" style={{ gridColumn: "1 / -1" }}><span>Prime factors</span><strong>{mathFactors.length ? mathFactors.join(" × ") : selectedResult.value < 2 ? "—" : "1"}</strong></div>
                </div>
                <div className="ratio-compare"><label htmlFor="ratio-target">Compare this total with another</label><div className="ratio-row"><strong>{selectedResult.value}</strong><span>:</span><input id="ratio-target" type="number" min="0" max="10000000" value={ratioTarget} onChange={(event) => setRatioTarget(event.target.value)} placeholder="e.g. 13" /></div>{ratioTarget.trim() && Number.isSafeInteger(Number(ratioTarget)) && Number(ratioTarget) >= 0 && <p>Simplified ratio: <strong>{formatRatio(selectedResult.value, Number(ratioTarget))}</strong></p>}</div>
                <p className="math-boundary">Arithmetic properties describe the number only; they do not establish symbolic intent.</p>
              </> : <div className="rail-empty">Calculate a supported term to see arithmetic checks.</div>}
            </div>
          </section>
        </aside>
      </div>
    </>
  );

  const renderEtymology = () => (
    <>
      <div className="view-header"><div className="view-title-wrap"><span className="kicker">02 · language history</span><h2>Etymology & meaning</h2><p>Follow only lexicon-supported links. Similar sounds or matching numbers are not etymological evidence.</p></div>
        <div className="view-tools"><button type="button" className="quiet-button" onClick={() => { setEtymologyTerm(input); void loadEtymology(input); }}><Icon name="calculator" size={15} /> Use calculator input</button></div>
      </div>
      <form className="etymology-search" onSubmit={(event) => { event.preventDefault(); void loadEtymology(etymologyTerm); }}>
        <input className="search-input" value={etymologyTerm} onChange={(event) => setEtymologyTerm(event.target.value)} placeholder="Search a lexeme or transliteration, e.g. shalom" aria-label="Etymology term" />
        <button className="primary-button" type="submit" disabled={etymologyLoading}>{etymologyLoading ? <><span className="spinner" /> Looking up</> : <><Icon name="search" size={15} /> Look up term</>}</button>
      </form>
      {etymologyError && <div className="error-banner" role="status">{etymologyError}</div>}
      {lexemeSuggestions.length > 0 && <div className="panel" style={{ marginBottom: 12 }}><div className="panel-title">Nearest catalog matches</div><div className="match-list">{lexemeSuggestions.map((lexeme) => <button type="button" key={lexeme.id} className="match-row" onClick={() => { const term = lexeme.transliteration || lexeme.text; setEtymologyTerm(term); void loadEtymology(term); }}><span className="match-word"><span className="match-glyph" dir="auto">{lexeme.text}</span><span className="match-translit">{lexeme.transliteration} · {lexeme.match}</span></span><span className="match-value">{lexeme.gloss}</span></button>)}</div></div>}
      {etymologyLoading && !etymologyData ? <div className="loading-state"><span className="spinner" /> Loading lexicon records</div> : etymologyData?.lexeme ? <div className="lookup-result">
        <div className="lexeme-heading"><span className={`lexeme-glyph${etymologyData.lexeme.language === "eng" || etymologyData.lexeme.language === "lat" ? " lexeme-glyph-plain" : ""}`} dir="auto">{etymologyData.lexeme.text}</span><span className="lexeme-translit">{etymologyData.lexeme.transliteration}</span></div>
        <p className="gloss-text">{etymologyData.lexeme.gloss || "No gloss entered in the current seed catalog."}</p>
        <div className="lexeme-meta">{etymologyData.lexeme.strongs_id && <span className="meta-tag">{etymologyData.lexeme.strongs_id}</span>}{etymologyData.lexeme.part_of_speech && <span className="meta-tag">{etymologyData.lexeme.part_of_speech}</span>}<span className="meta-tag">{etymologyData.lexeme.language.toUpperCase()}</span></div>
        {currentLexemeSources.length > 0 && <div className="claim-sources" style={{ marginTop: 10 }}><span className="meta-tag">Gloss reference</span>{currentLexemeSources.map((link) => <SourceChip key={link.source.id} source={link.source} />)}</div>}
        {etymologyRoot && etymologyData.entries.length > 0 ? <div className="etymology-chain" aria-label="Sourced etymology chain">
          <div className="chain-node"><strong dir="auto">{etymologyRoot.text}</strong><span>{etymologyRoot.transliteration || etymologyRoot.strongs_id || "root/related form"}</span></div>
          <span className="chain-arrow"><Icon name="arrow" size={20} /></span>
          <div className="chain-node"><strong dir="auto">{etymologyData.lexeme.text}</strong><span>{etymologyData.lexeme.transliteration || "derived form"}</span></div>
        </div> : <div className="etymology-warning" style={{ marginTop: 16 }}>No sourced etymology chain is included for this entry in the current seed corpus. That is a limit of this dataset, not proof that no scholarly etymology exists.</div>}
        {etymologyData.entries.length ? etymologyData.entries.map((entry) => <div key={entry.id} className="etymology-note">
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}><ConfidenceBadge tag={entry.confidence} /><span className="meta-tag">{entry.relation.replaceAll("_", " ")}</span></div>
          {entry.explanation}<div className="claim-sources" style={{ marginTop: 9 }}><SourceChip source={entry.source} /></div>
        </div>) : null}
        <div className="etymology-warning"><strong>Folk etymology check.</strong> This lab distinguishes lexicon-supported history from popular wordplay. A resemblance, translation, or number match is not enough to establish a root; unsupported claims are left unasserted.</div>
        <div className="topic-detail-actions"><Link className="secondary-button" href={`/term/${encodeURIComponent(safeSlugTerm(etymologyData.lexeme))}`}><Icon name="external" size={14} /> SEO term page</Link></div>
      </div> : !etymologyError && <EmptyState icon="book" title="No term selected" text="Search an exact Hebrew, Greek, Latin, Arabic, or English lexeme from the curated catalog." />}
      <div className="disclaimer-strip"><Icon name="shield" size={15} />Lexicon glosses are concise study aids, not a substitute for the cited reference edition or context.</div>
    </>
  );

  const renderVerses = () => (
    <>
      <div className="view-header"><div className="view-title-wrap"><span className="kicker">03 · text corpus</span><h2>Verse finder</h2><p>Search a word in the sample Hebrew corpus, or find words whose precomputed value matches the selected system and total.</p></div></div>
      <div className="panel">
        <div className="verse-toolbar">
          <div className="search-row">
            {verseMode === "word" ? <input className="search-input search-input-rtl" dir="auto" value={verseQuery} onChange={(event) => setVerseQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void runVerseSearch(); } }} placeholder="Enter Hebrew word or transliteration" aria-label="Verse word search" /> : <div className="search-input" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--muted)" }}><span>{selectedSystem?.name || "Select a system"}</span><strong style={{ color: "var(--moss)" }}>{selectedResult?.value ?? "—"}</strong></div>}
            <button type="button" className="primary-button" onClick={() => void runVerseSearch()} disabled={verseLoading}>{verseLoading ? <><span className="spinner" /> Searching</> : <><Icon name="search" size={15} /> Find verses</>}</button>
          </div>
          <div className="segmented-control" role="group" aria-label="Verse search mode">
            <button type="button" className={`segmented-button${verseMode === "word" ? " segmented-button-active" : ""}`} onClick={() => setVerseMode("word")}>By word</button>
            <button type="button" className={`segmented-button${verseMode === "value" ? " segmented-button-active" : ""}`} onClick={() => setVerseMode("value")}>By value</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, color: "var(--muted)", fontSize: 9 }}>
          <span>Corpus: selected study verses · Hebrew</span>
          {verseMode === "value" && baseline && <span>Baseline: {baseline.matchCount}/{baseline.total} catalog entries · {baseline.randomPhraseMatches}/{baseline.randomPhraseTrials.toLocaleString()} simulated phrases</span>}
        </div>
      </div>
      {verseError && <div className={verseError.startsWith("No matching") ? "success-banner" : "error-banner"} style={{ marginTop: 10 }} role="status">{verseError}</div>}
      {verseLoading ? <div className="loading-state"><span className="spinner" /> Searching verse tokens</div> : verseResults.length ? <div style={{ marginTop: 12 }}>
        {verseResults.map((verse) => <article className="verse-card" key={verse.id}>
          <div className="verse-ref"><span>{verse.book} {verse.chapter}:{verse.verse_no}</span><span>{verse.language.toUpperCase()} · {verse.matches?.length ?? 0} matched token{verse.matches?.length === 1 ? "" : "s"}</span></div>
          <p className="verse-text" dir="rtl" lang="he">{verse.text}</p>
          {verse.matches?.length ? <div className="verse-matches">{verse.matches.map((match) => <span key={`${verse.id}-${match.position}`} className="verse-match-chip"><strong dir="rtl">{match.surface_form}</strong><span>{match.lexeme.transliteration}</span>{selectedSystem && match.values.find((value) => value.system_id === selectedSystem.id) && <b>{match.values.find((value) => value.system_id === selectedSystem.id)?.value}</b>}</span>)}</div> : null}
          <div className="claim-sources" style={{ marginTop: 11 }}>{verse.source && <SourceChip source={verse.source} compact />}</div>
        </article>)}
      </div> : !verseLoading && !verseError && <EmptyState icon="search" title="Search the sample corpus" text="Try שלום to locate Psalm 122:6, or switch to value mode to compare a deterministic total." />}
      <div className="disclaimer-strip"><Icon name="shield" size={15} />This starter includes selected verses only. Empty results reflect corpus coverage, not absence from the full text.</div>
    </>
  );

  const renderAnalyst = () => (
    <>
      <div className="view-header"><div className="view-title-wrap"><span className="kicker">04 · retrieval before interpretation</span><h2>Research analyst</h2><p>Ask about a curated topic. The analyst separates documented records, attributed or debunked claims, and what this dataset cannot establish.</p></div>
        <div className="view-tools"><button type="button" className="quiet-button" onClick={() => exportMarkdown("Gematria Lab analyst brief", analystResponse?.answer)} disabled={!analystResponse}><Icon name="download" size={15} /> Export brief</button></div>
      </div>
      <div className="analyst-grid">
        <form className="analyst-form" onSubmit={submitAnalyst}>
          <label className="field-label" htmlFor="analyst-question">Research question</label>
          <textarea id="analyst-question" className="form-textarea analyst-question" maxLength={800} value={analystQuestion} onChange={(event) => setAnalystQuestion(event.target.value)} placeholder="Example: What does the Antarctic Treaty actually say about peaceful use?" />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "end", gap: 10, marginTop: 10 }}>
            <label className="field-label" htmlFor="analyst-topic">Limit retrieval to a topic (optional)
              <select id="analyst-topic" className="select-input" style={{ display: "block", marginTop: 6, fontWeight: 400, letterSpacing: 0, textTransform: "none" }} value={analystTopicId} onChange={(event) => setAnalystTopicId(event.target.value)}>
                <option value="">Search all curated topics</option>{(data?.topics ?? []).map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
              </select>
            </label>
            <button type="submit" className="primary-button" disabled={analystLoading}>{analystLoading ? <><span className="spinner" /> Retrieving</> : <><Icon name="message" size={15} /> Build brief</>}</button>
          </div>
          {analystError && <div className="error-banner" style={{ marginTop: 10 }} role="alert">{analystError}</div>}
          <p className="method-footnote" style={{ marginTop: 10 }}>Submitting sends the question to this app&apos;s server. If the operator enables a supported external model, the question and retrieved source context are also sent to Anthropic; otherwise the response is retrieval-only. See <Link href="/privacy">Privacy</Link>.</p>
          <div className="example-row" style={{ marginTop: 14 }}><span className="example-label">Try</span>
            <button type="button" className="example-chip" onClick={() => { setAnalystQuestion("What does the Antarctic Treaty say about peaceful use and scientific research?"); setAnalystTopicId("topic-antarctica"); }}>Treaty text</button>
            <button type="button" className="example-chip" onClick={() => { setAnalystQuestion("What is documented in the 2019 Epstein federal charging announcement?"); setAnalystTopicId("topic-epstein"); }}>Court record</button>
            <button type="button" className="example-chip" onClick={() => { setAnalystQuestion("Is the Protocols of the Elders of Zion an authentic historical record?"); setAnalystTopicId("topic-propaganda-history"); }}>Propaganda history</button>
          </div>
        </form>
        <aside className="analyst-boundary"><h3><Icon name="shield" size={16} /> Evidence guardrails</h3><p>Claims are retrieved only when a source row exists. Provider keys remain server-side. Without both a key and supported model, this screen uses a transparent, deterministic retrieval brief. No new math is generated here.</p><p style={{ marginTop: 9 }}>No sourced record found means “not established in this dataset,” not “disproved.”</p></aside>
      </div>
      {analystResponse && <section className="analyst-response" aria-live="polite">
        <div className="analyst-response-head"><h3>Research brief</h3><span className="mode-label">{analystResponse.mode === "ai-summary" ? "AI summary · server proxy" : "Curated retrieval · no model"}</span></div>
        <pre className="analyst-answer">{analystResponse.answer}</pre>
        {analystResponse.documented.length > 0 && <><div className="divider-label">Documented in retrieved sources</div><div className="claim-grid">{analystResponse.documented.map(renderClaim)}</div></>}
        {analystResponse.contestedOrClaimed.length > 0 && <><div className="divider-label">Claimed by others · contested · debunked</div><div className="claim-grid">{analystResponse.contestedOrClaimed.map(renderClaim)}</div></>}
        <div className="etymology-warning" style={{ marginTop: 12 }}><strong>Unsupported / not established:</strong> {analystResponse.unsupportedNote}<br /><strong>Numerological observations:</strong> {analystResponse.numerologicalNote}<br /><strong>{analystResponse.disclaimer}</strong></div>
        {analystResponse.topics.length > 0 && <div className="topic-detail-actions">{analystResponse.topics.map((topic) => <button key={topic.id} type="button" className="secondary-button" onClick={() => { setSelectedTopicId(topic.id); setActiveTab("topics"); }}>{topic.title}</button>)}</div>}
      </section>}
      <div className="disclaimer-strip"><Icon name="shield" size={15} />Educational research tool, not proof; patterns do not establish causation. Allegations are not findings of guilt.</div>
    </>
  );

  const renderTopics = () => (
    <>
      <div className="view-header"><div className="view-title-wrap"><span className="kicker">05 · cited topic library</span><h2>Topics & claim sets</h2><p>Small, curated dossiers with citations and confidence tags. Public record, interpretation, and speculation are never blended into one claim.</p></div>
        <div className="view-tools"><button type="button" className="quiet-button" onClick={() => { setAnalystTopicId(selectedTopicId); setAnalystQuestion(activeTopic ? `What is documented about ${activeTopic.title}?` : ""); setActiveTab("analyst"); }}><Icon name="message" size={15} /> Ask analyst</button></div>
      </div>
      {activeTopic && <section className="topic-detail">
        <div className="topic-detail-top"><div><span className="topic-card-category">{activeTopic.category}</span><h3>{activeTopic.title}</h3></div><button type="button" className="tiny-button" onClick={() => setSelectedTopicId("")} aria-label="Close topic detail"><Icon name="close" size={14} /> Close</button></div>
        <p>{activeTopic.summary}</p>
        <div className="topic-detail-actions"><Link className="secondary-button" href={`/topic/${encodeURIComponent(activeTopic.id)}`}><Icon name="external" size={14} /> SEO topic page</Link><button type="button" className="secondary-button" onClick={() => { setAnalystTopicId(activeTopic.id); setAnalystQuestion(`What is documented about ${activeTopic.title}?`); setActiveTab("analyst"); }}><Icon name="message" size={14} /> Ask about this topic</button></div>
        <div className="divider-label">Sourced claim set</div>
        {activeTopic.claims.length ? <div className="claim-grid">{activeTopic.claims.map(renderClaim)}</div> : <EmptyState title="No claims yet" text="No claim has been approved for this topic in the seed corpus." />}
      </section>}
      <div className="topic-toolbar">
        <input className="search-input" style={{ maxWidth: 430 }} value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)} placeholder="Filter topics" aria-label="Filter topics" />
        <span className="result-count">{filteredTopics.length} dossier{filteredTopics.length === 1 ? "" : "s"}</span>
      </div>
      <div className="topic-grid">{filteredTopics.map((topic) => <button key={topic.id} type="button" className="topic-card" onClick={() => setSelectedTopicId(topic.id)}>
        <span className="topic-card-category">{topic.category}</span><h3>{topic.title}</h3><p>{topic.summary}</p><span className="topic-card-footer"><span>{topic.claims.length} cited claim{topic.claims.length === 1 ? "" : "s"}</span><span>Open dossier <Icon name="arrow" size={12} /></span></span>
      </button>)}</div>
      <div className="disclaimer-strip"><Icon name="shield" size={15} />A confidence tag describes the source-backed status of a particular claim, not an endorsement of a topic or interpretation.</div>
    </>
  );

  const renderGraph = () => {
    const selectedConnection = (data?.connections ?? []);
    const numericEdges = sameValueMatches.filter((lexeme) => !input.includes(lexeme.text)).slice(0, 8);
    return <>
      <div className="view-header"><div className="view-title-wrap"><span className="kicker">06 · relation map</span><h2>Connection graph</h2><p>Documented relations and number-only coincidences use separate labels and colors. No edge implies causation.</p></div></div>
      <div className="graph-legend"><span className="legend-item"><i className="legend-dot legend-document" /> Documented · linked source</span><span className="legend-item"><i className="legend-dot legend-numerology" /> Numerological · shared value only</span></div>
      <section className="panel">
        <div className="panel-title">Calculated equality <span className="meta-tag">{selectedSystem?.name ?? "No system"} · {selectedResult?.value ?? "—"}</span></div>
        <p className="panel-subtitle">Numerological edges below are computed from the selected system. They do not represent a historical, lexical, or causal connection.</p>
        {selectedResult && numericEdges.length ? <div className="graph-flow">
          {numericEdges.map((lexeme) => <div className="graph-edge graph-edge-numerological" key={lexeme.id}>
            <button className="graph-node" type="button" onClick={() => { setEtymologyTerm(lexeme.transliteration || lexeme.text); setActiveTab("etymology"); void loadEtymology(lexeme.transliteration || lexeme.text); }}>{input}</button>
            <span className="graph-link"><Icon name="link" size={17} /></span>
            <button className="graph-node" type="button" onClick={() => { setEtymologyTerm(lexeme.transliteration || lexeme.text); setActiveTab("etymology"); void loadEtymology(lexeme.transliteration || lexeme.text); }} dir="auto">{lexeme.text}</button>
            <span className="graph-edge-caption"><span className="graph-basis"><i className="legend-dot legend-numerology" />Numerological</span> Shared value {selectedResult.value} · {lexeme.transliteration} · equality only</span>
          </div>)}
        </div> : <div className="rail-empty">No other lexeme in the compact seed set shares the currently selected total. Try אהבה and Hebrew Standard to see an example equality with אחד.</div>}
      </section>
      <section className="graph-section"><h3 className="graph-section-title">Documented relations</h3>
        {selectedConnection.length ? <div className="graph-flow">{selectedConnection.map((connection) => <div className="graph-edge" key={connection.id}>
          <button type="button" className="graph-node" onClick={() => { if (connection.from_ref_type === "topic") { setSelectedTopicId(connection.from_ref_id); setActiveTab("topics"); } }}>{connection.fromLabel}</button>
          <span className="graph-link"><Icon name="arrow" size={16} /></span>
          <button type="button" className="graph-node" onClick={() => { if (connection.to_ref_type === "lexeme") { const lexeme = data?.lexemes.find((item) => String(item.id) === connection.to_ref_id); if (lexeme) { setEtymologyTerm(lexeme.transliteration || lexeme.text); setActiveTab("etymology"); void loadEtymology(lexeme.transliteration || lexeme.text); } } }}>{connection.toLabel}</button>
          <span className="graph-edge-caption"><span className="graph-basis"><i className="legend-dot legend-document" />Documented</span> {connection.kind}: {connection.note} {connection.source && <SourceChip source={connection.source} compact />}</span>
        </div>)}</div> : <EmptyState icon="network" title="No documented edges" text="A relation appears here only when the database contains an explicit source reference." />}
      </section>
      <div className="disclaimer-strip"><Icon name="shield" size={15} />Graph links communicate their evidence basis visibly; numerical equality is not a documented relationship.</div>
    </>;
  };

  const renderSources = () => (
    <>
      <div className="view-header"><div className="view-title-wrap"><span className="kicker">07 · provenance</span><h2>Source library</h2><p>Every research claim should be traceable to a source row. Check editions, dates, and archives before citing a page in new work.</p></div><div className="view-tools"><span className="meta-tag">{data?.sources.length ?? 0} sources</span></div></div>
      <div className="topic-toolbar"><input className="search-input" style={{ maxWidth: 470 }} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} placeholder="Filter title, author, or type" aria-label="Filter sources" /></div>
      <div className="source-list">{filteredSources.map((source) => {
        const linkedClaims = (data?.topics ?? []).flatMap((topic) => topic.claims.filter((claim) => claim.sources.some((item) => item.source.id === source.id)).map((claim) => ({ claim, topic })));
        const expanded = selectedSourceId === source.id;
        return <article className="source-record" key={source.id}>
          <button type="button" className="source-record-button" onClick={() => setSelectedSourceId(expanded ? "" : source.id)} aria-expanded={expanded}>
            <span><h3>{source.title}</h3><span className="source-record-meta">{source.author || "Unknown author"}{source.year ? ` · ${source.year}` : ""} · {source.type.replaceAll("_", " ")}</span></span><span className="source-grade">GRADE {source.reliability_grade}</span>
          </button>
          {expanded && <div className="source-detail"><p style={{ margin: 0 }}>{source.access_note || "No access note supplied."}</p>
            <div className="source-detail-actions">{source.url && <a className="secondary-button" href={source.url} target="_blank" rel="noreferrer"><Icon name="external" size={14} /> Open source</a>}{source.archive_url && <a className="secondary-button" href={source.archive_url} target="_blank" rel="noreferrer"><Icon name="external" size={14} /> Open archive capture</a>}{!source.archive_url && <span className="meta-tag">No verified archive capture supplied</span>}</div>
            {linkedClaims.length > 0 && <><div className="divider-label">Claim records citing this source</div><ul style={{ margin: 0, paddingLeft: 17 }}>{linkedClaims.map(({ claim, topic }) => <li key={`${claim.id}-${source.id}`} style={{ marginBottom: 5 }}><strong>{topic.title}:</strong> {claim.statement} <ConfidenceBadge tag={claim.confidence} /></li>)}</ul></>}
          </div>}
        </article>;
      })}</div>
      {!filteredSources.length && <EmptyState icon="link" title="No matching sources" text="Try a shorter title, author, or source type." />}
    </>
  );

  const renderSaved = () => (
    <>
      <div className="view-header"><div className="view-title-wrap"><span className="kicker">08 · local-first workspace</span><h2>Saved notes</h2><p>Notes are stored in this browser only. Save a calculator result, then add your own context or export a research brief.</p></div><div className="view-tools"><button className="quiet-button" type="button" onClick={() => exportMarkdown("Saved research notes", savedNotes.map((note) => `## ${note.title}\n${note.note}`).join("\n\n"))} disabled={!savedNotes.length}><Icon name="download" size={15} /> Export notes</button></div></div>
      {savedNotes.length ? <div className="notes-list">{savedNotes.map((note) => <article className="saved-card" key={note.id}>
        <div style={{ minWidth: 0, flex: 1 }}><h3>{note.title}</h3>{editingNoteId === note.id ? <><textarea className="form-textarea" style={{ minHeight: 70, marginTop: 5 }} value={editingNoteValue} onChange={(event) => setEditingNoteValue(event.target.value)} aria-label={`Edit note ${note.title}`} /><div style={{ display: "flex", gap: 6, marginTop: 7 }}><button type="button" className="tiny-button" onClick={() => { setSavedNotes(updateSavedNote(note.id, editingNoteValue)); setEditingNoteId(""); showToast("Note updated locally."); }}>Save note</button><button type="button" className="tiny-button" onClick={() => setEditingNoteId("")}>Cancel</button></div></> : <p>{note.note || "No note added yet."}</p>}<div className="saved-meta">{note.refType} · saved {formatDate(note.createdAt)}</div></div>
        <div className="saved-actions"><button type="button" className="tiny-button" onClick={() => { setEditingNoteId(note.id); setEditingNoteValue(note.note); }}>Edit</button><button type="button" className="tiny-button" onClick={() => { setSavedNotes(deleteSavedNote(note.id)); showToast("Note removed from this browser."); }}>Delete</button></div>
      </article>)}</div> : <EmptyState icon="bookmark" title="Nothing saved yet" text="Use the Save button in the calculator to keep a result and its system label in this browser." />}
      <div className="disclaimer-strip"><Icon name="shield" size={15} />Soft deletion is used in the SQL sync schema; this local demo removes deleted notes from the visible browser list.</div>
    </>
  );

  const renderHistory = () => (
    <>
      <div className="view-header"><div className="view-title-wrap"><span className="kicker">09 · local history</span><h2>Recent calculations</h2><p>History stays in local browser storage and is limited to the latest 40 distinct inputs.</p></div><div className="view-tools"><button type="button" className="quiet-button" onClick={() => { setHistory(clearHistory()); showToast("Local history cleared."); }} disabled={!history.length}><Icon name="close" size={15} /> Clear history</button></div></div>
      {history.length ? <div className="history-list">{history.map((item) => <article className="history-card" key={item.id}>
        <div className="history-card-main"><div className="history-query" dir="auto">{item.inputText}</div><div className="saved-meta">{formatDate(item.timestamp)} · {item.systemIds.length} system{item.systemIds.length === 1 ? "" : "s"}</div></div>
        <div className="history-actions"><button type="button" className="tiny-button" onClick={() => handleHistoryOpen(item)}><Icon name="calculator" size={13} /> Reopen</button></div>
      </article>)}</div> : <EmptyState icon="history" title="No calculations yet" text="After you calculate a word or phrase, the query is stored locally here." />}
      <div className="disclaimer-strip"><Icon name="shield" size={15} />This browser-only history is not sent to an AI provider or stored in a server account.</div>
    </>
  );

  const activeView = {
    calculator: renderCalculator,
    etymology: renderEtymology,
    verses: renderVerses,
    analyst: renderAnalyst,
    topics: renderTopics,
    graph: renderGraph,
    sources: renderSources,
    saved: renderSaved,
    history: renderHistory,
  }[activeTab];

  return (
    <div className={`app-root theme-${theme}`}>
      <div className="page-width">
        <header className="site-header">
          <div className="header-row">
            <Link className="brand" href="/" aria-label="Gematria Lab home"><span className="brand-mark"><Icon name="mark" size={23} /></span><span className="brand-copy"><span className="brand-name">Gematria Lab</span><span className="brand-tagline">language · number · evidence</span></span></Link>
            <div className="header-right"><span className="header-prompt">Patterns are easy to find. Evidence is harder.</span><span className="header-divider" />
              <button type="button" className="icon-button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} onClick={() => setThemeValue(theme === "light" ? "dark" : "light")}><Icon name={theme === "light" ? "moon" : "sun"} size={17} /></button>
              <div className="settings-wrap"><button type="button" className="icon-button" aria-label="Open settings" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}><Icon name="filter" size={17} /></button>
                {settingsOpen && <div className="settings-popover"><h3>Lab settings</h3><div className="setting-row"><span>Theme</span><button type="button" className="tiny-button" onClick={() => setThemeValue(theme === "light" ? "dark" : "light")}>{theme === "light" ? "Light" : "Dark"}</button></div><div className="divider-label" style={{ margin: "10px 0 6px" }}>Systems shown</div>
                  {(data?.systems ?? []).map((system) => <label className="setting-row" key={system.id}><span>{system.name}</span><input className="setting-checkbox" type="checkbox" checked={visibleSystemIds?.includes(system.id) ?? true} onChange={(event) => updateVisibility(system.id, event.target.checked)} /></label>)}
                  <p className="settings-footnote">Preferences are stored locally. System calculations remain deterministic.</p>
                </div>}
              </div>
            </div>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy"><span className="kicker">A source-first research workbench</span><h1>Words have histories.<br /><em>Numbers need context.</em></h1><p>Explore letter values, lexical histories, and text matches—with the math shown, sources attached, and coincidence made visible.</p></div>
          <div className="hero-stamp" aria-label="Product principles"><span>Math engine</span><strong>Deterministic</strong><span>Research layer</span><strong>Cited & graded</strong><span>Pattern checks</span><span className="stamp-number">01 — 09</span></div>
        </section>

        {loadError && <div className="error-banner" role="alert" style={{ marginBottom: 13 }}>{loadError} The calculator UI will load once the local catalog is available.</div>}
        <main className="workspace-shell">
          <nav className="workspace-nav" aria-label="Research lab navigation">
            {NAV_GROUPS.map((group) => <div className="nav-group" key={group.label}><span className="nav-overline">{group.label}</span><div className="nav-list">{group.items.map((item) => {
              const count = item.id === "saved" ? savedNotes.length : item.id === "history" ? history.length : undefined;
              return <button type="button" key={item.id} className={`nav-button${activeTab === item.id ? " nav-button-active" : ""}`} onClick={() => { setActiveTab(item.id); setSettingsOpen(false); }} aria-label={item.label} title={item.label} aria-current={activeTab === item.id ? "page" : undefined}><span className="nav-icon"><Icon name={item.icon} size={17} /></span><span className="nav-label">{item.label}</span>{count ? <span className="nav-badge">{count}</span> : null}</button>;
            })}</div></div>)}
            <div className="nav-footnote"><strong>Research boundary</strong>Computed matches are not proof of meaning, intention, or causation.</div>
          </nav>
          <div className="workspace-content">
            {loading ? <div className="loading-state"><span className="spinner" />Opening the reference catalog</div> : data ? activeView() : <EmptyState icon="document" title="Catalog unavailable" text={loadError || "The research catalog could not be loaded. Refresh the page to retry."} />}
          </div>
        </main>

        <footer className="app-footer"><div><strong>Gematria Lab</strong><br />Educational research tool, not proof. Patterns do not establish causation.</div><div className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/llms.txt">llms.txt</Link><a href="/robots.txt">Robots</a><span>Demo corpus · v1.0</span></div></footer>
      </div>

      {!privacyNoticeDismissed && <aside className="privacy-banner" aria-label="Local storage notice"><div className="privacy-copy"><strong>Privacy-first by default</strong><p>History and saved notes are stored in this browser when you use those tools. Analytics and advertising are off. See the <Link href="/privacy">privacy note</Link>.</p></div><div className="privacy-actions"><button type="button" className="primary-button" style={{ minHeight: 32, padding: "0 11px", fontSize: 10 }} onClick={() => { setPrivacyNoticeDismissed(true); dismissPrivacyNotice(); }}>Dismiss</button></div></aside>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
