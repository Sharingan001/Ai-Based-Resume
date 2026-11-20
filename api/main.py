import os
import json
import uuid
import io
import threading
import sqlite3
import re
import math
from functools import wraps
from contextlib import closing
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Request
from fastapi.responses import JSONResponse
import secrets
import zipfile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Optional, Literal
from datetime import date

# ── App Setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="Nexus HR - AI Resume Screening API", version="3.3.0")

# CORS - restrict origins via env variable (wildcard only for local dev)
ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional shared-instance protection; local launcher binds to loopback.
@app.middleware("http")
async def require_api_token(request: Request, call_next):
    token = os.getenv("NEXUS_API_TOKEN", "")
    if token and request.method != "OPTIONS" and request.url.path.startswith("/api/"):
        supplied = request.headers.get("Authorization", "")
        if not secrets.compare_digest(supplied, "Bearer " + token):
            return JSONResponse({"detail": "API token required"}, status_code=401)
    return await call_next(request)

# ── Data Loading ───────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_JSON = os.path.join(BASE_DIR, "api", "database.json")
JOBS_DB_JSON = os.path.join(BASE_DIR, "api", "jobs_database.json")

STATE_DB = os.environ.get("NEXUS_STATE_DB", os.path.join(BASE_DIR, "api", "state.sqlite3"))

candidates_db = []
jobs_db = []
DATA_LOADED = False

try:
    if os.path.exists(STATE_DB):
        with closing(sqlite3.connect(STATE_DB)) as conn:
            row = conn.execute("SELECT payload FROM application_state WHERE id=1").fetchone()
        if not row:
            raise ValueError("Persistent state is empty")
        state = json.loads(row[0])
        candidates_db, jobs_db = state["candidates"], state["jobs"]
    else:
        for path, target in [(DB_JSON, candidates_db), (JOBS_DB_JSON, jobs_db)]:
            if os.path.exists(path):
                with open(path, encoding="utf-8-sig") as f:
                    records = json.load(f)
                if not isinstance(records, list):
                    raise ValueError("Seed database must contain an array")
                target.extend(records)
    DATA_LOADED = True
except Exception as e:
    print(f"Warning: Could not load databases - {e}")

# ── TF-IDF Vectorizer (thread-safe) ───────────────────────────────────────────
_tfidf_lock = threading.RLock()
vectorizer = TfidfVectorizer(
    stop_words="english", max_features=8000, ngram_range=(1, 2), sublinear_tf=True
)
tfidf_matrix = None
if DATA_LOADED and candidates_db:
    all_resumes = [c.get("raw_text", "") for c in candidates_db]
    try:
        tfidf_matrix = vectorizer.fit_transform(all_resumes)
    except ValueError:
        tfidf_matrix = None

# ── NLP Engine ─────────────────────────────────────────────────────────────────
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlp_engine import process_resume, OLLAMA_MODEL, _is_ollama_available

# ── Pydantic Models ────────────────────────────────────────────────────────────
class MatchRequest(BaseModel):
    job_id: str
    top_n: int = Field(default=20, ge=1, le=100)
    source: Literal["all", "uploaded"] = "all"
    candidate_id: Optional[str] = None

class CreateJobRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    department: str
    location: str
    type: str
    experienceRequired: str
    requiredSkills: List[str]
    preferredSkills: List[str]
    description: str = Field(min_length=1, max_length=50000)

# ── Helpers ────────────────────────────────────────────────────────────────────
def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        raise HTTPException(422, "Unreadable PDF document") from e

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
            if sum(item.file_size for item in archive.infolist()) > 25 * 1024 * 1024:
                raise ValueError("Expanded document is too large")
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([p.text for p in doc.paragraphs] + [cell.text for table in doc.tables for row in table.rows for cell in row.cells]).strip()
    except Exception as e:
        raise HTTPException(422, "Unreadable DOCX document") from e

def save_databases():
    """Persist candidate and job state in one SQLite transaction; JSON files are seed data."""
    payload = json.dumps({"candidates": candidates_db, "jobs": jobs_db}, ensure_ascii=False)
    with _tfidf_lock, closing(sqlite3.connect(STATE_DB)) as conn, conn:
        conn.execute("CREATE TABLE IF NOT EXISTS application_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)")
        conn.execute("INSERT INTO application_state VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", (payload,))


