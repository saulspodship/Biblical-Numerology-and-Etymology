import type Database from "better-sqlite3";
import { calculate, SYSTEM_DEFINITIONS } from "@/lib/calculation";

const SOURCES = [
  { id: "src-jewish-encyclopedia-gematria", type: "lexicon", title: "Gematria", author: "The Jewish Encyclopedia", year: 1906, url: "https://www.jewishencyclopedia.com/articles/10144-gematria", grade: "B", note: "Historical reference entry; consult scholarly editions for specialist questions." },
  { id: "src-strongs-h7965", type: "lexicon", title: "Strong's Hebrew Lexicon H7965: šālôm", author: "Blue Letter Bible; Strong's / BDB material", year: null, url: "https://www.blueletterbible.org/lexicon/h7965/kjv/wlc/0-1/", grade: "B", note: "Lexicon entry; glosses include completeness, soundness, welfare, peace; lists H7999 as the source/root." },
  { id: "src-strongs-h7999", type: "lexicon", title: "Strong's Hebrew Lexicon H7999: šālam", author: "Blue Letter Bible; Strong's / BDB material", year: null, url: "https://www.blueletterbible.org/lexicon/h7999/kjv/wlc/0-1/", grade: "B", note: "Lexicon entry for the Hebrew root." },
  { id: "src-strongs-h160", type: "lexicon", title: "Strong's Hebrew Lexicon H160: ʾahăḇâ", author: "Blue Letter Bible; Strong's / BDB material", year: null, url: "https://www.blueletterbible.org/lexicon/h160/kjv/wlc/0-1/", grade: "B", note: "Lexicon entry; glosses אַהֲבָה as love and cites relation to H157." },
  { id: "src-greek-isopsephy-barry", type: "book", title: "The Greek Qabalah: Alphabetic Mysticism and Numerology in the Ancient World", author: "Kieren Barry", year: 1999, url: null, grade: "B", note: "Book reference for Greek alphabetic number practices; the calculator's exact table is also shown in-app." },
  { id: "src-abjad-iranica", type: "book", title: "ABJAD", author: "Encyclopaedia Iranica", year: null, url: "https://www.iranicaonline.org/articles/abjad/", grade: "A", note: "Specialist reference entry; note that regional variants exist." },
  { id: "src-project-defined-method", type: "method", title: "Project-defined comparison systems", author: "Gematria Lab", year: 2026, url: null, grade: "reference", note: "English ordinal and repeating 1–9 charts are presented as modern comparison schemes, not ancient conventions." },
  { id: "src-sefaria-tanakh", type: "primary_text", title: "Tanakh · Hebrew text collection", author: "Sefaria", year: null, url: "https://www.sefaria.org/texts/Tanakh", grade: "A", note: "Collection landing page; individual verse records carry their own direct reference URLs." },
  { id: "src-bibleodyssey-numbers", type: "book", title: "Numbers", author: "Bible Odyssey (Society of Biblical Literature)", year: 2024, url: "https://www.bibleodyssey.org/dictionary/numbers/", grade: "B", note: "Reference overview; interpretations of symbolism are contextual rather than universal." },
  { id: "src-doj-epstein-2019", type: "court_doc", title: "Jeffrey Epstein Charged in Manhattan Federal Court with Sex Trafficking of Minors", author: "U.S. Attorney's Office, Southern District of New York", year: 2019, url: "https://www.justice.gov/usao-sdny/pr/jeffrey-epstein-charged-manhattan-federal-court-sex-trafficking-minors", grade: "A", note: "Official charging announcement. The release states that charges are accusations and the defendant is presumed innocent unless and until proven guilty." },
  { id: "src-ats-treaty", type: "government", title: "The Antarctic Treaty", author: "Antarctic Treaty Secretariat", year: 1959, url: "https://www.ats.aq/e/antarctictreaty.html", grade: "A", note: "Official treaty summary and text references." },
  { id: "src-ats-peaceful-use", type: "government", title: "Peaceful use and inspections", author: "Antarctic Treaty Secretariat", year: null, url: "https://www.ats.aq/e/peaceful.html", grade: "A", note: "Official explanation of Article I and inspection provisions." },
  { id: "src-sec-ownership", type: "government", title: "Exchange Act Sections 13(d) and 13(g): Beneficial Ownership Reporting", author: "U.S. Securities and Exchange Commission", year: 2026, url: "https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations", grade: "A", note: "SEC staff interpretations covering Schedules 13D and 13G; individual filings must be read in date and issuer context." },
  { id: "src-ushmm-protocols", type: "archive", title: "An Antisemitic Conspiracy: The Protocols of the Elders of Zion", author: "United States Holocaust Memorial Museum", year: null, url: "https://encyclopedia.ushmm.org/content/en/article/protocols-of-the-elders-of-zion", grade: "A", note: "Historical analysis documenting that the text is fabricated propaganda. Shown only to document and debunk antisemitism." },
  { id: "src-cornell-eleusis", type: "archive", title: "Mysteries at Eleusis: Images of Inscriptions", author: "Cornell University Library Digital Collections", year: null, url: "https://digital.library.cornell.edu/collections/eleusis", grade: "A", note: "Institutional digital collection of material related to the sanctuary and mysteries at Eleusis." },
  { id: "src-britannica-rockefeller", type: "book", title: "Rockefeller Foundation", author: "Encyclopaedia Britannica", year: null, url: "https://www.britannica.com/topic/Rockefeller-Foundation", grade: "B", note: "Reference entry for the foundation's history; not a source for claims about unrelated people or groups." },
  { id: "src-simmons-false-positive", type: "book", title: "False-Positive Psychology: Undisclosed Flexibility in Data Collection and Analysis Allows Presenting Anything as Significant", author: "Joseph P. Simmons, Leif D. Nelson, and Uri Simonsohn", year: 2011, url: "https://doi.org/10.1177/0956797611417632", grade: "A", note: "Peer-reviewed methodological paper; it supports general caution about exploratory flexibility, not a gematria-specific probability estimate." },
  { id: "src-baseline-method", type: "method", title: "Coincidence baseline method (seed corpus v1)", author: "Gematria Lab", year: 2026, url: null, grade: "reference", note: "Exact same-value frequency is counted over the current compatible lexeme catalog. Random phrase simulation is a separate, reproducible uniform-with-replacement model with the same word count; it is illustrative, not proof or a universal probability." },
];

