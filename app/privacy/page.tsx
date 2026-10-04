import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Privacy note",
  description: "How Gematria Lab handles browser history, saved notes, and optional AI analysis.",
};

export default function PrivacyPage() {
  return <main className="document-page">
    <Link className="document-back" href="/"><Icon name="arrow" size={14} /> Back to Gematria Lab</Link>
    <span className="kicker" style={{ marginTop: 24 }}>Privacy · version 1</span>
    <h1>Privacy note</h1>
    <p>Gematria Lab is designed to keep ordinary calculator history and saved notes in your browser. The starter build uses browser local storage for those features; they are not uploaded to an account or synced to a server.</p>
    <h2>Research requests</h2>
    <p>Catalog, verse, topic, and baseline requests are sent to this app's own API routes so the server can query its relational SQLite catalog. The input is not saved as history unless you choose the local history feature.</p>
    <p>The Research Analyst uses a curated retrieval-only response by default. If the site operator configures both an Anthropic API key and a supported model ID on the server, analyst questions and retrieved source context are sent to Anthropic for a constrained summary. Secrets are never included in browser code. A production deployment must publish its provider-specific retention terms before enabling that integration.</p>
    <h2>Analytics and advertising</h2>
    <p>Analytics, advertising, and third-party tracking are not enabled in this starter build. The one-time local-storage notice dismissal is remembered in this browser; no analytics or advertising consent is collected because those features are off. If ads or analytics are added later, they require a separate consent and privacy review.</p>
    <h2>Your controls</h2>
    <ul><li>Use the History screen to clear local calculations.</li><li>Use Saved notes to edit or delete local notes.</li><li>Clear site storage in your browser to erase all locally stored preferences.</li></ul>
    <h2>Important boundary</h2>
    <p>This is an educational research tool, not proof. Numerical patterns do not establish meaning, intent, or causation. Review the linked sources and confidence tags before reusing any claim.</p>
    <p><strong>Deployment note:</strong> This page is a technical starter notice, not legal advice. A public release should be reviewed for the actual hosting location, subprocessors, applicable privacy law, and final retention settings.</p>
  </main>;
}
