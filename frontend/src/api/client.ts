import axios from "axios";

const API_BASE_URL =
  localStorage.getItem("nexus-api-url") || (import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json", ...(import.meta.env.VITE_API_TOKEN ? { Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}` } : {}) },
  timeout: 30_000,
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.detail ?? err.message ?? "Unknown API error";
    console.error(`[API Error] ${err?.config?.url ?? ""}: ${msg}`);
    return Promise.reject(err);
  }
);

export interface Education {
  degree: string;
  university: string;
  year: string;
}

export interface Experience {
  role: string;
  company: string;
  duration: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  currentRole: string;
  company: string;
  experienceYears: number;
  status: string;
  appliedDate: string;
  category: string;
  skills: string[];
  education: Education[];
  experience: Experience[];
  filename?: string;
  parsed_by?: string;
  model?: string | null;
  partial_parse?: boolean;
  extraction_warnings?: string[];
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experienceRequired: string;
  activeCandidates: number;
  status: string;
  postedDate: string;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
}

export interface MatchResult {
  candidate: Candidate;
  overallMatch: number;
  breakdown: {
    semantic: number;
    skills: number;
    experience: number;
    education: number;
  };
  aiReasoning: string;
  matchedSkills?: string[];
  missingSkills?: string[];
}

export interface UploadResult {
  message: string;
  candidate: Candidate;
  text_length: number;
  parsed_by?: string;
}

export interface CreateJobPayload {
  title: string;
  department: string;
  location: string;
  type: string;
  experienceRequired: string;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
}

export const fetchHealth = async () => {
  const { data } = await apiClient.get("/health");
  return data;
};

export const fetchOverview = async () => {
  const { data } = await apiClient.get("/overview");
  return data;
};

export const fetchJobs = async (): Promise<Job[]> => {
  const { data } = await apiClient.get("/jobs");
  return data;
};

export const fetchJobById = async (id: string): Promise<Job> => {
  const { data } = await apiClient.get(`/jobs/${id}`);
  return data;
};

export const createJob = async (payload: CreateJobPayload): Promise<Job> => {
  const { data } = await apiClient.post("/jobs", payload);
  return data;
};

export const fetchCandidates = async (
  page = 1,
  limit = 15,
  status?: string,
  search?: string,
  category?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status) params.append("status", status);
  if (search) params.append("search", search);
  if (category) params.append("category", category);
  const { data } = await apiClient.get(`/candidates?${params.toString()}`);
  return data;
};

export const fetchCandidateStats = async () => {
  const { data } = await apiClient.get("/candidates/stats");
  return data;
};

export const fetchCandidateById = async (id: string): Promise<Candidate> => {
  const { data } = await apiClient.get(`/candidates/${id}`);
  return data;
};

export const updateCandidateStatus = async (id: string, status: string) => {
  const { data } = await apiClient.patch(
    `/candidates/${id}/status?status=${encodeURIComponent(status)}`
  );
  return data;
};

export const uploadResume = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data", ...(import.meta.env.VITE_API_TOKEN ? { Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}` } : {}) },
    timeout: 180_000, // Allow parsing plus persistence and indexing
  });
  return data;
};

export const fetchMatches = async (
  jobId: string,
  topN = 20,
  source: "all" | "uploaded" = "all"
): Promise<MatchResult[]> => {
  const { data } = await axios.post(
    `${API_BASE_URL}/match`,
    { job_id: jobId, top_n: topN, source },
    {
      headers: { "Content-Type": "application/json", ...(import.meta.env.VITE_API_TOKEN ? { Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}` } : {}) },
      timeout: 120_000, // 2 minutes for matching large candidate pools
    }
  );
  return data;
};

export const reparseCandidate = async (id: string): Promise<Candidate> => {
  const { data } = await apiClient.post(`/candidates/${encodeURIComponent(id)}/reparse`, {}, { timeout: 180_000 });
  return data;
};


export type ResumeMatchResult = Omit<MatchResult, "candidate"> & { job: Job };
export const fetchUploadedResumes = async (): Promise<Candidate[]> => {
  const candidates: Candidate[] = [];
  for (let page = 1; ; page++) {
    const { data } = await apiClient.get("/candidates", { params: { source: "uploaded", limit: 100, page } });
    candidates.push(...data.candidates);
    if (!data.candidates.length || candidates.length >= data.total) return candidates;
  }
};
export const fetchResumeMatches = async (id: string): Promise<ResumeMatchResult[]> => {
  const { data } = await apiClient.get(`/candidates/${encodeURIComponent(id)}/matches`, { params: { top_n: 100 }, timeout: 120_000 });
  return data;
};
