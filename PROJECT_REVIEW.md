# Nexus HR project review

Reviewed on 19 November 2026. Scope: the supplied folder, not an upstream repository.

## Assessment

The React application builds, but this is a prototype with substantial correctness and reliability gaps. The README's production-grade and zero-mock-data claims are not supported by the implementation and supplied databases. Repair data provenance, persistence, preprocessing, and API/UI contracts before relying on the rankings or analytics.

This review does not change application source or existing datasets. Running the frontend build regenerated `frontend/dist` and TypeScript build metadata. This report is a new file.

## Coverage and method

- Read the four Python source files, all frontend application source, styles, components, hooks, routing, configuration, startup script, dependency manifests, and documentation.
- Read every notebook cell and compiled its eight code cells without executing training or downloading NLTK resources.
- Parsed both complete CSV datasets and both JSON databases; checked record counts, missing CSV fields, duplicate IDs/text, and selected provenance indicators.
- Checked ZIP integrity, SVG XML validity, dependency-lock consistency, and generated frontend build output.
- Excluded installed third-party `node_modules`, Python bytecode, and generated minified bundles from manual line-by-line source review. Binary artwork and macOS metadata were inventoried rather than interpreted as code.
- Scope contained 66 files outside dependency/cache/build directories before this report, including approximately 5,282 lines of Python, TypeScript, TSX, CSS, and batch source.
- Runtime checks and their limits appear below. Static findings are distinguished from reproduced failures.

## High-priority findings

### 1. Database generation fails on a missing function (P1)

Location: `api/preprocess.py:81`.

`process_all_jobs()` imports `extract_skills`, but `api/nlp_engine.py` does not define it. A fresh setup cannot complete job generation. The main script processes and overwrites the candidate database before reaching this failure, so rerunning it can also discard uploaded candidates and status changes before failing.

Restore a shared skill extraction function; validate the entire pipeline before replacing either database. Separate explicit dataset regeneration from normal application startup.

### 2. Candidate information is exposed and writable without authentication (P1 for network deployment)

Locations: `api/main.py:259`, `api/main.py:316`, `api/main.py:332`, `start.bat:130`.

There are no authentication or authorization checks on candidate reads, uploads, job creation, or status changes. The launcher binds the API to `0.0.0.0`, making it reachable on available interfaces subject to firewall/network rules. Anyone able to reach it can read contact information and alter records. The Sign In link simply opens the dashboard. CORS does not provide API authorization.

For a local demonstration, bind to loopback. Before shared deployment, implement authenticated access and permissions on the API, including ownership boundaries where applicable.

### 3. Persistence can truncate or corrupt the databases (P1)

Location: `api/main.py:98`.

Despite its atomic-write docstring, `save_databases()` opens both live files with mode `w`. There is no write lock, temporary-file replacement, transaction, or rollback. A failure after opening a file destroys its previous contents; concurrent request threads can write the same files simultaneously. Every status change rewrites all candidates and jobs. Multiple server processes would also maintain independent, inconsistent in-memory copies.

Use transactional storage, or at minimum serialize writes and atomically replace validated snapshots. Avoid rewriting unrelated datasets for a single status change.

### 4. Upload processing blocks the server event loop (P1)

Locations: `api/main.py:333`, `api/main.py:361`, `api/nlp_engine.py:152`.

The asynchronous upload handler directly performs synchronous document parsing, a blocking HTTP request to Ollama with a 120-second timeout, JSON serialization, and a full TF-IDF rebuild. After the file read, these operations do not yield. A slow upload can prevent the single worker from servicing other requests promptly, including health checks. The frontend upload timeout is also 120 seconds, leaving no allowance for parsing, saving, and rebuilding after a model timeout.

Move blocking work off the event loop and use a bounded processing queue or background job with explicit progress and completion state.

### 5. Matching can read a candidate list newer than its score array (P1)

Locations: `api/main.py:381`, `api/main.py:410`, `api/main.py:418`.

The vectorizer lock covers similarity calculation but not appending candidates or iterating the candidate list. An upload can append a record before rebuilding the matrix, or between score calculation and iteration. The matcher then indexes beyond the similarity array. The lock does not make the entire upload/match operation thread-safe.

Publish immutable candidate/matrix snapshots together, or protect all dependent operations with a consistent synchronization strategy.

### 6. Stored candidate attributes lack reliable provenance (P1 for ranking integrity)

Locations: `api/database.json`, `README.md:43`, `api/main.py:431`.