def synchronized(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        with _tfidf_lock:
            return fn(*args, **kwargs)
    return wrapped


def rebuild_tfidf():
    """Thread-safe TF-IDF rebuild after adding new candidates."""
    global tfidf_matrix
    with _tfidf_lock:
        if candidates_db:
            all_resumes = [c.get("raw_text", "") for c in candidates_db]
            try:
                tfidf_matrix = vectorizer.fit_transform(all_resumes)
            except ValueError:
                tfidf_matrix = None
        else:
            tfidf_matrix = None

def score_education(candidate: dict) -> float:
    """Deterministic education score based on extracted degree text."""
    edu = candidate.get("education", [])
    if not edu:
        return 50.0
    text = " ".join(e.get("degree", "") for e in edu).lower()
    if any(k in text for k in ["phd", "doctorate", "ph.d"]):
        return 95.0
    if any(k in text for k in ["master", "m.tech", "msc", "m.sc", "mba", "m.e"]):
        return 85.0
    if any(k in text for k in ["bachelor", "b.tech", "b.e", "bsc", "b.sc", "b.com"]):
        return 75.0
    if any(k in text for k in ["diploma", "associate", "certificate"]):
        return 65.0
    return 60.0

def generate_ai_reasoning(candidate: dict, req_overlap: set, pref_overlap: set,
                           sim_score: float, skill_pct: float, exp_score: float) -> str:
    """Generate a meaningful reasoning string for the match result."""
    matched = sorted(req_overlap | pref_overlap)
    exp = candidate.get("experienceYears", 0)
    role = candidate.get("currentRole", "")
    parts = []
    if matched:
        top = matched[:3]
        parts.append(f"Matched skills: {', '.join(top)}.")
    if exp >= 7:
        parts.append(f"Senior-level candidate with {exp} years experience.")
    elif exp >= 3:
        parts.append(f"Mid-level profile ({exp} yrs exp).")
    elif exp > 0:
        parts.append(f"Early-career candidate ({exp} yrs exp).")
    if sim_score > 60:
        parts.append("High vocabulary overlap with the job description.")
    elif sim_score < 20:
        parts.append("Low vocabulary overlap with the job description.")
    if skill_pct >= 70:
        parts.append("Excellent required-skill coverage.")
    elif skill_pct < 30:
        parts.append("Missing several required skills.")
    if role and role not in ("Professional", "Unknown"):
        parts.append(f"Current role: {role}.")
    return " ".join(parts) if parts else "Candidate has general relevant experience."

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {
        "status": "ok" if DATA_LOADED else "degraded",
        "data_loaded": DATA_LOADED,
        "candidates": len(candidates_db),
        "jobs": len(jobs_db),
        "tfidf_ready": tfidf_matrix is not None,
        "version": "3.3.0",
        "ollama_model": OLLAMA_MODEL,
        "ollama_available": _is_ollama_available(),
    }

@app.get("/api/overview")
@synchronized
def overview():
    """High-level KPI summary for the SaaS Dashboard."""
    if not DATA_LOADED:
        raise HTTPException(503, "Data not loaded")

    status_counts = {}
    for c in candidates_db:
        s = c.get("status", "Unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    category_counts = {}
    for c in candidates_db:
        cat = c.get("category", "Unknown")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Top roles & companies (from experience history)
    role_counts = {}
    company_counts = {}
    for c in candidates_db:
        role = c.get("currentRole", "")
        if role and role != "Unknown":
            role_counts[role] = role_counts.get(role, 0) + 1
        company = c.get("company", "")
        if company and company not in ("Unknown", "Tech Corp"):
            company_counts[company] = company_counts.get(company, 0) + 1

    top_roles = dict(sorted(role_counts.items(), key=lambda x: x[1], reverse=True)[:10])
    top_companies = dict(sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:10])

    shortlisted = (
        status_counts.get("Shortlisted", 0)
        + status_counts.get("Interview", 0)
        + status_counts.get("Offer", 0)
    )
    active_jobs = sum(1 for j in jobs_db if j.get("status") == "Active")

    # Skills frequency
    skill_counts = {}
    for c in candidates_db:
        for sk in c.get("skills", []):
            skill_counts[sk] = skill_counts.get(sk, 0) + 1
    top_skills = dict(sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:20])

    return {
        "total_candidates": len(candidates_db),
        "total_jobs": len(jobs_db),
        "active_jobs": active_jobs,
        "shortlisted": shortlisted,
        "status_breakdown": status_counts,
        "category_breakdown": category_counts,
        "category_counts": category_counts,
        "resume_length_distribution": [{"range": f"{lo}-{lo+1999}", "count": sum(lo <= len(c.get("raw_text", "")) < lo+2000 for c in candidates_db)} for lo in range(0, max([len(c.get("raw_text", "")) for c in candidates_db] or [0])+1, 2000)],
        "top_roles": top_roles,
        "top_companies": top_companies,
        "top_skills": top_skills,
    }