interface SeedLexeme {
  text: string;
  language: "heb" | "grc" | "arc" | "lat" | "eng" | "ara";
  transliteration: string;
  strongsId?: string;
  partOfSpeech?: string;
  gloss: string;
  root?: string;
}

const LEXEMES: SeedLexeme[] = [
  { text: "שלם", language: "heb", transliteration: "shalam", strongsId: "H7999", partOfSpeech: "verb/root", gloss: "to be complete, sound, or at peace" },
  { text: "שלום", language: "heb", transliteration: "shalom", strongsId: "H7965", partOfSpeech: "noun", gloss: "completeness, soundness, welfare, peace", root: "שלם" },
  { text: "אהב", language: "heb", transliteration: "ahav", strongsId: "H157", partOfSpeech: "verb/root", gloss: "to love" },
  { text: "אהבה", language: "heb", transliteration: "ahavah", strongsId: "H160", partOfSpeech: "noun", gloss: "love", root: "אהב" },
  { text: "אמת", language: "heb", transliteration: "emet", strongsId: "H571", partOfSpeech: "noun", gloss: "firmness, faithfulness, truth" },
  { text: "אור", language: "heb", transliteration: "or", strongsId: "H216", partOfSpeech: "noun", gloss: "light" },
  { text: "חכמה", language: "heb", transliteration: "chokhmah", strongsId: "H2451", partOfSpeech: "noun", gloss: "wisdom" },
  { text: "מלך", language: "heb", transliteration: "melekh", strongsId: "H4428", partOfSpeech: "noun", gloss: "king" },
  { text: "ישראל", language: "heb", transliteration: "yisrael", strongsId: "H3478", partOfSpeech: "proper noun", gloss: "Israel" },
  { text: "אחד", language: "heb", transliteration: "echad", strongsId: "H259", partOfSpeech: "adjective", gloss: "one" },
  { text: "בראשית", language: "heb", transliteration: "bereshit", strongsId: "H7225", partOfSpeech: "noun", gloss: "beginning" },
  { text: "ברא", language: "heb", transliteration: "bara", strongsId: "H1254", partOfSpeech: "verb", gloss: "to create" },
  { text: "אלהים", language: "heb", transliteration: "elohim", strongsId: "H430", partOfSpeech: "noun", gloss: "God; gods (gloss is context-dependent)" },
  { text: "את", language: "heb", transliteration: "et", strongsId: "H853", partOfSpeech: "particle", gloss: "direct-object marker (among other uses)" },
  { text: "שמים", language: "heb", transliteration: "shamayim", strongsId: "H8064", partOfSpeech: "noun", gloss: "heavens; sky" },
  { text: "ארץ", language: "heb", transliteration: "eretz", strongsId: "H776", partOfSpeech: "noun", gloss: "land; earth" },
  { text: "יהוה", language: "heb", transliteration: "YHWH", strongsId: "H3068", partOfSpeech: "proper noun", gloss: "the divine name in the Hebrew Bible" },
  { text: "רעה", language: "heb", transliteration: "ra'ah", strongsId: "H7462", partOfSpeech: "verb", gloss: "to shepherd; tend" },
  { text: "לא", language: "heb", transliteration: "lo", strongsId: "H3808", partOfSpeech: "particle", gloss: "not; no" },
  { text: "חסר", language: "heb", transliteration: "chaser", strongsId: "H2637", partOfSpeech: "verb", gloss: "to lack; be without" },
  { text: "שמע", language: "heb", transliteration: "shema", strongsId: "H8085", partOfSpeech: "verb", gloss: "to hear; listen" },
  { text: "נר", language: "heb", transliteration: "ner", strongsId: "H5216", partOfSpeech: "noun", gloss: "lamp" },
  { text: "רגל", language: "heb", transliteration: "regel", strongsId: "H7272", partOfSpeech: "noun", gloss: "foot; leg" },
  { text: "דבר", language: "heb", transliteration: "davar", strongsId: "H1697", partOfSpeech: "noun", gloss: "word; matter; thing" },
  { text: "נתיב", language: "heb", transliteration: "netiv", strongsId: "H5410", partOfSpeech: "noun", gloss: "path; track" },
  { text: "שאל", language: "heb", transliteration: "sha'al", strongsId: "H7592", partOfSpeech: "verb", gloss: "to ask; inquire" },
  { text: "שלה", language: "heb", transliteration: "shalah", strongsId: "H7951", partOfSpeech: "verb/root", gloss: "to be at ease; prosper" },
  { text: "ירושלים", language: "heb", transliteration: "yerushalayim", strongsId: "H3389", partOfSpeech: "proper noun", gloss: "Jerusalem" },
  { text: "חיים", language: "heb", transliteration: "chayim", strongsId: "H2416", partOfSpeech: "noun", gloss: "life; living" },
  { text: "דוד", language: "heb", transliteration: "david", strongsId: "H1732", partOfSpeech: "proper noun", gloss: "David" },
  { text: "איש", language: "heb", transliteration: "ish", strongsId: "H376", partOfSpeech: "noun", gloss: "man; person" },
  { text: "דרך", language: "heb", transliteration: "derekh", strongsId: "H1870", partOfSpeech: "noun", gloss: "way; road" },
  { text: "λόγος", language: "grc", transliteration: "logos", partOfSpeech: "noun", gloss: "word, speech, account, or reason (context-dependent)" },
  { text: "φῶς", language: "grc", transliteration: "phos", partOfSpeech: "noun", gloss: "light" },
  { text: "ἀλήθεια", language: "grc", transliteration: "aletheia", partOfSpeech: "noun", gloss: "truth; truthfulness" },
  { text: "εἰρήνη", language: "grc", transliteration: "eirene", partOfSpeech: "noun", gloss: "peace" },
  { text: "ἀγάπη", language: "grc", transliteration: "agape", partOfSpeech: "noun", gloss: "love; affection" },
  { text: "سلام", language: "ara", transliteration: "salam", partOfSpeech: "noun/greeting", gloss: "peace; safety" },
  { text: "نور", language: "ara", transliteration: "nur", partOfSpeech: "noun", gloss: "light" },
  { text: "حق", language: "ara", transliteration: "haqq", partOfSpeech: "noun", gloss: "truth; right; reality (context-dependent)" },
  { text: "pax", language: "lat", transliteration: "pax", partOfSpeech: "noun", gloss: "peace" },
  { text: "lux", language: "lat", transliteration: "lux", partOfSpeech: "noun", gloss: "light" },
  { text: "verbum", language: "lat", transliteration: "verbum", partOfSpeech: "noun", gloss: "word" },
  { text: "veritas", language: "lat", transliteration: "veritas", partOfSpeech: "noun", gloss: "truth" },
  { text: "peace", language: "eng", transliteration: "peace", partOfSpeech: "noun", gloss: "a state of peace or absence of war" },
  { text: "light", language: "eng", transliteration: "light", partOfSpeech: "noun", gloss: "illumination; visible light" },
  { text: "word", language: "eng", transliteration: "word", partOfSpeech: "noun", gloss: "a unit of language" },
  { text: "love", language: "eng", transliteration: "love", partOfSpeech: "noun/verb", gloss: "affection; to feel affection" },
  { text: "truth", language: "eng", transliteration: "truth", partOfSpeech: "noun", gloss: "the quality of being in accordance with fact" },
  { text: "history", language: "eng", transliteration: "history", partOfSpeech: "noun", gloss: "the study or record of past events" },
  { text: "pattern", language: "eng", transliteration: "pattern", partOfSpeech: "noun", gloss: "a repeated or regular arrangement" },
  { text: "evidence", language: "eng", transliteration: "evidence", partOfSpeech: "noun", gloss: "information that supports an assessment" },
  { text: "chance", language: "eng", transliteration: "chance", partOfSpeech: "noun", gloss: "possibility or likelihood" },
  { text: "method", language: "eng", transliteration: "method", partOfSpeech: "noun", gloss: "a procedure or systematic way of doing something" },
];