The database has 2,488 candidates. Of these, 2,465 have `example.com` email addresses absent from their raw resume text; 2,484 stored names are absent from their raw text. There are only 644 distinct names and 50 distinct email strings. These checks establish that the stored identities cannot be treated as directly extracted facts. They do not prove how every field was originally generated.

The current parser cannot reproduce much of this seed data: it initializes status to New and does not synthesize these identities, whereas the database contains records spread across all eight statuses. Existing experience and education values affect rankings. Mark seed/demo records clearly and retain field-level extraction provenance before presenting the database as real operational recruitment data.

## Functional and data-quality findings

### 7. Dashboard and analytics expect nonexistent response fields (P2)

Locations: `frontend/src/pages/Dashboard.tsx:50`, `frontend/src/pages/Analytics.tsx:37`, `api/main.py:213`.

Both pages read `category_counts`; the API returns `category_breakdown`. The category charts therefore receive empty arrays. They also expect `screening_time_saved`, and Analytics expects `resume_length_distribution`; neither field is returned. Add a typed overview response and align the contract. Display unavailable metrics explicitly instead of implying they were computed.

### 8. Analytics misrepresent hard-coded and candidate-derived data (P2)

Locations: `frontend/src/pages/Dashboard.tsx:12`, `frontend/src/pages/Analytics.tsx:87`, `api/main.py:185`, `api/preprocess.py:94`.

The pipeline timeline is a fixed February–August 2026 array. “Top Hiring Roles” and “Top Hiring Companies” display counts of candidates' current roles and employers, but label them Jobs/Postings. Preprocessing invents `activeCandidates` as twice the count of CSV rows sharing a title; there is no candidate-to-job application relationship. These are not measured hiring demand or applicant counts.

Label demo data and candidate-pool statistics accurately. Actual pipeline history requires recorded status events, and applicant counts require job applications or another defined relationship.

### 9. Settings acknowledge changes they do not save (P2)

Locations: `frontend/src/pages/Settings.tsx:42`, `frontend/src/pages/Settings.tsx:50`, `frontend/src/pages/Settings.tsx:209`.

Save Settings only toggles a DOM theme class and shows a success message. Profile, notifications, and API URL remain component state and reset on remount. Test always calls the existing `fetchHealth`, ignoring the entered URL. Password, 2FA, account deletion, and avatar buttons have no action handlers. Readiness indicators use the presence of any health object rather than `data_loaded` or `tfidf_ready`. The top-bar theme state can also disagree with changes made in Settings.

Implement persistence and actual endpoint selection, or mark unimplemented controls unavailable. Use a shared theme state and accurate health flags.

### 10. Parser output is not adequately validated (P2)

Location: `api/nlp_engine.py:154`.

A model response containing `skills: "Python"` is accepted as six single-character skills. Negative experience is also accepted. Reproduced with a synthetic model response returning experienceYears -5. Only the presence of name is required to accept an otherwise incomplete object. This can create invalid profiles and negative score components.

Validate the complete response with a schema before accepting it, including a string-array skill type and bounded, nonnegative experience. Record extraction failures and missing fields explicitly.

### 11. Regex fallback misses skills, seniority, and date-based experience (P2)

Locations: `api/nlp_engine.py:243`, `api/nlp_engine.py:254`, `api/nlp_engine.py:278`.

Reproduced cases:

- `Skills: C++` produces no skills because the trailing word boundary does not match after `++` followed by whitespace/end-of-text.
- `Senior Software Engineer` becomes `Software Engineer` because the shorter title is searched first.
- `Software Engineer / 2018 - 2024` yields zero years because date ranges are only used for display, not experience calculation.

Use punctuation-aware skill boundaries, longest-title precedence, and an explicit method for merging date intervals without double-counting overlapping jobs.

### 12. LLM parsing silently discards most of long resumes (P2)

Location: `api/nlp_engine.py:121`.

Only the first 4,000 characters are sent to the model. In the stored database, 2,110 resumes exceed this limit. Skills, education, and work history later in a document may be omitted without any UI indication. This count measures exposure to truncation, not the number of proven incorrect profiles.

Use section-aware extraction or chunking and make partial processing visible. Preserve provenance for each extracted field.

### 13. Job experience requirements do not affect matching (P2)

Locations: `api/main.py:431`, `api/main.py:425`.

Experience is always scored as years divided by ten, regardless of `experienceRequired`. A candidate meeting a two-year requirement receives only 20/100 experience points. A job with no preferred skills cannot award the preferred 20 skill points even when every required skill matches. Required-skill duplicates also inflate the denominator while the overlap is a set.

Define score behavior against job-specific requirements; normalize/deduplicate skill names and redistribute weights when a component is absent. The present scores are heuristic similarity scores, not calibrated hiring probabilities. No ranking-quality evaluation is supplied.