@app.get("/api/jobs")
@synchronized
def get_jobs():
    return [{k: v for k, v in j.items() if k != "raw_text"} for j in jobs_db]

@app.get("/api/jobs/{job_id}")
@synchronized
def get_job(job_id: str):
    job = next((j for j in jobs_db if j["id"] == job_id), None)
    if not job:
        raise HTTPException(404, "Job not found")
    return {k: v for k, v in job.items() if k != "raw_text"}

@app.post("/api/jobs")
@synchronized
def create_job(req: CreateJobRequest):
    """Create a new job posting with a collision-safe UUID-based ID."""
    new_id = f"JOB-CUSTOM-{uuid.uuid4().hex[:8]}"
    new_job = {
        "id": new_id,
        "title": req.title,
        "department": req.department,
        "location": req.location,
        "type": req.type,
        "experienceRequired": req.experienceRequired,
        "activeCandidates": 0,
        "status": "Active",
        "postedDate": date.today().isoformat(),
        "requiredSkills": req.requiredSkills,
        "preferredSkills": req.preferredSkills,
        "description": req.description,
        "raw_text": req.description,
    }
    jobs_db.append(new_job)
    try:
        save_databases()
    except Exception:
        jobs_db.pop()
        raise
    return {k: v for k, v in new_job.items() if k != "raw_text"}

@app.get("/api/candidates")
@synchronized
def get_candidates(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    source: Literal["all", "uploaded"] = "all",
):
    """Return paginated candidates list with case-insensitive filtering."""
    if not DATA_LOADED:
        raise HTTPException(503, "Data not loaded")

    filtered = candidates_db
    if source == "uploaded":
        filtered = list(reversed([c for c in filtered if c.get("filename") or c["id"].startswith("UPLOAD-")]))

    if status:
        filtered = [c for c in filtered if c.get("status", "").lower() == status.lower()]
    if category:
        filtered = [c for c in filtered if c.get("category", "").lower() == category.lower()]
    if search:
        sl = search.lower()
        filtered = [
            c for c in filtered
            if sl in c.get("name", "").lower()
            or sl in c.get("currentRole", "").lower()
            or sl in " ".join(c.get("skills", [])).lower()
            or sl in c.get("category", "").lower()
        ]

    start = (page - 1) * limit
    end = start + limit
    results = [{k: v for k, v in c.items() if k != "raw_text"} for c in filtered[start:end]]

    return {
        "total": len(filtered),
        "page": page,
        "limit": limit,
        "candidates": results,
    }

@app.get("/api/candidates/stats")
@synchronized
def get_candidate_stats():
    """Aggregate stats for the candidates list filters."""
    if not DATA_LOADED:
        raise HTTPException(503, "Data not loaded")
    status_counts = {}
    for c in candidates_db:
        s = c.get("status", "Unknown")
        status_counts[s] = status_counts.get(s, 0) + 1
    return {"status_counts": status_counts, "total": len(candidates_db)}

@app.get("/api/candidates/{cand_id}")
@synchronized
def get_candidate(cand_id: str):
    cand = next((c for c in candidates_db if c["id"] == cand_id), None)
    if not cand:
        raise HTTPException(404, "Candidate not found")
    return {k: v for k, v in cand.items() if k != "raw_text"}

@app.patch("/api/candidates/{cand_id}/status")
@synchronized
def update_candidate_status(cand_id: str, status: str = Query(...)):
    """Update candidate pipeline status."""
    cand = next((c for c in candidates_db if c["id"] == cand_id), None)
    if not cand:
        raise HTTPException(404, "Candidate not found")

    valid_statuses = ["New", "Screening", "Reviewed", "Shortlisted", "Interview", "Offer", "Hired", "Rejected"]
    normalised = next((s for s in valid_statuses if s.lower() == status.lower()), None)
    if not normalised:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")

    previous = cand["status"]
    cand["status"] = normalised
    try:
        save_databases()
    except Exception:
        cand["status"] = previous
        raise
    return {"id": cand_id, "status": normalised, "message": "Status updated"}

