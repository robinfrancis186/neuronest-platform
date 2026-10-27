# Public-data age reference — 26 October 2026

NeuroNest now includes an age-only research model for 13 selected tasks from
the Netherlands SMOCC cohort in `childdevdata`. This model predicts the recorded
research-task pass rate at a given age. It does **not** predict a disorder,
developmental delay, a child's future skills, or the probability that a parent's
answer is correct. Its output never changes follow-up recommendations.

## Source and permission

- [childdevdata](https://d-score.org/childdevdata/), distributed under **CC BY 4.0**.
- [Source documentation](https://d-score.org/childdevdata/reference/gcdg_nld_smocc.html).
- Pinned source revision: `b9ba1bf4932ef6d098619eed8f28bd40470e60fa`.
- Raw data SHA-256: `0160e68cce052d97134804eb241702020f4371932e865e1832a4f5cf62523b34`.
- Herngreen WP, Reerink JD, van Noord-Zaadstra BM, Verloove-Vanhorick SP,
  Ruys JH. _The SMOCC-study: Design of a representative cohort of live-born
  infants in the Netherlands._ European Journal of Public Health. 1992;2:117–122.
- van Buuren S, Eekhout I et al. _childdevdata: Child Development Data_.
  Cite the package and source cohort when reusing this derivative.
- NeuroNest changes: selected tasks, engineering links to related checklist
  prompts, English/Malayalam display labels, child-partitioned weighted monotone
  age models, rounded estimates and aggregate support counts. The translations
  and links are not an officially validated instrument adaptation.

No raw source record, subject ID, name, or individual outcome is bundled in
the app or committed to the repository. The aggregate JSON artifact is also a
CC BY 4.0 derivative. Records from NeuroNest accounts are never used as training data.

## Measured data quality

The pinned file has 16,722 visits for 2,038 children and no duplicate child/age
keys. **184 visits have no age and are excluded**, leaving 16,538 age-known visits.
Item scores must be 0, 1, or missing. Missing item scores remain missing; they
are never converted to failed milestones. Coverage is item-specific and largely
reflects scheduled measurement ages, not a random sample at every age.

Each child is assigned once by SHA-256 ID modulo five: partition zero is held
out. All visits from the same child stay together across every item. This gives
1,633 training children and 405 held-out children. Known sibling/family IDs are
not supplied, so this is child grouping, not proven family grouping.

An isotonic regression uses **age in days only**. Each child's observed visits
for an item sum to one in the fitting and evaluation weights. No diagnosis,
sex, ethnicity, household wealth, or another task's outcome is an input.
The deployed parameters use training children only; there is no full-data refit.

All 13 tasks beat the training-mean constant baseline on child-held-out weighted
Brier error. Per-task counts, missingness, age exclusions and errors are in
[`milestone-reference-evaluation.json`](milestone-reference-evaluation.json).
These are internal task-attainment results, **not clinical accuracy metrics**.
The runtime also requires at least 50 training children measured within 31 days
of the requested age. It refuses extrapolation outside each task's observed
training-age span. Sparse, unmatched and older-age items receive no estimate.
Rates are rounded to five in a hundred to avoid displaying false precision.

## App integration

New saved milestone check-ins include `summary.research_reference`, computed
server-side from the age in days at submission. The result is an immutable
snapshot with the artifact version and source attribution. The optional
**Research age context** panel shows the actual research task label, the cohort
estimate, and coverage. Research task links are explicitly **related**, never
validated equivalents of CDC questions. A parent answer is never relabelled as
the research instrument's pass/fail score.

Existing check-ins remain unchanged. They must not acquire historical estimates
based on a child's current age. Clinical prediction remains unavailable and the
existing AI explanation continues to summarize saved parent responses. This
research panel requires no AI-provider call and sends no child data externally.

## Sources deliberately excluded

- **INCLEN**: the [public combined file](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002615)
  was inspected locally: 3,964 rows, 232 columns, ages 24–119 months. It has
  populated name/informant columns, and no matching infant checklist inputs.
  Do not publish the raw file, infer that it is fully deidentified, or manufacture
  missing app features. No row values or identifiers were printed, retained in
  this report, used for fitting, or sent to a model provider.
- AIIMS / IASQ: ASD-specific cohorts do not establish broad developmental
  prediction, and their instrument answers differ from the app's prompts.
- UNICEF MICS: research authorization is required; no access application or
  scrape bypass was attempted.
- Eka-IndicMTEB: medical-term retrieval evaluation, not developmental outcomes;
  underlying SNOMED terminology rights need resolution before use.

No combined synthetic clinical labels, scraped patient stories, or questionnaire
cutoffs are used as independent outcomes. Clinical prediction still needs a
compatible, permissioned cohort, an independent clinical reference, external
evaluation and a reviewed intended use. This change does not bypass those gates.

## Reproduce

Use a separate environment, not production dependencies:

```sh
uv venv /tmp/neuronest-data-venv
uv pip install --python /tmp/neuronest-data-venv/bin/python -r scripts/requirements-milestone-reference.txt
/tmp/neuronest-data-venv/bin/python scripts/build-milestone-reference.py --cache /tmp/neuronest-public-data
```

The builder fetches only the pinned licensed data if absent, verifies its digest
and row validity, and writes aggregate parameters and evaluation JSON. The raw
cache stays outside the repository. No scraping is needed because the publisher
provides a direct download. `test_milestone_reference.py` checks real-artifact
integrity, age-specific estimates, unsupported ages, sparse support and tampering.