### 14. Parse errors are returned as resume text (P2)

Locations: `api/main.py:79`, `api/main.py:90`, `api/main.py:357`.

PDF/DOCX helpers return strings such as `[DOCX parse error: ...]` on exceptions. Upload only checks string length. A sufficiently long error therefore passes validation and becomes a candidate. Legacy `.doc` files are also routed through the DOCX parser even though that parser does not support binary Word documents. DOCX extraction reads paragraphs only, omitting table content used by many resume templates.

Return explicit parse failures, reject unsupported `.doc` uploads, and extract table text where appropriate. Keep corrupt documents out of the candidate database.

### 15. Parser attribution is based on the candidate's name (P2)

Location: `api/main.py:391`.

Any candidate whose name is not Unknown Candidate is labeled as parsed by Ollama. A successful regex name extraction is consequently misreported as model extraction; a model result with an unknown name is mislabeled in the opposite direction. Return the actual parser method from the NLP engine.

### 16. Cache invalidation leaves different screens inconsistent (P2)

Locations: `frontend/src/pages/Candidates.tsx:48`, `frontend/src/pages/CandidateProfile.tsx:36`, `frontend/src/pages/Jobs.tsx:28`, `frontend/src/pages/AIScreening.tsx:50`, `frontend/src/main.tsx:8`.

Status changes omit overview invalidation; profile changes omit candidate-stats invalidation; list changes omit cached profile invalidation; job creation omits overview invalidation; uploads omit candidate-stats and match invalidation. Most queries stay fresh for five minutes with focus refresh disabled. Users can navigate between screens and see contradictory totals or status values. Invalidate all affected query families consistently.

### 17. Several match actions lead to the upload screen (P2)

Locations: `frontend/src/pages/Dashboard.tsx:78`, `frontend/src/pages/CandidateProfile.tsx:119`, `frontend/src/pages/Jobs.tsx:116`, `frontend/src/App.tsx:37`.

Run AI Match/Run AI Screen actions navigate to `/screening`, which now contains only upload functionality. Ranking is at `/ranking`. Job-card actions also discard the selected job. Update destinations and preserve relevant job selection. `AIMatcher.tsx` is an older combined implementation that is no longer routed.

### 18. API failures are displayed as empty data or missing candidates (P2)

Locations: `frontend/src/pages/Candidates.tsx:39`, `frontend/src/pages/CandidateProfile.tsx:30`, `frontend/src/pages/Jobs.tsx:26`, Dashboard and Analytics queries.

These views generally consume only data and loading state. After a backend/network failure, the candidates page says no candidates found, the profile says candidate not found, and charts appear empty. Job/status mutation failures have no visible explanation. Add distinct loading, empty, not-found, and error states with retry actions.

### 19. Mobile layout and keyboard interaction need work (P2)

Locations: `frontend/src/components/layout/AppShell.tsx:9`, `frontend/src/components/layout/Sidebar.tsx:62`, AI Ranking and Settings layouts.

The sidebar is always fixed at 256 pixels and content always reserves that width. Ranking and Settings retain desktop column proportions without small-screen alternatives. Job selectors and upload areas use clickable divs without keyboard behavior; several icon-only buttons lack accessible names; the job modal lacks focus management and dialog semantics. These are source-level findings; no browser accessibility or visual audit was run.

### 20. Exported CSV does not escape all candidate fields (P2)

Location: `frontend/src/pages/AIRanking.tsx:37`.

Name, role, and location are wrapped in quotes without escaping embedded quotes. Values containing quotes/newlines can damage CSV structure. Spreadsheet formula prefixes are not neutralized either. Use a consistent CSV serializer and a deliberate text-cell policy for untrusted candidate data.

## Setup, research, and maintenance findings