function lexemeSourceId(lexeme: SeedLexeme): string {
  if (lexeme.language === "heb" && lexeme.strongsId) return `src-strongs-${lexeme.strongsId.toLowerCase()}`;
  const slug = (lexeme.transliteration || lexeme.text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `src-${lexeme.language}-lexicon-${slug}`;
}

function lexemeSourceDetails(lexeme: SeedLexeme) {
  if (lexeme.language === "heb" && lexeme.strongsId) {
    const id = lexeme.strongsId.toLowerCase();
    return { id: lexemeSourceId(lexeme), title: `Strong's Hebrew Lexicon ${lexeme.strongsId}: ${lexeme.text}`, author: "Blue Letter Bible; Strong's / BDB material", url: `https://www.blueletterbible.org/lexicon/${id}/kjv/wlc/0-1/`, note: "Lexicon entry; the app's concise gloss is a paraphrase, not a full dictionary article." };
  }
  if (lexeme.language === "grc") {
    return { id: lexemeSourceId(lexeme), title: `Logeion / LSJ and Greek lexicons: ${lexeme.text}`, author: "University of Chicago Logeion", url: `https://logeion.uchicago.edu/${encodeURIComponent(lexeme.text)}`, note: "Dictionary lookup; consult the full entry and cited contexts. Project gloss is a concise orientation only." };
  }
  if (lexeme.language === "lat") {
    return { id: lexemeSourceId(lexeme), title: `Logeion / Lewis & Short: ${lexeme.text}`, author: "University of Chicago Logeion", url: `https://logeion.uchicago.edu/${encodeURIComponent(lexeme.text)}`, note: "Latin dictionary lookup; consult the full entry and cited contexts. Project gloss is a concise orientation only." };
  }
  if (lexeme.language === "ara") {
    return { id: lexemeSourceId(lexeme), title: `Lane's Arabic-English Lexicon search: ${lexeme.text}`, author: "Edward William Lane; Arabic Lexicon search interface", url: `https://arabiclexicon.hawramani.com/search/${encodeURIComponent(lexeme.text)}?cat=50`, note: "Arabic lexicon search result; spelling, root, and context should be checked in the full entry." };
  }
  return { id: lexemeSourceId(lexeme), title: `Merriam-Webster Dictionary: ${lexeme.text}`, author: "Merriam-Webster", url: `https://www.merriam-webster.com/dictionary/${encodeURIComponent(lexeme.text)}`, note: "Modern English dictionary entry; project gloss is a short paraphrase, not an exhaustive definition." };
}

const TOPICS = [
  { id: "topic-epstein", title: "Epstein case: court record vs. speculation", category: "Public records", summary: "A source-led overview of a public federal charging record. Charges are allegations, not findings of guilt; no numerological or guilt-by-association inference is endorsed." },
  { id: "topic-antarctica", title: "Antarctica & the Antarctic Treaty", category: "Treaty and policy", summary: "Read the treaty's text and the Secretariat's summaries before evaluating claims about peaceful use, science, inspections, or travel." },
  { id: "topic-platform-ownership", title: "Technology-platform ownership", category: "Corporate records", summary: "A method guide for tracing beneficial ownership through filings. Distinguish disclosed ownership and control rights from claims of secret coordination." },
  { id: "topic-families", title: "Influential families: records, not myths", category: "Historical research", summary: "A case-study approach to public institutions and archival records; family names or numerical coincidences are not evidence of a plot." },
  { id: "topic-mystery-traditions", title: "Ancient religions & mystery traditions", category: "Ancient history", summary: "Study the surviving evidence and scholarly limits around initiation traditions; do not treat modern speculation as primary-source fact." },
  { id: "topic-scriptural-numbers", title: "Number symbolism in religious texts", category: "Text and interpretation", summary: "Some texts use numbers symbolically. Context matters, and a calculated total alone does not establish authorial intent or a hidden message." },
  { id: "topic-propaganda-history", title: "Conspiracy propaganda: a documented forgery", category: "Propaganda history", summary: "A careful history of the Protocols of the Elders of Zion as antisemitic propaganda and a repeatedly exposed forgery. It is not presented as valid evidence." },
];

const CLAIMS = [
  { id: "claim-epstein-charge-2019", topicId: "topic-epstein", statement: "On July 8, 2019, the U.S. Attorney's Office for the Southern District of New York announced a two-count federal indictment charging Jeffrey Epstein with sex trafficking of minors and conspiracy.", madeBy: "U.S. Attorney's Office, Southern District of New York", confidence: "DOCUMENTED", statusNote: "This records the existence and wording of charges. The DOJ release says charges are accusations; it is not a finding of guilt and does not support guilt by association.", kind: "historical", sources: [{ sourceId: "src-doj-epstein-2019", supports: "supports", note: "Official charging announcement; see its presumption-of-innocence statement." }] },
  { id: "claim-antarctica-dates", topicId: "topic-antarctica", statement: "The Antarctic Treaty was signed in Washington on December 1, 1959, and entered into force in 1961.", madeBy: "Antarctic Treaty Secretariat", confidence: "DOCUMENTED", statusNote: "Primary treaty-system reference. The in-force date is stated at year precision on this seed page; consult the linked official record for exact details.", kind: "historical", sources: [{ sourceId: "src-ats-treaty", supports: "supports", note: "Official treaty overview." }] },
  { id: "claim-antarctica-peace", topicId: "topic-antarctica", statement: "Article I provides that Antarctica shall be used for peaceful purposes only; Article II continues freedom of scientific investigation and cooperation.", madeBy: "Antarctic Treaty Secretariat", confidence: "DOCUMENTED", statusNote: "This summary should be checked against the treaty article text; it does not imply that all human activity or travel is prohibited.", kind: "historical", sources: [{ sourceId: "src-ats-treaty", supports: "supports", note: "Articles I and II are summarized on the official treaty page." }, { sourceId: "src-ats-peaceful-use", supports: "supports", note: "Official explanation of peaceful-use provisions." }] },
  { id: "claim-platform-filings", topicId: "topic-platform-ownership", statement: "SEC materials on Exchange Act Sections 13(d) and 13(g) describe beneficial-ownership reporting, including Schedule 13D and Schedule 13G; a filing must be read in its issuer and date context.", madeBy: "U.S. Securities and Exchange Commission", confidence: "DOCUMENTED", statusNote: "A filing can document reported ownership interests; it does not, by itself, establish secret coordination or wrongdoing.", kind: "historical", sources: [{ sourceId: "src-sec-ownership", supports: "supports", note: "SEC staff guidance on beneficial-ownership reporting." }] },
  { id: "claim-rockefeller-charter", topicId: "topic-families", statement: "The Rockefeller Foundation was chartered in 1913.", madeBy: "Encyclopaedia Britannica", confidence: "DOCUMENTED", statusNote: "A narrow institutional-history statement; it is not evidence for unrelated claims about a family or its descendants.", kind: "historical", sources: [{ sourceId: "src-britannica-rockefeller", supports: "supports", note: "Reference entry on the foundation's history." }] },
  { id: "claim-eleusis", topicId: "topic-mystery-traditions", statement: "The Eleusinian Mysteries were ancient rites associated with the sanctuary of Demeter and Kore (Persephone) at Eleusis; surviving inscriptions and records form part of the evidence base.", madeBy: "Cornell University Library Digital Collections", confidence: "DOCUMENTED", statusNote: "The existence and setting are documented; details of secret rites and modern theories about them require separate evidence and often remain uncertain.", kind: "historical", sources: [{ sourceId: "src-cornell-eleusis", supports: "supports", note: "Institutional collection overview and digitized inscriptions." }] },
  { id: "claim-biblical-number-symbolism", topicId: "topic-scriptural-numbers", statement: "Some biblical texts use certain numbers symbolically, but interpretations must be tied to the specific text and historical context.", madeBy: "Bible Odyssey / Society of Biblical Literature", confidence: "DOCUMENTED", statusNote: "The source surveys examples and scholarly interpretations; it does not establish that every repeated number is intentional or meaningful.", kind: "interpretation", sources: [{ sourceId: "src-bibleodyssey-numbers", supports: "supports", note: "Reference overview of numbers in biblical usage." }] },
  { id: "claim-exploratory-flexibility", topicId: "topic-scriptural-numbers", statement: "In exploratory analysis, undisclosed flexibility in choices and repeated searching can increase false-positive risk; a pattern found after many searches should not be treated as strong evidence without a specified baseline.", madeBy: "Simmons, Nelson & Simonsohn (2011)", confidence: "DOCUMENTED", statusNote: "This is a general methodological caution, not a measured probability for any particular gematria claim.", kind: "methodological", sources: [{ sourceId: "src-simmons-false-positive", supports: "supports", note: "Peer-reviewed paper on undisclosed analytic flexibility and false-positive psychology." }] },
  { id: "claim-protocols-authenticity", topicId: "topic-propaganda-history", statement: "The Protocols of the Elders of Zion is an authentic record of real secret meetings.", madeBy: "Early publishers and antisemitic propagandists", confidence: "DEBUNKED", statusNote: "False. The text is a fabricated antisemitic conspiracy document, repeatedly exposed as a forgery. It is included only as a history of propaganda, never as a valid claim about Jewish people.", kind: "historical", sources: [{ sourceId: "src-ushmm-protocols", supports: "disputes", note: "The USHMM documents the fabrication and its history as antisemitic propaganda." }] },
];

const VERSES = [
  {
    corpus: "tanakh-sample", book: "Genesis", chapter: 1, verse: 1,
    text: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ",
    words: ["בראשית", "ברא", "אלהים", "את", "שמים", "את", "ארץ"],
    surfaces: ["בְּרֵאשִׁית", "בָּרָא", "אֱלֹהִים", "אֵת", "הַשָּׁמַיִם", "וְאֵת", "הָאָרֶץ"],
  },
  {
    corpus: "tanakh-sample", book: "Psalms", chapter: 23, verse: 1,
    text: "יְהוָה רֹעִי לֹא אֶחְסָר",
    words: ["יהוה", "רעה", "לא", "חסר"],
    surfaces: ["יְהוָה", "רֹעִי", "לֹא", "אֶחְסָר"],
  },
  {
    corpus: "tanakh-sample", book: "Deuteronomy", chapter: 6, verse: 4,
    text: "שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ יְהוָה אֶחָד",
    words: ["שמע", "ישראל", "יהוה", "אלהים", "יהוה", "אחד"],
    surfaces: ["שְׁמַע", "יִשְׂרָאֵל", "יְהוָה", "אֱלֹהֵינוּ", "יְהוָה", "אֶחָד"],
  },
  {
    corpus: "tanakh-sample", book: "Psalms", chapter: 119, verse: 105,
    text: "נֵר לְרַגְלִי דְבָרֶךָ וְאוֹר לִנְתִיבָתִי",
    words: ["נר", "רגל", "דבר", "אור", "נתיב"],
    surfaces: ["נֵר", "לְרַגְלִי", "דְבָרֶךָ", "וְאוֹר", "לִנְתִיבָתִי"],
  },
  {
    corpus: "tanakh-sample", book: "Psalms", chapter: 122, verse: 6,
    text: "שַׁאֲלוּ שְׁלוֹם יְרוּשָׁלִָם יִשְׁלָיוּ אֹהֲבָיִךְ",
    words: ["שאל", "שלום", "ירושלים", "שלה", "אהב"],
    surfaces: ["שַׁאֲלוּ", "שְׁלוֹם", "יְרוּשָׁלִָם", "יִשְׁלָיוּ", "אֹהֲבָיִךְ"],
  },
];

export function seedDatabase(db: Database.Database) {
  const sourceInsert = db.prepare(`INSERT OR IGNORE INTO source
    (id,type,title,author,year,url,archive_url,reliability_grade,access_note)
    VALUES (@id,@type,@title,@author,@year,@url,@archive_url,@grade,@note)`);
  for (const source of SOURCES) {
    sourceInsert.run({ ...source, archive_url: null, grade: source.grade, note: source.note });
  }
  for (const lexeme of LEXEMES) {
    const detail = lexemeSourceDetails(lexeme);
    sourceInsert.run({ id: detail.id, type: "lexicon", title: detail.title, author: detail.author, year: null, url: detail.url, archive_url: null, grade: "B", note: detail.note });
  }
  for (const verse of VERSES) {
    const reference = `${verse.book}.${verse.chapter}.${verse.verse}`;
    const sourceId = `src-sefaria-${reference.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    sourceInsert.run({ id: sourceId, type: "primary_text", title: `Tanakh · ${verse.book} ${verse.chapter}:${verse.verse} (Hebrew)`, author: "Sefaria", year: null, url: `https://www.sefaria.org/${reference}?lang=bi`, archive_url: null, grade: "A", note: "Direct verse reference for the selected Hebrew text; consult the page and its surrounding context." });
  }

  const systemInsert = db.prepare(`INSERT OR IGNORE INTO numerology_system
    (id,name,language,algorithm,letter_values_json,description,source_ref,sort_order,enabled,version)
    VALUES (@id,@name,@language,@algorithm,@letter_values_json,@description,@source_ref,@sort_order,1,'1.0')`);
  for (const system of SYSTEM_DEFINITIONS) {
    systemInsert.run({
      id: system.id, name: system.name, language: system.language, algorithm: system.algorithm,
      letter_values_json: JSON.stringify(system.letterValues), description: system.description,
      source_ref: system.sourceRef, sort_order: system.sortOrder,
    });
  }

  const lexemeInsert = db.prepare(`INSERT OR IGNORE INTO lexeme
    (text,language,transliteration,strongs_id,part_of_speech,gloss)
    VALUES (@text,@language,@transliteration,@strongs_id,@part_of_speech,@gloss)`);
  for (const lexeme of LEXEMES) {
    lexemeInsert.run({
      text: lexeme.text, language: lexeme.language, transliteration: lexeme.transliteration,
      strongs_id: lexeme.strongsId ?? null, part_of_speech: lexeme.partOfSpeech ?? null, gloss: lexeme.gloss,
    });
  }

  const lexemeRows = db.prepare("SELECT id,text,language FROM lexeme").all() as Array<{ id: number; text: string; language: string }>;
  const lexemeId = new Map(lexemeRows.map((row) => [`${row.language}:${row.text}`, row.id]));
  const idFor = (language: string, text: string) => {
    const id = lexemeId.get(`${language}:${text}`);
    if (!id) throw new Error(`Seed lexeme missing: ${language}:${text}`);
    return id;
  };
  const rootUpdate = db.prepare("UPDATE lexeme SET root_id=? WHERE text=? AND language=?");
  const lexemeSourceInsert = db.prepare(`INSERT OR IGNORE INTO lexeme_source(lexeme_id,source_id,relation,confidence,note)
    VALUES (?,?, 'gloss','DOCUMENTED',?)`);
  for (const lexeme of LEXEMES) {
    if (lexeme.root) rootUpdate.run(idFor("heb", lexeme.root), lexeme.text, lexeme.language);
    const detail = lexemeSourceDetails(lexeme);
    lexemeSourceInsert.run(idFor(lexeme.language, lexeme.text), detail.id, detail.note);
  }

  const valueInsert = db.prepare(`INSERT OR IGNORE INTO lexeme_value(lexeme_id,system_id,value,reduced_value)
    VALUES (?,?,?,?)`);
  for (const lexeme of LEXEMES) {
    for (const system of SYSTEM_DEFINITIONS) {
      const compatible = system.language === "lat"
        ? lexeme.language === "eng" || lexeme.language === "lat"
        : lexeme.language === system.language || (system.language === "heb" && lexeme.language === "arc");
      if (!compatible) continue;
      const result = calculate(lexeme.text, system);
      if (result) valueInsert.run(idFor(lexeme.language, lexeme.text), system.id, result.value, result.reducedValue);
    }
  }

  const corpusInsert = db.prepare(`INSERT OR IGNORE INTO text_corpus
    (id,title,language,corpus_type,source_id,version,license_note) VALUES (?,?,?,?,?,?,?)`);
  corpusInsert.run("reference-lexicon", "Curated reference lexicon · seed set", "mul", "lexicon", "src-baseline-method", "1.0", "Compact research-demo corpus; observed frequencies are not universal base rates.");
  corpusInsert.run("tanakh-sample", "Tanakh · selected Hebrew verses", "heb", "text", "src-sefaria-tanakh", "seed-v1", "Selected study verses; consult the source for context and licensing details.");

  const verseInsert = db.prepare(`INSERT OR IGNORE INTO verse(corpus_id,book,chapter,verse_no,text,language)
    VALUES (@corpus,@book,@chapter,@verse,@text,'heb')`);
  const verseWordInsert = db.prepare(`INSERT OR IGNORE INTO verse_word(verse_id,position,lexeme_id,surface_form)
    VALUES (?,?,?,?)`);
  const verseSourceInsert = db.prepare(`INSERT OR IGNORE INTO verse_source(verse_id,source_id,relation,confidence,note)
    VALUES (?,?,'primary_text','DOCUMENTED',?)`);
  for (const verse of VERSES) {
    verseInsert.run({ corpus: verse.corpus, book: verse.book, chapter: verse.chapter, verse: verse.verse, text: verse.text });
    const verseRow = db.prepare("SELECT id FROM verse WHERE corpus_id=? AND book=? AND chapter=? AND verse_no=?")
      .get(verse.corpus, verse.book, verse.chapter, verse.verse) as { id: number };
    const reference = `${verse.book}.${verse.chapter}.${verse.verse}`;
    const sourceId = `src-sefaria-${reference.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    verseSourceInsert.run(verseRow.id, sourceId, "Direct verse reference for the selected Hebrew text.");
    verse.words.forEach((word, index) => {
      verseWordInsert.run(verseRow.id, index + 1, idFor("heb", word), verse.surfaces[index] ?? word);
    });
  }

  const topicInsert = db.prepare("INSERT OR IGNORE INTO topic(id,title,category,summary) VALUES (?,?,?,?)");
  for (const topic of TOPICS) topicInsert.run(topic.id, topic.title, topic.category, topic.summary);

  const claimInsert = db.prepare(`INSERT OR IGNORE INTO claim
    (id,topic_id,statement,made_by,confidence,status_note,claim_kind)
    VALUES (@id,@topicId,@statement,@madeBy,@confidence,@statusNote,@kind)`);
  const claimSourceInsert = db.prepare(`INSERT OR IGNORE INTO claim_source
    (claim_id,source_id,supports,note) VALUES (?,?,?,?)`);
  for (const claim of CLAIMS) {
    claimInsert.run({ id: claim.id, topicId: claim.topicId, statement: claim.statement, madeBy: claim.madeBy, confidence: claim.confidence, statusNote: claim.statusNote, kind: claim.kind });
    for (const source of claim.sources) {
      claimSourceInsert.run(claim.id, source.sourceId, source.supports, source.note);
    }
  }

  const etymologyExists = db.prepare("SELECT id FROM etymology_entry WHERE lexeme_id=? AND step_order=?");
  const etymologyInsert = db.prepare(`INSERT OR IGNORE INTO etymology_entry
    (lexeme_id,step_order,from_lexeme_id,relation,explanation,source_id,confidence)
    VALUES (?,?,?,?,?,?,?)`);
  const shalomId = idFor("heb", "שלום");
  if (!etymologyExists.get(shalomId, 1)) {
    etymologyInsert.run(
      shalomId, 1, idFor("heb", "שלם"), "derived",
      "Strong's H7965 lists שָׁלוֹם as from H7999 (שָׁלַם). The lexicon glosses include completeness, soundness, welfare, and peace. This records the cited lexicon relationship, not a complete account of every historical nuance.",
      "src-strongs-h7965", "DOCUMENTED",
    );
  }
  const ahavahId = idFor("heb", "אהבה");
  if (!etymologyExists.get(ahavahId, 1)) {
    etymologyInsert.run(
      ahavahId, 1, idFor("heb", "אהב"), "derived",
      "Strong's H160 glosses אַהֲבָה as love and refers to H157 (אָהַב). This is a lexicon-reported relationship; the linked entry is the basis for the displayed chain.",
      "src-strongs-h160", "DOCUMENTED",
    );
  }

  const entityInsert = db.prepare(`INSERT OR IGNORE INTO entity
    (id,name,type,bio_documented,source_id,public_figure) VALUES (?,?,?,?,?,?)`);
  entityInsert.run("entity-jeffrey-epstein", "Jeffrey Epstein", "person", "The SDNY announced a 2019 federal indictment; this record is limited to the charging announcement and does not state guilt.", "src-doj-epstein-2019", 1);
  entityInsert.run("entity-antarctica", "Antarctica", "place", "The Antarctic Treaty Secretariat publishes the treaty text and official summaries.", "src-ats-treaty", 0);
  entityInsert.run("entity-sec", "U.S. Securities and Exchange Commission", "organization", "The SEC publishes staff guidance and filing materials for securities disclosures.", "src-sec-ownership", 0);
  entityInsert.run("entity-rockefeller-foundation", "Rockefeller Foundation", "organization", "A reference source reports the foundation was chartered in 1913.", "src-britannica-rockefeller", 0);
  entityInsert.run("entity-eleusis", "Eleusis", "place", "Cornell University Library hosts an institutional collection of inscriptions and material related to Eleusis.", "src-cornell-eleusis", 0);

  const connectionInsert = db.prepare(`INSERT OR IGNORE INTO connection
    (id,from_ref_type,from_ref_id,to_ref_type,to_ref_id,kind,basis,source_id,note)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  connectionInsert.run("connection-shalom-root", "lexeme", String(shalomId), "lexeme", String(idFor("heb", "שלם")), "lexical derivation", "documented", "src-strongs-h7965", "A lexicon lists H7965 as from H7999; this is a lexical relation, not a numerological one.");
  connectionInsert.run("connection-antarctica-topic", "topic", "topic-antarctica", "entity", "entity-antarctica", "treaty subject", "documented", "src-ats-treaty", "The topic is grounded in the official treaty and Secretariat material.");
  connectionInsert.run("connection-platform-topic", "topic", "topic-platform-ownership", "entity", "entity-sec", "primary-source method", "documented", "src-sec-ownership", "SEC filings are primary materials for the specified disclosure record; they do not imply hidden coordination.");

  const baselineCount = db.prepare(`SELECT lv.system_id AS systemId,lv.value AS value,COUNT(*) AS matchCount
    FROM lexeme_value lv JOIN lexeme l ON l.id=lv.lexeme_id
    WHERE l.language IN ('heb','grc','arc','lat','eng','ara')
    GROUP BY lv.system_id,lv.value`);
  const totals = db.prepare("SELECT system_id AS systemId,COUNT(*) AS total FROM lexeme_value GROUP BY system_id").all() as Array<{ systemId: string; total: number }>;
  const totalBySystem = new Map(totals.map((row) => [row.systemId, row.total]));
  const baselineInsert = db.prepare(`INSERT OR REPLACE INTO baseline_sample
    (corpus_id,system_id,value,match_count,total,sample_method) VALUES ('reference-lexicon',?,?,?,?,?)`);
  for (const row of baselineCount.all() as Array<{ systemId: string; value: number; matchCount: number }>) {
    const total = totalBySystem.get(row.systemId);
    if (total) baselineInsert.run(row.systemId, row.value, row.matchCount, total, "Exact same-value frequency in the curated lexeme catalog; not a universal probability.");
  }
}
