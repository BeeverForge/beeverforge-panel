// The synthetic world the rig and the simulator run on. Invented: no customer, no real code.
//
// `scripts/seed.ts` writes these projects and cards to the rig through the public API. A person may
// only put a card in Backlog or TO-DO there (the other columns are the factory's), so a card marked
// `shipped` is written to Backlog and the simulator, which plays the factory, shows it in Done with
// a finished run behind it.

export type SeedColumn = "Backlog" | "TO-DO";

export interface SeedCard {
  title: string;
  objective: string;
  criteria: string[];
  column: SeedColumn;
  shipped?: boolean;
  comment?: string;
}

export interface SeedProject {
  name: string;
  pickup: boolean;
  cards: SeedCard[];
}

const shipped = (card: Omit<SeedCard, "column" | "shipped">): SeedCard => ({
  ...card,
  column: "Backlog",
  shipped: true,
});

export const PROJECTS: SeedProject[] = [
  {
    name: "harbour-ledger",
    pickup: true,
    cards: [
      { title: "Weekly reconciliation export", column: "TO-DO",
        objective: "Let the finance team download the week's reconciled ledger lines as a CSV file.",
        criteria: ["the export holds one row per reconciled line, with date, account, amount and counterparty", "an empty week downloads a file with the header row only", "a test covers both cases"] },
      { title: "Flag duplicate supplier invoices", column: "TO-DO",
        objective: "Warn the clerk when an incoming invoice matches one already booked for the same supplier.",
        criteria: ["an invoice with the same supplier, number and amount is flagged as a likely duplicate", "the clerk can dismiss the flag with a reason", "dismissed flags stay in the audit log"],
        comment: "Finance asked for this after the March double payment. Same supplier and same number is the strong signal; amount alone is not." },
      { title: "Currency rounding on multi-line credit notes", column: "TO-DO",
        objective: "Credit notes with several lines must total to the cent the supplier printed.",
        criteria: ["line amounts are rounded half-even per line before the total", "a credit note of 3 × 33.335 EUR totals 100.01 EUR", "existing credit notes are not rewritten"] },
      { title: "Show the posting period on every journal entry", column: "Backlog",
        objective: "Accountants need to see which period an entry was posted to without opening it.",
        criteria: ["the journal list shows the posting period beside the date", "entries posted to a closed period are marked"] },
      { title: "Lock a period after the month-end close", column: "Backlog",
        objective: "Stop anyone posting into a month that finance has closed.",
        criteria: ["posting into a locked period is refused with the period named", "only the controller role can unlock a period", "unlocking is written to the audit log"] },
      { title: "Bank statement import for CAMT.053 files", column: "Backlog",
        objective: "Import end-of-day bank statements in the CAMT.053 format.",
        criteria: ["a valid CAMT.053 file creates one statement line per entry", "a file already imported is refused by its message id"] },
      shipped({ title: "Add VAT number validation for EU customers",
        objective: "Catch malformed VAT numbers when a customer is created.",
        criteria: ["the number is checked against the country's format", "a malformed number is refused with an example of the right shape"] }),
      shipped({ title: "Paginate the supplier list",
        objective: "The supplier list takes seconds to open with 4,000 suppliers.",
        criteria: ["the list loads 50 suppliers at a time", "search still covers every supplier"] }),
      shipped({ title: "Fix the aged-debt report's 90-day bucket",
        objective: "Invoices exactly 90 days old fall into no bucket.",
        criteria: ["an invoice 90 days old is in the 61–90 bucket", "a test pins the boundary"] }),
    ],
  },
  {
    name: "tidepool-mobile",
    pickup: true,
    cards: [
      { title: "Offline map tiles for the north reef trail", column: "TO-DO",
        objective: "Visitors lose signal on the north reef trail; the map must work without it.",
        criteria: ["tiles for the trail are downloaded when the visitor opens the trail page on wifi", "the map renders from the cache in airplane mode", "the cache is capped at 40 MB"] },
      { title: "Tide warning when a trail closes within the hour", column: "TO-DO",
        objective: "Warn visitors on a tidal trail before the tide closes it.",
        criteria: ["a notification fires 60 and 15 minutes before closing", "no warning is sent for trails the visitor has not opened today"],
        comment: "Rangers want the 15-minute warning to be impossible to miss. Sound and vibration, not just a banner." },
      { title: "Species sightings form: attach up to three photos", column: "Backlog",
        objective: "Let visitors attach photos to a sighting report.",
        criteria: ["up to three photos per report", "photos are resized to 1600 px on the long edge before upload"] },
      { title: "Larger tap targets on the trail list", column: "Backlog",
        objective: "Trail list rows are hard to tap with wet hands.",
        criteria: ["every row is at least 48 px tall", "the whole row is tappable, not just the title"] },
      shipped({ title: "Dark theme for night snorkel tours",
        objective: "Night tour guides asked for a screen that does not ruin night vision.",
        criteria: ["a dark theme with no pure white", "it follows the system setting"] }),
      shipped({ title: "Crash when the visitor denies location",
        objective: "The app closes when location permission is denied.",
        criteria: ["denying location shows the map without the visitor's position", "a test covers the denial path"] }),
    ],
  },
  {
    name: "quarry-api",
    pickup: true,
    cards: [
      { title: "Price list endpoint with volume tiers", column: "TO-DO",
        objective: "Contractors' ordering systems need tiered prices per material.",
        criteria: ["GET /v2/prices returns each material with its tiers by tonnage", "prices are in the buyer's currency", "the response is cached for 10 minutes"] },
      { title: "Rate-limit the delivery slot search", column: "TO-DO",
        objective: "One integrator calls the slot search every second.",
        criteria: ["60 searches per minute per API key", "a refused call answers 429 with Retry-After"] },
      { title: "Webhook when a delivery is dispatched", column: "Backlog",
        objective: "Push dispatch events instead of making integrators poll.",
        criteria: ["a signed webhook per dispatched delivery", "retries with backoff for 24 hours"] },
      { title: "Deprecate the v1 order endpoint", column: "Backlog",
        objective: "v1 orders are 2% of traffic and block the schema change.",
        criteria: ["v1 answers with a Sunset header", "the docs name the v2 replacement"] },
      shipped({ title: "Return weighbridge tickets as PDF",
        objective: "Customers want the weighbridge ticket attached to the invoice.",
        criteria: ["GET /v2/deliveries/{id}/ticket returns a PDF", "the PDF carries the gross, tare and net weight"] }),
      shipped({ title: "Fix timezone of delivery windows",
        objective: "Delivery windows show in UTC instead of the depot's local time.",
        criteria: ["windows are returned with the depot's offset", "a test covers the daylight-saving change"] }),
    ],
  },
  {
    name: "atlas-docs",
    pickup: true,
    cards: [
      { title: "Search across every guide", column: "TO-DO",
        objective: "Readers cannot find a topic unless they know which guide it is in.",
        criteria: ["one search box on every page", "results show the guide and section"] },
      { title: "Versioned docs for the 2.x and 3.x APIs", column: "Backlog",
        objective: "Integrators on 2.x read 3.x pages and file wrong bugs.",
        criteria: ["a version switcher on every page", "2.x pages carry a banner naming the current version"] },
      shipped({ title: "Broken links report in CI",
        objective: "Dead links ship unnoticed.",
        criteria: ["CI fails on an internal link that does not resolve", "external links are checked weekly, not per build"] }),
    ],
  },
];

export function cardBody(card: SeedCard): string {
  return [
    "## Objective",
    card.objective,
    "",
    "## Acceptance criteria",
    ...card.criteria.map((c) => `- ${c}`),
  ].join("\n");
}

export const SHIPPED_TITLES = new Set(
  PROJECTS.flatMap((p) => p.cards.filter((c) => c.shipped).map((c) => `${p.name}\u0000${c.title}`)),
);

export const isShipped = (project: string, title: string) =>
  SHIPPED_TITLES.has(`${project}\u0000${title}`);
