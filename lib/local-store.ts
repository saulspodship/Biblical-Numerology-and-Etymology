import type { LocalHistoryItem, LocalSavedNote } from "@/lib/types";

const HISTORY_KEY = "gematria-lab.history.v1";
const SAVED_KEY = "gematria-lab.saved.v1";
const THEME_KEY = "gematria-lab.theme.v1";
const PRIVACY_NOTICE_KEY = "gematria-lab.privacy-notice-dismissed.v1";
const SYSTEMS_KEY = "gematria-lab.systems.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private-browsing quota failures must never block calculation or research.
  }
}

export function loadHistory(): LocalHistoryItem[] {
  return read<LocalHistoryItem[]>(HISTORY_KEY, []);
}

export function saveHistory(inputText: string, systemIds: string[]): LocalHistoryItem[] {
  const current = loadHistory();
  const entry: LocalHistoryItem = { id: crypto.randomUUID(), inputText, systemIds, timestamp: new Date().toISOString() };
  const next = [entry, ...current.filter((item) => item.inputText !== inputText)].slice(0, 40);
  write(HISTORY_KEY, next);
  return next;
}

export function clearHistory(): LocalHistoryItem[] {
  write(HISTORY_KEY, []);
  return [];
}

export function loadSavedNotes(): LocalSavedNote[] {
  return read<LocalSavedNote[]>(SAVED_KEY, []).filter((note) => !note.deletedAt);
}

export function saveNote(input: Omit<LocalSavedNote, "id" | "createdAt">): LocalSavedNote[] {
  const current = read<LocalSavedNote[]>(SAVED_KEY, []);
  const next = [{ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current].slice(0, 100);
  write(SAVED_KEY, next);
  return next.filter((note) => !note.deletedAt);
}

export function updateSavedNote(id: string, noteText: string): LocalSavedNote[] {
  const current = read<LocalSavedNote[]>(SAVED_KEY, []);
  const next = current.map((note) => note.id === id ? { ...note, note: noteText } : note);
  write(SAVED_KEY, next);
  return next.filter((note) => !note.deletedAt);
}

export function deleteSavedNote(id: string): LocalSavedNote[] {
  const current = read<LocalSavedNote[]>(SAVED_KEY, []);
  const next = current.map((note) => note.id === id ? { ...note, deletedAt: new Date().toISOString() } : note);
  write(SAVED_KEY, next);
  return next.filter((note) => !note.deletedAt);
}

export function loadTheme(): "light" | "dark" {
  return read<"light" | "dark">(THEME_KEY, "light");
}

export function saveTheme(theme: "light" | "dark") {
  write(THEME_KEY, theme);
}

export function loadPrivacyNoticeDismissed(): boolean {
  return read<boolean>(PRIVACY_NOTICE_KEY, false);
}

export function dismissPrivacyNotice() {
  write(PRIVACY_NOTICE_KEY, true);
}

export function loadVisibleSystems(): string[] | null {
  return read<string[] | null>(SYSTEMS_KEY, null);
}

export function saveVisibleSystems(ids: string[]) {
  write(SYSTEMS_KEY, ids);
}
