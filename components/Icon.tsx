import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "mark" | "calculator" | "book" | "search" | "network" | "bookmark" | "history"
  | "sun" | "moon" | "arrow" | "external" | "chevron" | "plus" | "close" | "check"
  | "spark" | "shield" | "link" | "download" | "copy" | "filter" | "document" | "message" | "globe";

const paths: Record<IconName, ReactNode> = {
  mark: <><path d="M12 3v18M6.5 6.5c2-1.7 9-1.7 11 0M6.5 17.5c2 1.7 9 1.7 11 0"/><circle cx="12" cy="12" r="8.5"/></>,
  calculator: <><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7h8M8 12h2m4 0h2M8 16h2m4 0h2"/></>,
  book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17A2.5 2.5 0 0 1 2.5 19H2V4a2 2 0 0 1 2-2h3.5"/><path d="M9 7h7m-7 4h7"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
  network: <><circle cx="5" cy="6" r="2"/><circle cx="18.5" cy="5" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="18" cy="15" r="2"/><path d="m7 6 9.5-1m-10 2 4.5 9m3-7 3 4m-7 5 6.5-3"/></>,
  bookmark: <><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2H18v20l-6-4-6 4z"/></>,
  history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  moon: <><path d="M20.4 15.4A8.5 8.5 0 0 1 8.6 3.6 8.5 8.5 0 1 0 20.4 15.4Z"/></>,
  arrow: <><path d="M4 12h15m-6-6 6 6-6 6"/></>,
  external: <><path d="M14 4h6v6m-10 4L20 4"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></>,
  chevron: <path d="m7 10 5 5 5-5"/>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  spark: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></>,
  shield: <><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 20h14"/></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></>,
  filter: <><path d="M4 6h16M7 12h10m-7 6h4"/><circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/></>,
  document: <><path d="M7 2h7l5 5v15H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M9 13h6m-6 4h6"/></>,
  message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18m-9-9a14 14 0 0 1 0 18m0-18a14 14 0 0 0 0 18"/></>,
};

export function Icon({ name, size = 20, strokeWidth = 1.7, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
