# Implementation notes — 19 November 2026

The original PROJECT_REVIEW.md describes the pre-fix snapshot. This document records the implemented repairs and remaining limits.

## Implemented

- Restored reusable skill extraction and safe seed preprocessing with explicit replacement, backups, and atomic output replacement. Existing seeds are skipped by default.
- Replaced runtime JSON writes with a single SQLite transaction containing candidates and jobs. Failed status/job/upload persistence rolls back the in-memory mutation. JSON and CSV seed data were preserved.
- Serialized candidate publication and matching through a reentrant state lock. Upload document parsing and blocking Ollama work now run in FastAPI's thread pool. File reads are bounded; corrupt documents and legacy DOC are rejected; DOCX table text is extracted and expanded ZIP size is limited.
- Configured Ollama through OLLAMA_URL/OLLAMA_MODEL, using the locally installed qwen-claude-9b-quality model by default. Added structured JSON generation, disabled model thinking for extraction, validated skill arrays, clamped experience, recorded parser attribution and partial extraction. Corrected C++ matching, senior job-title precedence, and date-range experience fallback.
- Matched experience to the job's required years and corrected missing/duplicate skill-component weighting.
- Aligned category/histogram API fields with frontend charts, labeled the static timeline as demo, corrected candidate-employer chart labels, and disclosed seed-data limitations in the app.
- Added persistent browser preferences, API endpoint testing, theme initialization/synchronization, explicit disabled account controls, error/retry views, query invalidation, correct ranking navigation, job selection through URLs, safer CSV export, mobile navigation, and keyboard activation for key selectors.
- Split pages into lazy-loaded bundles. Removed the obsolete duplicate matching implementation in favor of a re-export.
- Corrected the notebook classification vocabulary fitting to use training data only, added missing exploratory requirements, and rewrote setup instructions around actual behavior.
- Added optional shared-instance API token protection and changed the Windows launcher to loopback. This is not a multi-user identity system.
- Added optional C++17 weighted-score CLI, header, CMake configuration, and CTest cases. The app continues to use its Python score calculation.

## Verification

- Frontend production build passed. Lazy loading removed the former oversized-single-bundle warning.
- Lint passed with two non-blocking Fast Refresh warnings in shared button/badge component modules.
- Python regression suite covers parser schema fallback, C++ skill extraction, seniority/date experience, corrupt upload rejection, upload/match flow, SQLite failure preservation, overview totals, API token enforcement, and status rollback. Mutation tests use temporary SQLite storage.
- Live local Ollama inference succeeded: synthetic Jane Smith resume returned Python/C++/SQL, five years, and `parsed_by: ollama`, in approximately 20.7 seconds. An earlier attempt with larger generation/context settings timed out and correctly used fallback; generation settings were then reduced.
- Preprocessing without replacement preserves existing seeds.
- Follow-up verification: found MinGW GCC 6.3 at C:\MinGW\bin\g++.exe. Built the C++17 executable with -Wall -Wextra -Werror -O2 and static linking. Eight boundary/invalid-input cases and 100 deterministic weighted-score cases passed. CMake was not needed; cpp/build.ps1 provides the tested direct build.

## Remaining limits

Existing seed identities and extracted education/experience are not repaired or retroactively validated. Reprocessing all resumes would take substantial model time and create different data; original datasets are preserved. Review or reparse records before operational use.

The application supports one backend process, with an in-memory TF-IDF index and a serialized SQLite state snapshot. Full multi-user authentication, permissions, audit logs, notification delivery, and account lifecycle are not implemented. Security/account controls are disabled and these limits are documented. Browser preferences are local to the browser, not a user account.

OCR, complete long-document model extraction, full browser visual/accessibility testing, sustained load testing, ranking accuracy evaluation, and dependency vulnerability auditing remain outside the verified changes. Classification evaluation in the exploratory notebook was not rerun.


## Compiler and running-project verification

