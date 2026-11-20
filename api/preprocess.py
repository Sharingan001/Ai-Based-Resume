import os
import json
import tempfile
import pandas as pd
from nlp_engine import process_resume

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESUME_CSV = os.path.join(BASE_DIR, "Resume.csv")
JOBS_CSV = os.path.join(BASE_DIR, "training_data.csv")
DB_JSON = os.path.join(BASE_DIR, "api", "database.json")
JOBS_DB_JSON = os.path.join(BASE_DIR, "api", "jobs_database.json")


def atomic_seed_write(path, data):
    payload = json.dumps(data, indent=2, ensure_ascii=False)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=BASE_DIR, delete=False) as output:
            temporary = output.name
            output.write(payload)
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def process_all_resumes():
    print("Loading Resume.csv...")
    try:
        df = pd.read_csv(RESUME_CSV)
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return

    print(f"Processing {len(df)} resumes. This may take a minute...")
    candidates = []

    for idx, row in df.iterrows():
        resume_text = str(row.get("Resume_str", ""))
        category = str(row.get("Category", "Unknown"))

        if not resume_text or resume_text == "nan":
            continue

        candidate = process_resume(resume_text, category, idx)
        # Preserve the category from the CSV as the applied date context
        from datetime import date
        candidate["appliedDate"] = date.today().isoformat()
        candidates.append(candidate)

        if idx > 0 and idx % 500 == 0:
            print(f"  Processed {idx} resumes...")

    atomic_seed_write(DB_JSON, candidates)

    print(f"Done. Saved {len(candidates)} candidates to database.json")


def process_all_jobs():
    print("Loading training_data.csv for Jobs...")
    try:
        df = pd.read_csv(JOBS_CSV)
    except Exception as e:
        print(f"Error loading Jobs CSV: {e}")
        return

    print(f"Processing jobs dataset ({len(df)} rows)...")
    jobs = []

    DEPT_MAP = {
        "Engineer": "Engineering", "Developer": "Engineering", "Scientist": "Data & AI",
        "Analyst": "Analytics", "Manager": "Management", "Designer": "Design",
        "Product": "Product", "Marketing": "Marketing", "Sales": "Sales",
        "HR": "HR", "Finance": "Finance", "Operations": "Operations",
    }

    unique_titles = df["position_title"].dropna().unique().tolist()

    for idx, title in enumerate(unique_titles[:50]):
        job_rows = df[df["position_title"] == title]
        if job_rows.empty:
            continue

        desc = str(job_rows.iloc[0]["job_description"])

        # Infer department from title
        dept = "General"
        for kw, d in DEPT_MAP.items():
            if kw.lower() in title.lower():
                dept = d
                break

        # Extract skills from job description
        from nlp_engine import extract_skills
        skills = extract_skills(desc)
        required_skills = skills[:5] if skills else ["Communication", "Problem Solving"]
        preferred_skills = skills[5:10] if len(skills) > 5 else ["Agile"]

        from datetime import date
        jobs.append({
            "id": f"JOB-{idx}",
            "title": title,
            "department": dept,
            "location": "Remote",
            "type": "Full-time",
            "experienceRequired": "3+ years",
            "activeCandidates": 0,
            "status": "Active",
            "postedDate": date.today().isoformat(),
            "requiredSkills": required_skills,
            "preferredSkills": preferred_skills,
            "description": desc[:2000],  # truncate very long descriptions
            "raw_text": desc,
        })

    atomic_seed_write(JOBS_DB_JSON, jobs)

    print(f"Done. Saved {len(jobs)} jobs to jobs_database.json")


if __name__ == "__main__":
    import argparse
    import shutil
    parser = argparse.ArgumentParser(description="Build seed databases. Existing files require --replace and are backed up.")
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--only", choices=["candidates", "jobs", "missing"], default="missing")
    args = parser.parse_args()
    targets = [(DB_JSON, process_all_resumes, "candidates"), (JOBS_DB_JSON, process_all_jobs, "jobs")]
    for path, build, name in targets:
        if args.only not in ("missing", name):
            continue
        if os.path.exists(path):
            if not args.replace:
                print(f"Keeping existing {path}; use --replace to regenerate.")
                continue
            shutil.copy2(path, path + ".bak")
        build()
