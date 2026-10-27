import { readFileSync } from "node:fs";
const milestoneCatalog = JSON.parse(readFileSync(new URL("../../../services/core/api/milestone_catalog.json", import.meta.url), "utf8"));
/** Synthetic rows shaped like the real API, with deliberately long values so
 *  layout is tested against realistic worst cases, not tidy short strings. */
const page = (results) => ({ count: results.length, next: null, previous: null, results });
const iso = (days, h = 10) =>
  new Date(Date.UTC(2026, 8, 9 + days, h, 30)).toISOString();

const children = [
  { id: "c1", name: "Aarav Nair", date_of_birth: "2019-04-12", language: "en", transition_status: "child" },
  { id: "c2", name: "Isha Nair", date_of_birth: "2021-11-03", language: "ml", transition_status: "child" },
];

export const fixtures = {
  "me": { id: "audit-user", email: "audit@example.invalid", username: "auditparent", display_name: "Ananya Nair", role: "parent", language: "en" },
  "children": page(children),
  "readiness": { identity: { ready: true }, payments: { ready: false, detail: "Razorpay keys are not configured." }, video: { ready: false }, scanner: { ready: false }, assistant: { ready: true }, diagnostic_prediction: { ready: false, detail: "Held behind the clinical promotion gate." } },
  "preferences": { language: "en", reminders: true },
  "observations": page(Array.from({ length: 8 }, (_, i) => ({
    id: `o${i}`, child: "c1", domain: ["communication", "social", "movement", "daily_living", "sensory"][i % 5],
    title: i === 0 ? "Used a three-word sentence to ask for the blue cup at breakfast" : `Little moment ${i + 1}`,
    status: ["observed", "not_yet", "unsure", "observed"][i % 4],
    note: i === 0 ? "He repeated it twice without prompting, which is new for mornings when the house is noisy." : "A short note.",
    observed_on: "2026-09-0" + ((i % 8) + 1), author_name: "Ananya Nair",
  }))),
  "goals": page(Array.from({ length: 5 }, (_, i) => ({
    id: `g${i}`, child: "c1", title: i === 0 ? "Join a turn-taking game with one other child for five minutes" : `Goal ${i + 1}`,
    description: "Practised at home and in therapy, reviewed every fortnight.", status: ["active", "achieved", "paused"][i % 3], target_date: "2026-12-01",
  }))),
  "growth": page([{ id: "gr1", child: "c1", measured_on: "2026-08-01", weight_kg: "18.40", height_cm: "108.00" }]),
  "vaccinations": page([{ id: "v1", child: "c1", name: "MMR second dose", administered_on: "2026-03-11", due_on: null, note: "Given at the district clinic." }]),
  "therapy-sessions": page([{ id: "t1", child: "c1", practitioner: "p1", practitioner_name: "Dr. Maya Menon", scheduled_at: iso(2), note: "Speech and language, focus on requesting." , status: "scheduled" }]),
  "referrals": page([{ id: "r1", child: "c1", reason: "Audiology review before the next speech block", destination: "District Hospital ENT", status: "sent" }]),
  "records": page(Array.from({ length: 4 }, (_, i) => ({
    id: `rec${i}`, child: "c1", kind: ["consultation", "assessment", "prescription", "report"][i],
    title: i === 0 ? "Developmental consultation summary — September review" : `Record ${i + 1}`,
    body: "Structured clinical text that can run to several lines in a real chart.",
    status: i === 0 ? "signed" : "draft", signed_at: i === 0 ? iso(-3) : null, author_name: "Dr. Maya Menon", created_at: iso(-4),
  }))),
  "attachments": page([{ id: "a1", child: "c1", filename: "audiology-report-2026-08.pdf", content_type: "application/pdf", size: 284114, scan_status: "clean", author_name: "Dr. Maya Menon", created_at: iso(-5) }]),
  "grants": page([{ id: "gt1", child: "c1", grantee_email: "maya.menon@clinic.example", purpose: "Speech and language therapy", scopes: ["records", "observations", "therapy"], expires_at: iso(90), revoked_at: null, consent_version: "2026-01" }]),
  "guardianships": page([{ id: "gu1", child: "c1", email: "partner@example.invalid", can_share: true, status: "active", scopes: ["records", "observations"] }]),
  "audit": page(Array.from({ length: 6 }, (_, i) => ({ id: `au${i}`, action: ["record.read", "observation.listed", "grant.created", "record.signed"][i % 4], actor_name: "Dr. Maya Menon", child: "c1", created_at: iso(-i - 1) }))),
  "privacy-requests": page([]),
  "practitioners": page([{ id: "p1", display_name: "Dr. Maya Menon", speciality: "Developmental paediatrics", languages: ["en", "ml"], fee_minor: 90000, verified: true, city: "Kochi", bio: "Fifteen years in developmental paediatrics with a focus on early communication." }]),
  "provider-applications": page([]),
  "slots": page(Array.from({ length: 4 }, (_, i) => ({ id: `s${i}`, practitioner: "p1", starts_at: iso(i + 1), ends_at: iso(i + 1, 11), status: "open" }))),
  "appointments": page([
    { id: "ap1", child: "c1", practitioner: "p1", provider_name: "Dr. Maya Menon", starts_at: iso(2), ends_at: iso(2, 11), status: "confirmed", amount_minor: 90000 },
    { id: "ap2", child: "c1", practitioner: "p1", provider_name: "Dr. Maya Menon", starts_at: iso(9), ends_at: iso(9, 11), status: "awaiting_payment", amount_minor: 90000 },
  ]),
  "payments": page([{ id: "pay1", appointment: "ap1", amount_minor: 90000, status: "captured", created_at: iso(-2), child: "c1" }]),
  "messages": page(Array.from({ length: 3 }, (_, i) => ({ id: `m${i}`, child: "c1", body: i === 0 ? "Thank you for the update — please continue the home practice twice a day and we will review at the next session." : `Message ${i + 1}`, sender_name: i % 2 ? "Ananya Nair" : "Dr. Maya Menon", created_at: iso(-i) }))),
  "notifications": page([{ id: "n1", title: "Appointment confirmed", body: "Your consultation with Dr. Maya Menon is confirmed.", read_at: null, created_at: iso(-1) }]),
  "content": page(Array.from({ length: 4 }, (_, i) => ({ id: `ct${i}`, kind: i % 2 ? "video" : "article", title: i === 0 ? "Understanding sensory differences at home and in school" : `Learning item ${i + 1}`, summary: "A reviewed introduction written for families.", language: "en", url: "https://example.org/reviewed", status: "approved" }))),
  "resources": page([{ id: "res1", name: "Kochi Early Intervention Centre", category: "therapy", city: "Kochi", phone: "+91 484 000 0000", verified: true, address: "MG Road, Ernakulam, Kerala 682011" }]),
  "screenings": page([{ id: "sc1", child: "c1", instrument: "synthetic-demo", status: "complete", outcome: "follow_up", created_at: iso(-10) }]),
  "screenings/instruments": { instruments: [{ id: "synthetic-demo", name: "Synthetic demonstration instrument", enabled: true, min_age_months: 16, max_age_months: 30, questions: [] }] },
  "operations": page([{ id: "op1", kind: "notification.send", status: "failed", attempts: 3, created_at: iso(-1) }]),
  "policies": { version: "2026-01", ready: true, cancellation_window_hours: 24 },
  "exports": { records: [] },
  "milestone-checkins": page([]),
  "milestone-checkins/catalog": { version: milestoneCatalog.version, age_months: 90, band: null, ai_enabled: false, notice: milestoneCatalog.notice },
  "milestones": page([]),
  "assessments": page([]),
  "reports": page([]),
};

export function respond(pathname) {
  const key = pathname.replace(/^\/v1\//, "").replace(/\/$/, "").split("?")[0];
  if (key in fixtures) return fixtures[key];
  // Anything unmodelled answers as an empty page rather than an error, so a
  // missing fixture never masquerades as a layout problem.
  return { count: 0, next: null, previous: null, results: [] };
}
