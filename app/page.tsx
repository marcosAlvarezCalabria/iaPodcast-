"use client";

import { useState, useRef, useEffect, useCallback, MouseEvent } from "react";

type Language = "es" | "en" | "fr";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
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
  voice: "",
};

const VOICES = [
  // Spanish (Spain)
  { id: "es-ES-Neural2-B", label: "Mateo", lang: "es", gender: "Male", desc: "Narrativo" },
  { id: "es-ES-Neural2-A", label: "Lucia", lang: "es", gender: "Female", desc: "Suave" },
  // Spanish (LatAm)
  { id: "es-US-Neural2-B", label: "Diego", lang: "es", gender: "Male", desc: "Profundo" },
  { id: "es-US-Neural2-A", label: "Mia", lang: "es", gender: "Female", desc: "Vibrante" },
  // English
  { id: "en-US-Neural2-D", label: "James", lang: "en", gender: "Male", desc: "Radio Host" },
  { id: "en-US-Neural2-C", label: "Emma", lang: "en", gender: "Female", desc: "Professional" },
  // French
  { id: "fr-FR-Neural2-B", label: "Claude", lang: "fr", gender: "Male", desc: "Élégant" },
  { id: "fr-FR-Neural2-A", label: "Marie", lang: "fr", gender: "Female", desc: "Douce" },
];

