import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadResume } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, X, CheckCircle2, AlertCircle,
  BrainCircuit, Mail, Phone, MapPin, GraduationCap, Zap, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";

type UploadStatus = "pending" | "uploading" | "done" | "error";
type UploadedFile = {
  file: File;
  status: UploadStatus;
  result?: any;
  error?: string;
};

export default function AIScreening() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      const newEntries: UploadedFile[] = arr.map((f) => ({
        file: f,
        status: "pending" as UploadStatus,
      }));
      setUploadedFiles((prev) => [...prev, ...newEntries]);

      for (const file of arr) {
        setUploadedFiles((prev) =>
          prev.map((e) =>
            e.file === file ? { ...e, status: "uploading" as UploadStatus } : e
          )
        );
        try {
          const result = await uploadResume(file);
          setUploadedFiles((prev) =>
            prev.map((e) =>
              e.file === file
                ? { ...e, status: "done" as UploadStatus, result }
                : e
            )
          );
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-stats"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
          queryClient.invalidateQueries({ queryKey: ["overview"] });
        } catch (err: any) {
          const msg =
            err?.response?.data?.detail || err.message || "Upload failed";
          setUploadedFiles((prev) =>
            prev.map((e) =>
              e.file === file
                ? { ...e, status: "error" as UploadStatus, error: msg }
                : e
            )
          );
        }
      }
    },
    [queryClient]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (file: File) =>
    setUploadedFiles((prev) => prev.filter((e) => e.file !== file));
  const clearDone = () =>
    setUploadedFiles((prev) => prev.filter((e) => e.status !== "done"));

  const successCount = uploadedFiles.filter((e) => e.status === "done").length;
  const errorCount = uploadedFiles.filter((e) => e.status === "error").length;
  const processingCount = uploadedFiles.filter((e) => e.status === "uploading").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Screening</h2>
          <p className="text-muted-foreground mt-1">
            Upload PDF, DOCX, or TXT resumes and let the Ollama NLP engine extract structured profiles.
          </p>
        </div>
        <Link to="/ranking">
          <Button variant="outline" className="gap-2">
            <BrainCircuit className="h-4 w-4" />
            Go to AI Ranking
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drop Zone */}
        <div className="flex flex-col gap-3">
          <div
            role="button"
            tabIndex={0}
            aria-label="Choose resume files"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={[
              "rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-12 gap-4 transition-all cursor-pointer min-h-[280px]",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
            ].join(" ")}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className={[
                "h-16 w-16 rounded-2xl flex items-center justify-center transition-colors",
                isDragging
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              <Upload className="h-7 w-7" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Drop resumes here</p>
              <p className="text-muted-foreground text-sm mt-1">
                or{" "}
                <span className="text-primary underline underline-offset-2">
                  click to browse
                </span>
              </p>
              <div className="flex gap-2 justify-center mt-3">
                {["PDF", "DOCX", "TXT"].map((ext) => (
                  <span
                    key={ext}
                    className="bg-muted px-2 py-0.5 rounded font-mono text-xs"
                  >
                    {ext}
                  </span>
                ))}
                <span className="text-muted-foreground/60 text-xs self-center">
                  max 5 MB
                </span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* Ollama info banner */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
            <Zap className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" />
            <span>
              Powered by <strong>Qwen3 4B Instruct</strong> running locally.
              The first resume takes longer while the model loads.
              Extracted facts are checked against the resume. Missing information stays unknown.
            </span>
          </div>

          {/* Stats */}
          {uploadedFiles.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              {processingCount > 0 && (
                <span className="flex items-center gap-1.5 text-blue-600">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {processingCount} processing
                </span>
              )}
              {successCount > 0 && (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {successCount} done
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorCount} failed
                </span>
              )}
              {successCount > 0 && (
                <button
                  onClick={clearDone}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Clear done
                </button>
              )}
            </div>
          )}
        </div>

        {/* Upload Queue */}
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">
            Upload Queue
            {uploadedFiles.length > 0 && (
              <span className="ml-2 text-muted-foreground font-normal text-sm">
                ({uploadedFiles.length} files)
              </span>
            )}
          </h3>

          {uploadedFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[240px] bg-muted/20 rounded-xl border text-muted-foreground gap-2">
              <FileText className="h-10 w-10 opacity-20" />
              <p className="text-sm">No resumes uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {uploadedFiles.map((entry, i) => (
                <div
                  key={i}
                  className={[
                    "rounded-xl border overflow-hidden transition-colors",
                    entry.status === "done"
                      ? "border-emerald-200 dark:border-emerald-900"
                      : entry.status === "error"
                      ? "border-red-200 dark:border-red-900"
                      : entry.status === "uploading"
                      ? "border-blue-200 dark:border-blue-900"
                      : "border-muted",
                  ].join(" ")}
                >
                  {/* File header row */}
                  <div className="flex gap-3 p-3 bg-card items-center">
                    <div className="shrink-0">
                      {entry.status === "done" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : entry.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : entry.status === "uploading" ? (
                        <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {entry.file.name}
                        </p>
                        <button
                          onClick={() => removeFile(entry.file)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(entry.file.size / 1024).toFixed(1)} KB &middot;{" "}
                        {entry.status === "uploading"
                          ? "🧠 Parsing with Ollama AI..."
                          : entry.status === "done"
                          ? `✅ Parsed successfully${entry.result?.parsed_by === "regex_fallback" ? " (regex)" : " (Ollama)"}`
                          : entry.status === "error"
                          ? entry.error
                          : "⏳ Waiting..."}
                      </p>
                    </div>
                  </div>

                  {entry.status === "done" && entry.result?.candidate?.extraction_warnings?.map((warning: string) => <p key={warning} role="status" className="mx-3 mb-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-200">{warning}</p>)}
                  {/* Parsed result - full details */}
                  {entry.status === "done" && entry.result?.candidate && (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-t border-emerald-200 dark:border-emerald-900">
                      {/* Name + role + badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-bold text-emerald-800 dark:text-emerald-300">
                            {entry.result.candidate.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {entry.result.candidate.currentRole}
                            {entry.result.candidate.company &&
                            entry.result.candidate.company !== "Unknown"
                              ? ` @ ${entry.result.candidate.company}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {entry.result.candidate.experienceYears > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {entry.result.candidate.experienceYears} yrs
                            </Badge>
                          )}
                          {entry.result.candidate.category && (
                            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              {entry.result.candidate.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                        {entry.result.candidate.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 shrink-0" />
                            {entry.result.candidate.email}
                          </div>
                        )}
                        {entry.result.candidate.phone &&
                          entry.result.candidate.phone !== "N/A" && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 shrink-0" />
                              {entry.result.candidate.phone}
                            </div>
                          )}
                        {entry.result.candidate.location &&
                          entry.result.candidate.location !== "N/A" && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {entry.result.candidate.location}
                            </div>
                          )}
                      </div>

                      {/* Education */}
                      {entry.result.candidate.education?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" /> Education
                          </p>
                          {entry.result.candidate.education
                            .slice(0, 2)
                            .map((edu: any, ei: number) => (
                              <p key={ei} className="text-xs text-muted-foreground truncate">
                                {edu.degree}
                                {edu.university && edu.university !== "Unknown"
                                  ? ` · ${edu.university}`
                                  : ""}
                                {edu.year && edu.year !== "Unknown"
                                  ? ` (${edu.year})`
                                  : ""}
                              </p>
                            ))}
                        </div>
                      )}

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {entry.result.candidate.skills
                          ?.slice(0, 8)
                          .map((s: string) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px] px-1.5"
                            >
                              {s}
                            </Badge>
                          ))}
                        {entry.result.candidate.skills?.length > 8 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5"
                          >
                            +{entry.result.candidate.skills.length - 8} more
                          </Badge>
                        )}
                      </div>

                      <Button asChild className="mb-3 w-full" size="sm"><Link to={`/ranking?candidate=${encodeURIComponent(entry.result.candidate.id)}`}>See this resume’s job matches</Link></Button>
                      {/* View profile link */}
                      <Link
                        to={`/candidates/${entry.result.candidate.id}`}
                        className="text-xs text-primary underline underline-offset-2 hover:no-underline"
                      >
                        View Full Profile →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