@app.post("/api/candidates/{cand_id}/reparse")
def reparse_candidate(cand_id: str):
    with _tfidf_lock:
        candidate = next((c for c in candidates_db if c["id"] == cand_id), None)
        if candidate is None:
            raise HTTPException(404, "Candidate not found")
        text = candidate.get("raw_text", "")
        category = candidate.get("category", "Unknown")
    if not text.strip():
        raise HTTPException(422, "No source resume text is available")
    parsed = process_resume(text, category, cand_id)
    if parsed.get("parsed_by") != "ollama":
        raise HTTPException(503, "Qwen extraction failed. Existing profile was preserved; retry when Ollama is ready.")
    with _tfidf_lock:
        if candidate.get("raw_text") != text:
            raise HTTPException(409, "Resume changed during extraction; retry")
        previous = candidate.copy()
        preserved = {key: candidate[key] for key in ("id", "status", "appliedDate", "category", "filename") if key in candidate}
        candidate.update(parsed)
        candidate.update(preserved)
        try:
            save_databases()
        except Exception:
            candidate.clear()
            candidate.update(previous)
            raise
    return {key: value for key, value in candidate.items() if key != "raw_text"}

@app.post("/api/upload")
def upload_resume(file: UploadFile = File(...)):
    """
    Upload a PDF/DOCX/TXT resume, extract structured data using Ollama NLP,
    add it to the candidates database and return the complete parsed profile.
    """
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    file_bytes = file.file.read(5 * 1024 * 1024 + 1)

    # File size guard (5 MB max)
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(413, "File too large. Maximum size is 5 MB.")

    # Extract text based on file type
    if ext == "pdf":
        text = extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        text = extract_text_from_docx(file_bytes)
    elif ext == "txt":
        text = file_bytes.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(400, f"Unsupported file type: .{ext}. Please upload PDF, DOCX, or TXT.")

    if not text or len(text) < 50:
        raise HTTPException(422, "Could not extract enough text. Please check the file is readable.")

    # Use Ollama NLP engine to extract structured candidate data
    candidate = process_resume(text, "Uploaded", 0)
    candidate["id"] = f"UPLOAD-{uuid.uuid4().hex[:8]}"   # Collision-safe UUID
    candidate["status"] = "New"
    candidate["appliedDate"] = date.today().isoformat()
    candidate["filename"] = filename
    candidate["category"] = "Uploaded"

    # Infer category from skills
    skill_lower = [s.lower() for s in candidate.get("skills", [])]
    if any(k in skill_lower for k in ["machine learning", "deep learning", "tensorflow", "pytorch", "nlp"]):
        candidate["category"] = "Data Science"
    elif any(k in skill_lower for k in ["react", "vue", "angular", "frontend", "html", "css"]):
        candidate["category"] = "Frontend"
    elif any(k in skill_lower for k in ["django", "fastapi", "flask", "spring boot", "node.js"]):
        candidate["category"] = "Backend"
    elif any(k in skill_lower for k in ["docker", "kubernetes", "aws", "azure", "terraform", "devops"]):
        candidate["category"] = "DevOps"
    elif any(k in skill_lower for k in ["data analyst", "tableau", "power bi", "sql", "spark"]):
        candidate["category"] = "Data Analysis"

    with _tfidf_lock:
        candidates_db.append(candidate)
        try:
            rebuild_tfidf()
            save_databases()
        except Exception:
            candidates_db.pop()
            rebuild_tfidf()
            raise

    candidate_out = {k: v for k, v in candidate.items() if k != "raw_text"}

    return {
        "message": "Resume uploaded and parsed successfully",
        "candidate": candidate_out,
        "text_length": len(text),
        "parsed_by": candidate.get("parsed_by", "regex_fallback"),
    }