- Found and fixed a half-point floating-point rounding mismatch. Python and C++ now use explicit half-up rounding with a representation tolerance.
- All 10 unittest methods passed, including the C++ checks (108 cases within two test methods).
- Final production frontend build passed.
- Live HTTP checks used a temporary SQLite database and separate API port: job creation, resume upload, status update, profile retrieval, matching, corrupt DOCX rejection, and database persistence across server restart passed. Temporary test data was removed automatically.
- Browser verification confirmed loaded dashboard counts, candidate search (seven matches for the test query), job descriptions, and 20 ranked candidates for a selected job. No hiring decisions were made or existing candidate statuses changed.
- Ollama initially was not listening, so the first live upload correctly used regex fallback. Started the installed Ollama service and repeated model inference: Jane Smith, Python/C++/SQL, five years, parsed_by ollama; approximately 34 seconds including model initialization.
- Left backend running at http://127.0.0.1:8000, frontend at http://127.0.0.1:5173, and Ollama at http://127.0.0.1:11434. Final API health confirmed status ok, 2,488 candidates, 50 jobs, and TF-IDF ready.


## Windows launcher repair

Replaced the old batch implementation with a small `start.bat` wrapper and standard-library Python launcher in `scripts/start.py`. The launcher creates `.venv`, caches dependency installation against manifest hashes, starts Ollama if absent, verifies the selected model, waits for API/frontend readiness, detects port conflicts, reuses healthy running services, and writes background logs to `.runtime`. It does not regenerate datasets. Optional switches: `--no-browser`, `--check-only`, `--build-cpp`.

Verified fresh API/frontend startup, dependency setup, C++ build (81.5 smoke score), repeat launch without duplicate servers, invocation from another working directory, and missing-model error exit code 1. PowerShell script execution was blocked on this machine, so the final launcher uses Python and does not alter execution policies. The dependency install also reported five npm audit findings (one moderate, four high); no dependency upgrades were made as part of the launcher change.


## UI and motion refresh

Inspected the supplied Stitch/Romer preview in the browser. Applied its near-black palette, thin borders and chart grid, oversized left-aligned typography, and restrained teal/violet accents to Nexus HR. Rebuilt the landing page with actual API totals, an explicitly illustrative signal diagram, working product links, and scroll-triggered section entrances. Updated the workspace palette, navigation indicator, page transitions, staggered content entrances, and hover/press states. Existing saved light/dark preferences are respected; new sessions default to dark.

Motion uses transform/opacity with restrained easing and reduced-motion support. Mobile navigation scrolls horizontally, page toolbars stack, and the landing visual reflows. Desktop and 390px mobile screenshots were inspected; document widths did not exceed the viewport. Browser checks confirmed loaded API totals and navigation into the dashboard. Final TypeScript/production build passed; lint retains only the two existing shared component export warnings. No frame-rate benchmark was performed.


## Qwen replacement and glass surfaces — 20 November 2026

Removed the selected custom model tag `qwen-claude-9b-quality:latest` after downloading and verifying official `qwen3:4b-instruct` (2.5 GB, Q4_K_M). Other model tags belonging to the user remain installed and are not used by the project. Updated parser, launcher defaults, environment example and UI model labels. Live Ollama reports the new model using an 8,192-token context and approximately 3.9 GB on the GPU.

Replaced example-filled prompting with a Pydantic JSON schema and source-grounding checks. Missing strings/lists remain unknown/empty. Contact fields come from source matches; text fields not found in the source are omitted. Experience uses explicit statements or merged dated employment intervals. Obvious embedded extraction instructions are excluded with a warning. Long resumes use first/last source sections with an explicit partial-extraction warning. Only one model generation runs at a time to reduce GPU contention. This is inference optimization, not model training.

Removed the fabricated profile “AI Summary” recommendation and added provenance, warnings, and “Re-extract with Qwen.” Re-extraction preserves workflow identifiers, status, application date and category; failed model extraction leaves the existing profile intact. Existing seeds were not batch-rewritten. TF-IDF match explanations are deterministic scoring explanations, not generated Qwen judgments.