export default function Home() {
  const [form, setForm] = useState(defaultForm);
  const [appState, setAppState] = useState<AppState>("form");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState("Preparing...");
  const [error, setError] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);

  // Analytics Helper
  // Define a type for the window object with gtag
  const sendEvent = (action: string, params?: Record<string, unknown>) => {
    if (typeof window !== "undefined" && (window as unknown as { gtag: (cmd: string, action: string, params?: Record<string, unknown>) => void }).gtag) {
      (window as unknown as { gtag: (cmd: string, action: string, params?: Record<string, unknown>) => void }).gtag("event", action, params);
    }
  };

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Speech recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // EventSource ref for SSE connection
  const eventSourceRef = useRef<EventSource | null>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Language mapping for speech recognition
  const getSpeechLang = useCallback((lang: Language): string => {
    const langMap: Record<Language, string> = {
      es: "es-ES",
      en: "en-US",
      fr: "fr-FR",
    };
    return langMap[lang];
  }, []);

  // Start/stop speech recognition
  const toggleListening = useCallback(() => {
    if (!speechSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getSpeechLang(form.language);

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setForm((prev) => ({
          ...prev,
          topic: prev.topic + (prev.topic ? " " : "") + finalTranscript,
        }));
      }
    };

    recognition.onerror = (event) => {
      // Ignore non-critical errors
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechSupported, isListening, form.language, getSpeechLang]);

  const audioUrl = jobId && appState === "done" ? `/api/jobs/${jobId}/audio` : undefined;

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    if (!form.topic.trim()) return;

    // Cancel any existing job/connection before starting a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Reset state for new job
    setAppState("generating");
    setProgress(0);
    setStepMessage("Creating job...");
    setError(null);
    setJobId(null);
    setJobTitle(null);
    sendEvent("generate_podcast", { topic: form.topic, content_type: form.contentType });

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const errorMsg = payload.error ?? payload.details ?? "Failed to create job";
        throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      }
      const { jobId: newJobId } = (await response.json()) as { jobId: string };
      setJobId(newJobId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      console.error("Job creation failed:", errorMessage);
      setError(errorMessage);
      setAppState("error");
    }
  };

  // SSE for job progress
  useEffect(() => {
    if (!jobId || appState !== "generating") return;

    // Close any existing connection before creating a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/jobs/${jobId}/events`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as JobLog;
        setProgress(payload.percent);
        setStepMessage(payload.message || payload.step);

        if (payload.status === "DONE") {
          setAppState("done");
          // Fetch the full job to get the title
          fetch(`/api/jobs/${jobId}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.title) {
                setJobTitle(data.title);
              }
            })
            .catch((err) => console.error("Failed to fetch job details", err));

          eventSource.close();
          eventSourceRef.current = null;
        } else if (payload.status === "ERROR") {
          setError(payload.message || "Job failed");
          setAppState("error");
          eventSource.close();
          eventSourceRef.current = null;
        }

        if (payload.done) {
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (parseError) {
        console.error("Failed to parse SSE message:", parseError);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      // Only set error if we're still in generating state
      if (appState === "generating") {
        setError("Connection lost. Please try again.");
        setAppState("error");
      }
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [jobId, appState]);

  // Audio handlers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      sendEvent("play_audio", { title: jobTitle || form.topic });
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

  const handleDownload = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!audioUrl) return;
    sendEvent("download_audio", { title: jobTitle || form.topic });
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      const safeTitle = (jobTitle || form.topic || "podcast").replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${safeTitle}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#fbb751] to-[#f59e0b] overflow-hidden font-display">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={handleTimeUpdate}
        />
      )}

      {/* Main Container (iOS Safe Area handling) - Centered on desktop */}
      <div className="relative h-full w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto flex flex-col px-6 pt-6 pb-4">

        {/* App Bar Area */}
        <div className="flex items-center justify-between mb-4">
          {appState !== "form" ? (
            <button
              onClick={reset}
              className="bg-white/20 p-2 rounded-full backdrop-blur-md cursor-pointer active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-white text-xl">arrow_back</span>
            </button>
          ) : (
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-md opacity-0">
              <span className="material-symbols-outlined text-white text-xl">arrow_back</span>
            </div>
          )}

          <div className="flex flex-col items-center">
            <h2 className="text-white text-base font-bold tracking-tight leading-none">AI Voice Creator</h2>
            <span className="text-white/60 text-[10px] font-medium tracking-wide uppercase mt-0.5">Open Source Project</span>
          </div>

          <a
            href="https://github.com/marcosAlvarezCalabria/iaPodcast-"
            target="_blank"
            rel="noreferrer"
            className="bg-white/20 p-2 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors"
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
          </a>
        </div>

        {/* Clay-morphism Main Card - Scrollable content */}
        <div className="clay-card flex-1 flex flex-col rounded-2xl p-4 overflow-hidden relative">

          {appState === "form" && (
            <>
              {/* Scrollable Form Area */}
              <div className="flex-1 overflow-y-auto no-scrollbar -mx-2 px-2 pb-2 md:flex md:flex-col md:justify-evenly">
                {/* Headline */}
                <div className="mb-6 md:mb-4 text-center flex items-center justify-center gap-4 md:gap-3">
                  <img
                    src="/logo.png"
                    alt="App Logo"
                    className="w-14 h-14 md:w-12 md:h-12 rounded-xl shadow-md shadow-amber-500/20"
                  />
                  <div className="text-left">
                    <h1 className="text-[#4a3a2a] text-2xl md:text-xl font-bold leading-none">Create Your Podcast</h1>
                    <p className="text-[#7a6a5a] text-sm md:text-xs font-medium leading-none mt-1">Transform your ideas into audio</p>
                  </div>
                </div>

                {/* Topic Input Section */}
                <div className="mb-5 md:mb-3">
                  <label className="block text-[#4a3a2a] text-xs md:text-[10px] font-bold uppercase tracking-wider mb-2 md:mb-1 ml-1">The Topic</label>
                  <div className="glass-input rounded-xl md:rounded-lg p-4 md:p-3 relative">
                    <textarea
                      className="w-full bg-transparent border-none focus:ring-0 text-[#4a3a2a] placeholder:text-[#a59585] resize-none h-20 md:h-14 p-0 pr-12 text-base md:text-sm font-normal leading-snug outline-none"
                      placeholder={isListening ? "Listening..." : "What should the AI talk about?"}
                      value={form.topic}
                      onChange={(e) => updateField("topic", e.target.value)}
                    ></textarea>
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`
                          absolute right-3 top-1/2 -translate-y-1/2 size-10 md:size-8 rounded-full flex items-center justify-center transition-all
                          ${isListening
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                          }
                        `}
                        title={isListening ? "Stop listening" : "Start voice input"}
                      >
                        <span className="material-symbols-outlined text-xl md:text-lg">
                          {isListening ? "stop" : "mic"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Type Grid */}
                <div className="mb-5 md:mb-3">
                  <label className="block text-[#4a3a2a] text-xs md:text-[10px] font-bold uppercase tracking-wider mb-2 md:mb-1 ml-1">Content Style</label>
                  <div className="grid grid-cols-4 gap-3 md:gap-2">
                    {contentTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateField("contentType", type.value)}
                        className={`
                                        rounded-xl md:rounded-lg p-2 md:p-1.5 flex flex-col items-center justify-center gap-1.5 md:gap-1 text-center transition-all cursor-pointer border-2 h-16 md:h-12
                                        ${form.contentType === type.value
                            ? "bg-primary/10 border-primary"
                            : "bg-white border-transparent shadow-sm hover:border-primary/30"
                          }
                                    `}
                      >
                        <span className={`material-symbols-outlined text-xl md:text-base text-primary`}>
                          {type.icon}
                        </span>
                        <span className="text-[#4a3a2a] text-[10px] md:text-[9px] font-bold uppercase">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Selection */}
                <div className="mb-5 md:mb-3">
                  <label className="block text-[#4a3a2a] text-xs md:text-[10px] font-bold uppercase tracking-wider mb-2 md:mb-1 ml-1">Voice Language</label>
                  <div className="flex bg-[#f3f0ec] p-1.5 md:p-1 rounded-full gap-2 md:gap-1">
                    {(["en", "es", "fr"] as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => updateField("language", lang)}
                        className={`
                                        flex-1 py-2 md:py-1.5 rounded-full text-sm md:text-xs font-bold transition-all
                                        ${form.language === lang
                            ? "bg-white shadow-sm text-primary"
                            : "text-[#a59585]"
                          }
                                    `}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="mb-4 md:mb-2">
                  <label className="block text-[#4a3a2a] text-xs md:text-[10px] font-bold uppercase tracking-wider mb-2 md:mb-1 ml-1">
                    Select Voice <span className="text-amber-600 text-xs md:text-[10px] ml-1">PREMIUM</span>
                  </label>
                  <div className="flex justify-between px-1">
                    {VOICES.filter(v => v.lang === form.language).length === 0 && (
                      <p className="text-sm text-red-500 text-center">No voices found for {form.language}</p>
                    )}
                    {VOICES.filter(v => v.lang === form.language).map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => updateField("voice", voice.id)}
                        className="flex flex-col items-center gap-1.5 md:gap-1"
                      >
                        <div
                          className={`
                            relative size-14 md:size-11 rounded-full flex items-center justify-center transition-all border-2
                            ${form.voice === voice.id
                              ? "bg-primary/10 border-primary shadow-md"
                              : "bg-white border-transparent shadow-sm hover:border-primary/30"
                            }
                          `}
                        >
                          <span className={`material-symbols-outlined text-2xl md:text-xl ${form.voice === voice.id ? "text-primary" : "text-[#a59585]"}`}>
                            {voice.gender === "Male" ? "face" : "face_3"}
                          </span>
                          {form.voice === voice.id && (
                            <div className="absolute -top-0.5 -right-0.5">
                              <div className="size-4 md:size-3 rounded-full bg-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-xs md:text-[10px]">check</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className={`text-xs md:text-[10px] font-bold ${form.voice === voice.id ? "text-primary" : "text-[#4a3a2a]"}`}>
                          {voice.label}
                        </span>
                        <span className="text-[10px] md:text-[8px] uppercase font-medium text-[#a59585]">{voice.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fixed Generate Button */}
              <div className="flex-none pt-3 md:pt-2">
                <button
                  onClick={onSubmit}
                  disabled={!form.topic}
                  className={`
                                clay-button w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 md:py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 group relative overflow-hidden
                                ${!form.topic ? "opacity-50 cursor-not-allowed" : ""}
                            `}
                >
                  <span className="material-symbols-outlined text-xl md:text-lg">bolt</span>
                  <span className="text-base md:text-sm">Generate Voice</span>
                  {/* Subtle pulse effect overlay */}
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-active:opacity-100 transition-opacity"></div>
                </button>
              </div>
            </>
          )}

          {/* === GENERATING STATE === */}
          {/* === GENERATING STATE (Amber Harmonics Overlay) === */}
          {appState === "generating" && (
            <div className="fixed inset-0 z-50 bg-[#231b0f] text-white flex flex-col font-display overflow-hidden">
              {/* Top Navigation Bar */}
              <div className="flex items-center p-4 pb-2 justify-between">
                <div className="text-white flex size-12 shrink-0 items-center">
                  <span className="material-symbols-outlined cursor-pointer" onClick={reset}>chevron_left</span>
                </div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">AI Voice Creator</h2>
                <div className="flex w-12 items-center justify-end">
                  <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-transparent text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <main className="flex-1 flex flex-col items-center justify-center px-6">
                {/* Headline Section */}
                <div className="mb-10 text-center">
                  <h2 className="text-white tracking-light text-[28px] font-bold leading-tight pb-2">Generating...</h2>
                  <p className="text-white/70 text-base font-normal leading-normal max-w-xs mx-auto">
                    Your unique AI voice is being synthesized with premium dark textures.
                  </p>
                </div>

                {/* Central Visualization Container */}
                <div className="relative w-72 h-72 flex items-center justify-center rounded-full neumorphic-inset p-4 mb-8">
                  {/* Amber Sparks (Static representations of activity) */}
                  <div className="particle opacity-60 top-10 right-20"></div>
                  <div className="particle opacity-40 bottom-12 left-16"></div>
                  <div className="particle opacity-80 top-1/2 -right-2"></div>

                  {/* Progress Ring */}
                  <div className="relative size-56 rounded-full border-[10px] border-white/5 flex items-center justify-center">
                    {/* Glowing Active Segment (Simulated via Gradient & Conic-mask - simplified for dynamic width using style) */}
                    {/* Note: Implementing a true conic gradient progress ring dynamically is complex with just tailwind. 
                                    I'll use a conic-gradient background on the border or a simpler visualization for now that matches the "glow" intent.
                                    The user's code had a fixed clip-path. I will try to approximate the "Active Segment" look. */}
                    <div
                      className="absolute inset-0 rounded-full border-[10px] border-primary glow-amber transition-all duration-500 ease-out"
                      style={{
                        clipPath: `inset(0 0 ${100 - progress}% 0)`, // Simple vertical fill reveal as a fallback for the complex polygon, or a rotation.
                        // Better: Just use the Conic Gradient logic if possible, or keep simple.
                        // User provided: clip-path: polygon(...) for 65%.
                        // I will use a simple conic gradient on a pseudo or background to represent progress ring.
                        background: `conic-gradient(#fbb751 ${progress}%, transparent 0)`
                      }}
                    >
                      {/* For the ring border effect, we mask the center */}
                      <div className="absolute inset-2 bg-[#231b0f] rounded-full"></div>
                    </div>

                    {/* Inner Percentage */}
                    <div className="flex flex-col items-center z-10">
                      <span className="text-5xl font-bold text-primary">{Math.round(progress)}%</span>
                      <span className="text-xs uppercase tracking-widest text-primary/60 mt-1">Processing</span>
                    </div>
                  </div>
                </div>

                {/* Progress Description Section */}
                <div className="w-full max-w-sm flex flex-col gap-4">
                  <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl backdrop-blur-sm">
                    <div className="flex gap-6 justify-between">
                      <p className="text-white text-base font-medium leading-normal">{stepMessage}</p>
                      <p className="text-white text-sm font-normal leading-normal">{Math.round(progress)}%</p>
                    </div>
                    <div className="rounded-full bg-[#6a522f] overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-primary glow-amber transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                      <p className="text-[#ccb48e] text-sm font-normal leading-normal">Processing amber harmonics</p>
                    </div>
                  </div>
                </div>
              </main>

              {/* Footer Action */}
              <div className="p-6">
                <div className="flex px-4 py-3 justify-center">
                  <button
                    onClick={reset}
                    className="flex min-w-[140px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-white/5 hover:bg-white/10 text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors"
                  >
                    <span className="truncate">Cancel Generation</span>
                  </button>
                </div>
                {/* Safe area spacing for mobile */}
                <div className="h-6"></div>
              </div>
            </div>
          )}

          {/* === DONE STATE === */}
          {appState === "done" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="mb-5 text-center px-4">
                <h1 className="text-[#4a3a2a] text-2xl font-bold leading-tight line-clamp-2">{jobTitle || form.topic || "Your Podcast"}</h1>
                <p className="text-[#7a6a5a] text-sm font-medium mt-1">Ready to listen!</p>
              </div>

              {/* Visualizer Placeholder */}
              <div className="w-full flex items-center justify-center gap-1.5 h-16">
                {isPlaying ? (
                  [...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2.5 bg-primary rounded-full wave-bar"
                      style={{ height: `${20 + (i % 2) * 20}%`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))
                ) : (
                  <div className="flex gap-1.5 items-center opacity-50">
                    {[6, 10, 5, 8, 12, 6].map((h, i) => (
                      <div key={i} className="w-2.5 bg-gray-300 rounded-full" style={{ height: `${h * 4}px` }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="w-full max-w-sm flex flex-col gap-6">
                {/* Time & Progress */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between px-1">
                    <span className="text-primary font-bold text-xs">{formatTime(currentTime)}</span>
                    <span className="text-gray-400 font-bold text-xs">{formatTime(duration)}</span>
                  </div>
                  <div className="h-2 w-full bg-orange-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Play Controls */}
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }}
                    className="text-primary hover:scale-110 transition-transform"
                  >
                    <span className="material-symbols-outlined text-4xl">replay_10</span>
                  </button>

                  <button
                    onClick={togglePlay}
                    className="clay-button size-16 flex items-center justify-center rounded-full bg-primary text-white active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-4xl">
                      {isPlaying ? "pause" : "play_arrow"}
                    </span>
                  </button>

                  <button
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10; }}
                    className="text-primary hover:scale-110 transition-transform"
                  >
                    <span className="material-symbols-outlined text-4xl">forward_10</span>
                  </button>
                </div>

                {/* Download Action */}
                <div className="flex justify-center mt-2">
                  <a
                    href={audioUrl}
                    onClick={handleDownload}
                    className="flex items-center gap-2 text-[#7a6a5a] text-sm font-bold hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-orange-50/50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    Download MP3
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* === ERROR STATE === */}
          {appState === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-red-500">error</span>
              </div>
              <p className="text-[#4a3a2a] font-bold">{error || "Something went wrong"}</p>
              <button
                onClick={reset}
                className="clay-button px-6 py-3 bg-white rounded-xl text-primary font-bold active:scale-95 transition-transform"
              >
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* Footer / Home Indicator Space */}
        <div className="mt-6 flex justify-center">
          <div className="h-1.5 w-32 bg-white/40 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