@app.post("/api/match")
@synchronized
def match_candidates(req: MatchRequest):
    """AI matching: TF-IDF cosine similarity + skill overlap + deterministic education scoring."""
    if not DATA_LOADED:
        raise HTTPException(503, "Data not loaded")
    if tfidf_matrix is None:
        raise HTTPException(503, "Vector model not ready – please wait for backend to initialize or upload resumes first")

    job = next((j for j in jobs_db if j["id"] == req.job_id), None)
    if not job:
        raise HTTPException(404, f"Job '{req.job_id}' not found")

    job_text = job.get("raw_text", job.get("description", ""))
    if not job_text:
        raise HTTPException(422, "Job has no description text to match against")

    indices = [idx for idx, candidate in enumerate(candidates_db)
               if (req.candidate_id is None or candidate["id"] == req.candidate_id)
               and (req.source == "all" or candidate.get("filename") or candidate["id"].startswith("UPLOAD-"))]
    if not indices:
        if req.candidate_id:
            raise HTTPException(404, "Selected resume was not found in this candidate pool")
        return []
    with _tfidf_lock:
        job_vector = vectorizer.transform([job_text])
        similarity_scores = cosine_similarity(job_vector, tfidf_matrix[indices])[0]

    required_skills_lower = sorted({s.strip().lower() for s in job.get("requiredSkills", []) if s.strip()})
    preferred_skills_lower = sorted({s.strip().lower() for s in job.get("preferredSkills", []) if s.strip()})

    results = []
    for score_idx, candidate_idx in enumerate(indices):
        c = candidates_db[candidate_idx]
        sim_score = float(similarity_scores[score_idx]) * 100
        cand_skills_lower = [s.lower() for s in c.get("skills", [])]

        req_overlap = set(cand_skills_lower) & set(required_skills_lower)
        pref_overlap = set(cand_skills_lower) & set(preferred_skills_lower)

        required_ratio = len(req_overlap) / len(required_skills_lower) if required_skills_lower else None
        preferred_ratio = len(pref_overlap) / len(preferred_skills_lower) if preferred_skills_lower else None
        if required_ratio is not None and preferred_ratio is not None:
            skill_match_pct = 80 * required_ratio + 20 * preferred_ratio
        else:
            skill_match_pct = 100 * (required_ratio if required_ratio is not None else preferred_ratio if preferred_ratio is not None else 0.5)
        exp_years = max(0, c.get("experienceYears", 0) or 0)
        requirement = re.search(r"\d+", job.get("experienceRequired", ""))
        target_years = max(1, int(requirement.group())) if requirement else 1
        exp_score = min(100.0, exp_years / target_years * 100)

        # Deterministic education score (no random)
        edu_score = score_education(c)

        # Weighted final score: 55% semantic, 25% skills, 10% experience, 10% education
        final = (0.55 * sim_score) + (0.25 * skill_match_pct) + (0.10 * exp_score) + (0.10 * edu_score)

        reasoning = generate_ai_reasoning(c, req_overlap, pref_overlap, sim_score, skill_match_pct, exp_score)

        results.append({
            "candidate": {k: v for k, v in c.items() if k != "raw_text"},
            "overallMatch": math.floor(min(final, 99.9) * 10 + 0.5 + 1e-9) / 10,
            "breakdown": {
                "semantic":    round(sim_score, 1),
                "skills":      round(skill_match_pct, 1),
                "experience":  round(exp_score, 1),
                "education":   round(edu_score, 1),
            },
            "aiReasoning": reasoning,
            "matchedSkills": sorted(req_overlap | pref_overlap),
            "missingSkills": sorted(set(required_skills_lower) - set(cand_skills_lower)),
        })

    results.sort(key=lambda x: x["overallMatch"], reverse=True)
    return results[: req.top_n]


@app.get("/api/candidates/{cand_id}/matches")
@synchronized
def match_resume_to_jobs(cand_id: str, top_n: int = Query(50, ge=1, le=100)):
    if not any(candidate["id"] == cand_id for candidate in candidates_db):
        raise HTTPException(404, "Resume not found")
    matches = []
    for job in jobs_db:
        if job.get("status") != "Active":
            continue
        result = match_candidates(MatchRequest(job_id=job["id"], candidate_id=cand_id, top_n=1))[0]
        matches.append({"job": {key: value for key, value in job.items() if key != "raw_text"},
                        **{key: value for key, value in result.items() if key != "candidate"}})
    matches.sort(key=lambda result: result["overallMatch"], reverse=True)
    return matches[:top_n]