Added shared translucent cards, glass header/sidebar and modal surfaces, soft ambient gradients, hover sheen, table transitions and dialog entrances. Expensive blur is static and concentrated in navigation/dialogs; reduced-motion overrides disable the ambient movement and sheen. Verified desktop and narrow-browser layout, glass modal open/close, no document overflow at the desktop test viewport, and no browser console errors. Screenshot: `.runtime/glass-qwen-preview.jpg`.

Verification: all 18 unit/regression tests passed, including C++ parity and new grounding/re-extraction tests. Production frontend build passed; lint retains two existing component-export warnings. Three live Qwen fixtures passed: explicit facts, unknown personal/education data, and an embedded instruction requesting invented credentials. Warm extraction timings were 6.81, 5.37 and 5.60 seconds; this tiny fixture set is not a general accuracy or performance benchmark. A separate live API workflow passed upload with parsed_by=ollama, creation/status/profile/ranking, invalid documents and persistence after restart, using temporary state.

Limits: source string checks reduce unsupported generation but do not prove a resume is truthful, guarantee correct associations between its sections, or establish general extraction accuracy. Existing seed records need deliberate re-extraction/review. No fine-tuning, complete seed regeneration or frame-rate benchmark was performed.


## Resume matching audit and repair

Reproduced the reported missing-resume issue against the running data: seven uploaded resumes were stored, but none appeared in the top 100 candidates for JOB-0 when ranked against the complete 2,491-person pool. The previous default UI displayed only 20 results, lacked an upload-specific pool, and did not carry a resume ID from profile/upload actions into matching. The mobile job list also consumed the fixed-height results layout.

Added a dedicated My resume to jobs view, which defaults to the latest upload and compares that exact resume against all active jobs. Resume selection, filtering, score breakdowns, matched/missing skills, explicit error/empty states and refresh are available. The Job to candidates view defaults to uploaded resumes; the full candidate pool remains selectable. Upload-success/profile links preserve the resume ID. Upload discovery uses upload provenance rather than category, because uploads can be categorized as Frontend, Backend or Data Analysis. Matching queries include pool/resume keys and refresh on window focus. The mobile job list is bounded and results remain in normal document flow.

Backend additions: uploaded-source filtering for candidate listing and job ranking; exact candidate filtering against the correct TF-IDF rows; GET /api/candidates/{id}/matches for sorted active-job comparisons. Existing matching API behavior is preserved for callers that do not specify a source. No scores are boosted to force a desired match and no stored candidate data was changed.

Verified live: all seven uploads listed, latest upload returned 50 job matchups in about 0.17 seconds, and uploaded-only JOB-0 ranking included every upload. Browser verification showed the actual uploaded PDF selected, 50 results, filter narrowing to one result, and Run AI Match refresh. All 20 regression tests passed, including a case proving an upload excluded by the full-pool top-N is returned by uploaded-only ranking. Build passed; lint retains two existing component-export warnings. Existing seed job requirements remain demonstration data and were not silently regenerated.


## GitHub publication checks

Prepared this project for Sharingan001/Ai-Based-Resume while preserving the repository's existing main-branch history and MIT attribution. Local resume CSVs, ZIPs, structured candidate/job seeds, SQLite state, environment secrets, model files, installed dependencies, caches and screenshots are excluded. Cleared notebook execution outputs before publication. A clean checkout starts empty; setup instructions explain creating a job and uploading a resume.

Made regression tests independent of local datasets using synthetic candidate/job fixtures. Added GitHub Actions for Python tests, C++ compilation, frontend build/lint and frontend dependency audit. Updated compatible npm dependencies to clear five audit findings. Replaced vulnerable PyPDF2 3.0.1 with maintained pypdf 7.1.1 and added valid/corrupt PDF coverage. Backend and frontend dependency audits reported no known vulnerabilities at verification time. Lint has two non-blocking Fast Refresh component-export warnings.

Publication validation completed with 21 passing tests from the dataset-free checkout, a live empty-database Qwen upload/matching smoke test, successful C++ compilation, frontend production build, and dependency audits reporting no known vulnerabilities.
