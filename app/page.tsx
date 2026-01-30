"use client";

import { useState, useRef, useEffect } from "react";

type Language = "es" | "en" | "fr";
type ContentType = "reflection" | "summary" | "story" | "explanation";
type AppState = "form" | "generating" | "done" | "error";

const contentTypes: { value: ContentType; label: string; icon: string }[] = [
  { value: "reflection", label: "Reflection", icon: "psychology" },
  { value: "summary", label: "Summary", icon: "summarize" },
  { value: "story", label: "Story", icon: "auto_stories" },
  { value: "explanation", label: "Explanation", icon: "school" },
];

type JobLog = {
  step: string;
  percent: number;
  message: string;
  ts: string;
  done?: boolean;
  status?: string;
};

const defaultForm = {
  topic: "",
  durationMinutes: 1,
  language: "es" as Language,
  contentType: "reflection" as ContentType,
  tone: "informative",
  targetAudience: "general",
  format: "solo-host",
};

export default function Home() {
  const [form, setForm] = useState(defaultForm);
  const [appState, setAppState] = useState<AppState>("form");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState("Preparing...");
  const [error, setError] = useState<string | null>(null);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioUrl = jobId && appState === "done" ? `/api/jobs/${jobId}/audio` : undefined;

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    if (!form.topic.trim()) return;
    setAppState("generating");
    setProgress(0);
    setStepMessage("Creating job...");
    setError(null);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to create job");
      }
      const { jobId: newJobId } = (await response.json()) as { jobId: string };
      setJobId(newJobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setAppState("error");
    }
  };

  // SSE for job progress
  useEffect(() => {
    if (!jobId || appState !== "generating") return;

    const eventSource = new EventSource(`/api/jobs/${jobId}/events`);

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as JobLog;
      setProgress(payload.percent);
      setStepMessage(payload.message || payload.step);

      if (payload.status === "DONE") {
        setAppState("done");
        eventSource.close();
      } else if (payload.status === "ERROR") {
        setError(payload.message || "Job failed");
        setAppState("error");
        eventSource.close();
      }

      if (payload.done) eventSource.close();
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [jobId, appState]);

  // Audio handlers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const reset = () => {
    setAppState("form");
    setJobId(null);
    setProgress(0);
    setStepMessage("Preparing...");
    setError(null);
    setForm(defaultForm);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  return (
    <div className="bg-[#fbb751] dark:bg-[#231b0f] h-screen flex flex-col items-center overflow-hidden p-4 font-display">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={handleTimeUpdate}
        />
      )}

      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center py-2">
        {appState !== "form" ? (
          <button
            onClick={reset}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-sm active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
        ) : (
          <div className="w-10" />
        )}

        <div className="flex flex-col items-center">
          <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
            {appState === "form" ? "AI Voice Creator" : appState === "generating" ? "Creating..." : appState === "done" ? "Now Playing" : "Error"}
          </span>
        </div>

        <a
          href="https://github.com/marcosAlvarezCalabria?tab=repositories"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-sm active:scale-95 transition-transform"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        </a>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-md flex-1 flex flex-col items-center justify-center">

        {/* === FORM STATE === */}
        {appState === "form" && (
          <>
            <div className="clay-card w-full p-5 flex flex-col items-center gap-4 border-b-8 border-black/5">
              {/* AI Voice Icon */}
              <div className="relative w-28 h-28 flex items-center justify-center bg-gradient-to-br from-white to-gray-50 rounded-full shadow-lg border border-gray-100">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#fbb751] to-[#f59e0b] flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                    graphic_eq
                  </span>
                </div>
              </div>

              {/* Input */}
              <div className="w-full">
                <div className="relative flex items-center">
                  <input
                    className="clay-input w-full h-12 px-4 pr-12 border-none rounded-full text-gray-700 placeholder:text-gray-400 text-sm focus:ring-4 focus:ring-[#fbb751]/20 transition-all font-medium outline-none"
                    placeholder="What should I create content about?"
                    type="text"
                    value={form.topic}
                    onChange={(e) => updateField("topic", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
                  />
                  <button
                    onClick={onSubmit}
                    disabled={!form.topic}
                    className="absolute right-1.5 h-9 w-9 flex items-center justify-center bg-[#fbb751] rounded-full text-white shadow-md active:scale-90 transition-transform cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Type Selection */}
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {contentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => updateField("contentType", type.value)}
                  className={`flex h-10 items-center gap-1.5 rounded-full px-3 shadow-lg active:scale-95 transition-transform border-b-4 ${
                    form.contentType === type.value
                      ? "bg-white/90 border-black/5"
                      : "bg-white/40 border-white/30"
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg ${form.contentType === type.value ? "text-[#fbb751]" : "text-white"}`}>
                    {type.icon}
                  </span>
                  <span className={`text-sm font-bold ${form.contentType === type.value ? "text-gray-800" : "text-white"}`}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Language Selection */}
            <div className="flex gap-2 mt-2 flex-wrap justify-center">
              {(["en", "es", "fr"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => updateField("language", lang)}
                  className={`flex h-8 items-center gap-2 rounded-full px-3 shadow-md active:scale-95 transition-transform border-b-2 ${
                    form.language === lang
                      ? "bg-white/90 border-black/5"
                      : "bg-white/30 border-white/20"
                  }`}
                >
                  <span className={`text-xs font-bold ${form.language === lang ? "text-gray-800" : "text-white"}`}>
                    {lang === "en" ? "EN" : lang === "es" ? "ES" : "FR"}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* === GENERATING STATE === */}
        {appState === "generating" && (
          <div className="flex flex-col items-center gap-6">
            {/* Animated Circle */}
            <div className="relative w-40 h-40 rounded-full bg-white p-2 clay-card flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-orange-50 flex items-center justify-center relative overflow-hidden">
                <div className="radio-wave" style={{ animationDelay: "0s" }}></div>
                <div className="radio-wave" style={{ animationDelay: "0.6s" }}></div>
                <div className="radio-wave" style={{ animationDelay: "1.2s" }}></div>

                <div className="z-30 relative bg-white/50 backdrop-blur-sm p-3 rounded-full">
                  <span className="material-symbols-outlined text-3xl text-[#FFB74D] animate-pulse">
                    auto_awesome
                  </span>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="text-center">
              <p className="text-white text-3xl font-bold">{progress}%</p>
              <p className="text-white/80 text-sm mt-1">{stepMessage}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* === DONE STATE === */}
        {appState === "done" && (
          <div className="w-full flex flex-col items-center gap-4">
            {/* Waveform Visualizer */}
            <div className="w-full flex items-center justify-center gap-1.5 h-16">
              {isPlaying ? (
                [...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 bg-white rounded-full wave-bar"
                    style={{ height: `${20 + (i % 2) * 20}%`, animationDelay: `${i * 0.1}s` }}
                  />
                ))
              ) : (
                <div className="flex gap-1.5 items-center opacity-50">
                  {[6, 10, 5, 8, 12, 6].map((h, i) => (
                    <div key={i} className="w-2.5 bg-white rounded-full" style={{ height: `${h * 4}px` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Controls Card */}
            <div className="w-full bg-white rounded-3xl p-5 clay-card flex flex-col gap-4">
              {/* Time & Progress */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between px-1">
                  <span className="text-[#FFB74D] font-bold text-xs">{formatTime(currentTime)}</span>
                  <span className="text-gray-400 font-bold text-xs">{formatTime(duration)}</span>
                </div>
                <div className="h-2 w-full bg-orange-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FFB74D] rounded-full transition-all"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Play Controls */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }}
                  className="text-[#FFB74D] hover:scale-110 transition-transform"
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>replay_10</span>
                </button>

                <button
                  onClick={togglePlay}
                  className="flex size-14 items-center justify-center rounded-full bg-[#FFB74D] text-white shadow-lg active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>

                <button
                  onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10; }}
                  className="text-[#FFB74D] hover:scale-110 transition-transform"
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>forward_10</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === ERROR STATE === */}
        {appState === "error" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-red-500">error</span>
            </div>
            <p className="text-white font-bold">{error || "Something went wrong"}</p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-white rounded-full text-[#fbb751] font-bold shadow-lg active:scale-95 transition-transform"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
