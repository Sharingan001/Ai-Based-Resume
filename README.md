# Nexus HR — AI-Based Resume Screening

Local resume parsing, candidate management, job matching, and recruitment analytics using FastAPI, React, and Ollama.

## Run on Windows

Use Python 3.10+ and Node 22.12+ (or Node 20.19+). Ollama must be running for model extraction. The configured default is the installed `qwen3:4b-instruct` model.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r api/requirements.txt
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. `start.bat` creates a project `.venv`, installs dependencies when manifests change, starts Ollama if needed, then starts both services and opens the browser. It reuses healthy services already running. Keep one backend process: multiple independent workers are not supported by the in-memory search index.

## Ollama configuration

```powershell
ollama list
$env:OLLAMA_MODEL = "qwen3:4b-instruct"
$env:OLLAMA_URL = "http://localhost:11434"
```

Set these before starting the API. Install another model using `ollama pull MODEL` and set `OLLAMA_MODEL` accordingly. Valid structured model output is preferred; connection, timeout, and schema failures use a regex fallback. Upload responses identify which parser actually ran. Very long resumes are marked `partial_parse` if processed from the first and last 8,000 characters. PDFs must contain extractable text; OCR and legacy binary `.doc` are not supported. DOCX tables are included.

## Persistence and datasets

On first startup, JSON files seed the in-memory candidate/job pool. All subsequent edits are saved together in `api/state.sqlite3` using a transaction. Restarting loads SQLite state first. Back up this file before migrating or replacing it. Seed JSON files are preserved by normal application use.

If you use the legacy seed candidate data, it contains demonstration identities, contact details, and workflow statuses that cannot be verified from raw resumes. Treat existing records as demonstration data. Ranking is heuristic and has not been validated as a hiring decision model. The pipeline timeline is explicitly labeled demo; employer/role charts describe candidate history. Time-savings metrics are unmeasured.

The original CSV files contain 2,484 resume rows and 853 job-description rows. To generate only missing JSON seeds:

```powershell
python api/preprocess.py
```

To deliberately regenerate a seed, use `--only jobs --replace` or `--only candidates --replace`. Existing files receive `.bak` copies. This does not overwrite runtime SQLite state. Model-based batch preprocessing can take hours and should not be used for normal startup.

## Matching and settings

Ranking uses 55% TF-IDF cosine similarity, 25% skill overlap, 10% experience against the selected job requirement, and 10% education. Required/preferred skills use 80/20 weighting when both are present. An absent skill component transfers its weight to the remaining one. Scores are not probabilities.

Profile, notification preferences, API URL, and appearance are saved in this browser. Reload after changing the API URL. Notification delivery, account management, password changes, and 2FA are not implemented; account controls are disabled. This is a local application without user accounts.

## Shared access

The launcher binds to loopback. Do not expose the API publicly as a multi-user HR service. Optional `NEXUS_API_TOKEN` on the server and matching `VITE_API_TOKEN` on the frontend protect API requests for a trusted shared instance; the frontend token is visible to its users and is not a user identity or role system. Configure `CORS_ORIGINS` for the frontend origin. Full user authentication, audit logs, and tenant isolation require separate work.

## Checks and C++

```powershell
python -m pip install -r api/requirements-dev.txt
python -m unittest discover -s tests -v
npm run build --prefix frontend
npm run lint --prefix frontend
```

See [cpp/README.md](cpp/README.md) for the optional C++17 final-score CLI and CMake tests. The Python API remains responsible for parsing and TF-IDF. The C++ utility takes four numeric score components.

`Resume.ipynb` and `resume.py` are exploratory alternatives with different scoring. Install root `requirements.txt` for those tools. The notebook downloads NLTK corpora; it is not the deployed classifier.

See [PROJECT_REVIEW.md](PROJECT_REVIEW.md) for the original audit and [FIXES.md](FIXES.md) for implementation/verification notes.


## Windows launcher options

Double-click `start.bat`, or run these from a terminal:

```powershell
.\start.bat --no-browser
.\start.bat --check-only
.\start.bat --no-browser --build-cpp
```

The launcher uses Python and respects Windows script execution policy. It checks the configured Ollama model without automatically downloading models. Logs are written to `.runtime`. It binds the API and frontend to loopback, reports port conflicts, and waits for readiness. Existing datasets are never regenerated during startup. First launch can take several minutes while dependencies install. Close the services using their owning process when finished; closing the launcher does not stop them.


## Qwen extraction (20 November 2026)

The default model is official `qwen3:4b-instruct` (Q4_K_M, 2.5 GB). It replaced the custom `qwen-claude-9b-quality:latest` model. Other installed model tags are not used by this project. Configuration uses an 8,192-token context, deterministic decoding, a JSON schema, and one generation at a time to reduce GPU contention. This is inference configuration, not fine-tuning.

Extracted names, employers, titles, skills and education are checked against source text; unsupported text fields are omitted. Contact details are copied from source matches. Experience uses explicitly stated years or merged dated work intervals. These checks reduce invention but cannot verify whether a resume itself is truthful or resolve every ambiguous layout. Empty/unknown fields and extraction warnings are intentional.

Existing profiles are not automatically corrected by changing the model. Open a candidate profile and choose **Re-extract with Qwen** to reprocess its stored resume. The candidate ID, status and application date are preserved. If model extraction fails, the original profile remains intact. Long resumes retain the first and last 8,000 characters and display a partial-extraction warning.

Ranking continues to use TF-IDF and deterministic scoring; Qwen extracts resume facts. The profile sidebar displays recorded facts and extraction provenance rather than an invented AI recommendation.


## Finding your resume's job matches

Open **AI Ranking → My resume → jobs**. Your latest uploaded resume is selected automatically; use Resume to match to select another. Every active job receives a visible score, including low scores. Filter by title, department or skill. Upload results and candidate profiles also have direct matching links.

For recruiting comparisons, switch to **Job → candidates**, select a job, and choose Uploaded resumes only or the complete pool. Top-N applies inside that selected pool. Qwen extracts the resume facts; this comparison uses TF-IDF and deterministic scoring. A small score does not mean the resume failed to upload.


## GitHub checkout

```powershell
git clone https://github.com/Sharingan001/Ai-Based-Resume.git
cd Ai-Based-Resume
.\start.bat
```

Resume datasets, uploaded documents, runtime SQLite databases, `.env` files and installed models are intentionally excluded from this repository. A fresh checkout starts with an empty talent pool and job list: create a job in Job Descriptions, then upload your own resume under AI Screening. Install Ollama and run `ollama pull qwen3:4b-instruct` before startup. Optional legacy CSV datasets must be supplied separately before running preprocessing or the exploratory notebook.

GitHub Actions builds the frontend and C++ utility and runs backend tests against synthetic fixtures. Unit tests do not require Ollama or private datasets. Live model checks performed locally are separate from CI.

The original project includes work by Harsha Vardhan Maradana; its MIT attribution is retained in LICENSE alongside this repository's existing attribution.
