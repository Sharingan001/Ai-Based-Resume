"""Run: python -m unittest discover -s tests -v"""
import copy
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))
import main as api
import nlp_engine as nlp
from fastapi.testclient import TestClient


class RegressionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.state = patch.object(api, "STATE_DB", os.path.join(self.temp.name, "state.sqlite3"))
        self.state.start()
        self.original_candidates = copy.deepcopy(api.candidates_db)
        self.original_jobs = copy.deepcopy(api.jobs_db)
        self.candidates = [{
            "id": "CAND-fixture", "name": "Jane Example", "email": "jane@example.org",
            "phone": "N/A", "location": "Remote", "currentRole": "Software Engineer",
            "company": "Example", "experienceYears": 5, "status": "Reviewed",
            "appliedDate": "2026-01-01", "category": "Engineering", "skills": ["Python", "SQL"],
            "education": [{"degree": "Bachelor Computer Science", "university": "Example", "year": "2020"}],
            "experience": [], "raw_text": "Jane Example Software Engineer Python SQL database development five years experience",
        }]
        self.jobs = [{
            "id": f"JOB-fixture-{index}", "title": title, "department": "Engineering",
            "location": "Remote", "type": "Full-time", "experienceRequired": "3 years",
            "activeCandidates": 0, "status": "Active", "postedDate": "2026-01-01",
            "requiredSkills": ["Python"], "preferredSkills": ["SQL"],
            "description": text, "raw_text": text,
        } for index, (title, text) in enumerate([
            ("Python Engineer", "Python SQL database application development"),
            ("Frontend Engineer", "React JavaScript web frontend development"),
        ])]
        api.candidates_db[:] = copy.deepcopy(self.candidates)
        api.jobs_db[:] = copy.deepcopy(self.jobs)
        api.rebuild_tfidf()
        self.client = TestClient(api.app)

    def tearDown(self):
        api.candidates_db[:] = self.original_candidates
        api.jobs_db[:] = self.original_jobs
        api.rebuild_tfidf()
        self.state.stop()
        self.temp.cleanup()

    def test_fallback_skills_and_seniority(self):
        result = nlp._regex_parse("Jane Smith\nSenior Software Engineer\nC++ Python\n2018 - 2024")
        self.assertIn("C++", result["skills"])
        self.assertEqual(result["currentRole"], "Senior Software Engineer")
        self.assertEqual(result["experienceYears"], 6)
        self.assertIn("C++", nlp.extract_skills("C++"))

    def test_model_schema_falls_back(self):
        with patch.object(nlp, "_is_ollama_available", return_value=True), patch.object(nlp, "_ollama_chat", return_value='{"name":"Jane Smith","skills":"Python"}'):
            self.assertEqual(nlp.parse_resume_with_ollama("Jane Smith\nPython")["parsed_by"], "regex_fallback")

    def test_corrupt_docx_rejected(self):
        file = io.BytesIO()
        with zipfile.ZipFile(file, "w") as archive:
            archive.writestr("test.txt", "not a document")
        response = self.client.post("/api/upload", files={"file": ("bad.docx", file.getvalue())})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(api.candidates_db), len(self.candidates))

    def test_pdf_reader_and_corrupt_upload(self):
        import pypdf
        data = io.BytesIO()
        writer = pypdf.PdfWriter()
        writer.add_blank_page(width=612, height=792)
        writer.write(data)
        self.assertEqual(api.extract_text_from_pdf(data.getvalue()), "")
        self.assertEqual(self.client.post('/api/upload', files={"file":("broken.pdf", b"not a pdf")}).status_code, 422)

    def test_upload_reports_fallback_and_matches(self):
        with patch.object(nlp, "_is_ollama_available", return_value=False):
            response = self.client.post("/api/upload", files={"file": ("resume.txt", b"Jane Smith\nSenior Software Engineer\nPython C++ SQL and 5 years experience in application development.")})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["parsed_by"], "regex_fallback")
        response = self.client.post("/api/match", json={"job_id": api.jobs_db[0]["id"], "top_n": 3})
        self.assertEqual(response.status_code, 200, response.text)

    def test_transaction_failure_preserves_state(self):
        api.save_databases()
        previous = Path(api.STATE_DB).read_bytes()
        with patch.object(api.json, "dumps", side_effect=OSError("serialization failed")):
            with self.assertRaises(OSError):
                api.save_databases()
        self.assertEqual(Path(api.STATE_DB).read_bytes(), previous)

    def test_overview_contract(self):
        data = self.client.get("/api/overview").json()
        self.assertEqual(sum(data["category_counts"].values()), len(api.candidates_db))
        self.assertEqual(sum(r["count"] for r in data["resume_length_distribution"]), len(api.candidates_db))

    def test_shared_access_token(self):
        with patch.dict(os.environ, {"NEXUS_API_TOKEN": "test-secret"}):
            self.assertEqual(self.client.get("/api/jobs").status_code, 401)
            self.assertEqual(self.client.get("/api/jobs", headers={"Authorization": "Bearer test-secret"}).status_code, 200)

    def test_failed_status_save_rolls_back_memory(self):
        candidate = api.candidates_db[0]
        previous = candidate["status"]
        with patch.object(api, "save_databases", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                api.update_candidate_status(candidate["id"], "New")
        self.assertEqual(candidate["status"], previous)

    def test_reparse_preserves_workflow(self):
        previous = api.candidates_db[0].copy()
        parsed = previous | {"id": "wrong", "name": "Corrected Name", "status": "New", "appliedDate": "Unknown", "parsed_by": "ollama", "model": nlp.OLLAMA_MODEL}
        with patch.object(api, "process_resume", return_value=parsed):
            response = self.client.post(f'/api/candidates/{previous["id"]}/reparse')
        self.assertEqual(response.status_code, 200, response.text)
        for field in ["id", "status", "appliedDate", "category"]:
            self.assertEqual(response.json()[field], previous[field])
        self.assertEqual(response.json()["name"], "Corrected Name")

    def test_reparse_failure_preserves_profile(self):
        previous = api.candidates_db[0].copy()
        with patch.object(api, "process_resume", return_value={"parsed_by": "regex_fallback"}):
            response = self.client.post(f'/api/candidates/{previous["id"]}/reparse')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(api.candidates_db[0], previous)

    def test_uploaded_resume_not_hidden_by_seed_top_n(self):
        template = self.candidates[0]
        api.candidates_db[:] = [dict(template, id=f"SEED-{i}") for i in range(120)]
        api.candidates_db.append(dict(template, id="UPLOAD-test", filename="my-resume.txt"))
        api.rebuild_tfidf()
        job_id = api.jobs_db[0]["id"]
        all_results = self.client.post('/api/match', json={"job_id":job_id,"top_n":20}).json()
        self.assertNotIn("UPLOAD-test", [match["candidate"]["id"] for match in all_results])
        uploaded = self.client.post('/api/match', json={"job_id":job_id,"top_n":20,"source":"uploaded"})
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        self.assertEqual([match["candidate"]["id"] for match in uploaded.json()], ["UPLOAD-test"])
        listed = self.client.get('/api/candidates?source=uploaded').json()
        self.assertEqual(listed["total"], 1)

    def test_resume_job_matchups_and_unknown_resume(self):
        candidate_id = api.candidates_db[-1]["id"]
        response = self.client.get(f'/api/candidates/{candidate_id}/matches?top_n=100')
        self.assertEqual(response.status_code, 200, response.text)
        matches = response.json()
        self.assertEqual(len(matches), sum(job["status"] == "Active" for job in api.jobs_db))
        self.assertEqual([match["overallMatch"] for match in matches], sorted([match["overallMatch"] for match in matches], reverse=True))
        self.assertIn("missingSkills", matches[0])
        first = self.client.post('/api/match', json={"job_id":matches[0]["job"]["id"], "candidate_id":candidate_id}).json()
        self.assertEqual(first[0]["overallMatch"], matches[0]["overallMatch"])
        self.assertEqual(self.client.get('/api/candidates/missing-resume/matches').status_code, 404)


if __name__ == "__main__":
    unittest.main()
