import { LabApp } from "@/components/LabApp";

const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Gematria Lab",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  description: "A source-first research workbench for deterministic gematria, etymology, text search, and cited historical claims.",
  url: "https://gematria-lab.saulspodship.com",
  isAccessibleForFree: true,
};

export default function HomePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema).replace(/</g, "\\u003c") }} />
    <LabApp />
  </>;
}