- `README.md:157` permits Node 18, but the locked Vite package declares `^20.19.0 || >=22.12.0`. The actual local build passed on Node 26.13.1. Update prerequisites from the locked dependency requirements.
- `start.bat` prints Backend is healthy even after its retry limit is exceeded. Its curl check does not verify HTTP success or inspect readiness flags. `api/main.py:159` always returns status ok, including when data loading failed.
- Startup loads both databases in one try block. If either fails, DATA_LOADED remains false; uploads/job creation can still write while candidate listing and matching continue returning 503. Validate databases independently and define a recoverable initialization state.
- The upload size guard runs after the complete file is read into memory. Enforce a bounded read, and separately constrain document expansion/processing costs.
- Rebuilding TF-IDF and rewriting the complete JSON database on every upload scales poorly. Sequential batch preprocessing has no resume/checkpoint mechanism and calls Ollama for every resume. The launcher's 60–120 second estimate is not justified for this path.
- Python dependencies have lower bounds only and no lock file. The frontend package lock matches its manifest. No automated project tests or CI workflow were found.
- Notebook cells 11 and 15 fit TF-IDF before splitting classification train/test data, allowing the held-out corpus to influence feature selection and IDF. Split first and fit preprocessing on training data. Also consider stratification and duplicate-text separation. The raw resume CSV contains two duplicate-text records.
- The notebook imports NLTK, which is missing from root requirements. It also needs notebook tooling and NLTK corpora. Its classifier is not saved or used by the API, and final weighted scores are computed only against the first job. Claims about threshold optimization, skill-gap detection, fairness improvement, and 60–75% time savings are not demonstrated by its code/evaluation.
- The legacy Streamlit application uses a different scoring pipeline and relative CSV paths. It was reviewed but not exercised in a browser. Its 70% similarity recommendation is not supported by an evaluation in this folder.
- Root README scoring weights are 55/30/15; the API uses 55/25/10/10. Documentation omits the current Ollama setup and overstates implemented settings, background processing, and analytics.
- Minor cleanup: unused `AIMatcher.tsx`, template `App.css`/artwork, default frontend document title, missing landing-page pricing/how-it-works anchors, empty-result pagination showing page 1/0 and an inverted range, and zero KPI values rendered as a dash via `||`.

## Dataset validation

| Item | Result |
| --- | --- |
| Resume.csv | 2,484 records; 24 categories; no empty CSV fields; two duplicate raw-text records |
| training_data.csv | 853 records; five columns; no empty CSV fields |
| database.json | 2,488 records; unique IDs; 351 records with empty skill arrays |
| jobs_database.json | 50 records; unique IDs |
| Resume.csv.zip | Integrity check passed; contains Resume.csv and macOS metadata |
| Notebook | 17 cells, including eight syntactically valid code cells |

## Verification

- `npm run build`: passed TypeScript and Vite production build. Main JavaScript bundle approximately 846.40 kB, 248.83 kB gzip; Vite warned about the chunk exceeding 500 kB.
- `npm run lint`: passed with seven warnings: two mixed component/utility exports and five components created during render in chart tooltips.
- All four Python files parsed successfully using BOM-aware decoding.
- All eight notebook code cells compiled successfully. This is syntax verification, not evidence that notebook training runs successfully.
- Regex and synthetic LLM-response probes reproduced the parser defects described above.
- Installed backend requirements plus HTTPX into a temporary virtual environment. FastAPI TestClient probes returned 200 for health, overview, jobs, paginated candidates, candidate stats, and matching; the match probe returned three results as requested.
- Calling job preprocessing reproduced the missing `extract_skills` ImportError before any job database write.
- All mutation probes redirected database paths into a temporary directory and used copied in-memory records. The original project databases were not written by these probes.
- A synthetic TXT upload succeeded using the forced regex fallback, but the API incorrectly returned `parsed_by: ollama`.
- A status update with no authentication succeeded (HTTP 200).
- A corrupt DOCX ZIP missing `[Content_Types].xml` generated an 81-character parser error. Upload accepted it as a candidate (HTTP 200).
- Changing a job's experience requirement to `99+ years` left its top match response unchanged.
- A controlled interleaving that appended a candidate after similarity computation reproduced an IndexError in matching. This is a deterministic race reproduction, not a load-test frequency estimate.
- During an upload with a synthetic 300 ms parser delay and the real save/rebuild path, an event-loop timer scheduled for 20 ms resumed after approximately 4,187 ms.
- Injecting a serialization failure after opening the temporary candidate database left that file at zero bytes, reproducing destructive persistence failure.

Limits: no real Ollama inference, complete notebook training, Streamlit UI run, browser end-to-end/visual/accessibility testing, sustained concurrency load test, or dependency vulnerability audit was performed. Third-party dependency source was not reviewed. Syntax/build success does not establish model accuracy or production readiness.

## Suggested repair order

1. Repair preprocessing and protect existing data from regeneration and failed writes.
2. Establish trustworthy seed-data provenance and clearly separate demonstration records.
3. Fix API access control for shared deployment, upload scheduling, and matching synchronization.
4. Validate parser outputs and document extraction; repair fallback extraction and scoring semantics.
5. Align the overview contract and analytics meanings; wire settings, routes, error handling, and cache invalidation.
6. Add regression coverage for these failures, then exercise the complete browser workflow, keyboard access, and small-screen layouts.
