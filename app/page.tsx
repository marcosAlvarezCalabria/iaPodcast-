"use client";

import { useState, useRef, useEffect, useCallback, MouseEvent } from "react";
import { WheelPicker } from "./components/WheelPicker";

type Language = "es" | "en" | "fr" | "zh" | "hi" | "ar" | "pt" | "ru" | "de" | "ja" | "id" | "ko" | "it" | "tr" | "nl";


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
  // Spanish
  { id: "es-ES-Neural2-B", label: "Mateo", lang: "es", gender: "Male", desc: "Narrator" },
  { id: "es-ES-Wavenet-C", label: "Elena", lang: "es", gender: "Female", desc: "Warm" },
  { id: "es-US-Neural2-B", label: "Diego", lang: "es", gender: "Male", desc: "Deep" },
  { id: "es-US-Neural2-A", label: "Mia", lang: "es", gender: "Female", desc: "Vibrant" },
  // English
  { id: "en-US-Neural2-D", label: "James", lang: "en", gender: "Male", desc: "Radio Host" },
  { id: "en-US-Neural2-C", label: "Emma", lang: "en", gender: "Female", desc: "Professional" },
  { id: "en-US-Neural2-A", label: "Michael", lang: "en", gender: "Male", desc: "Calm" },
  { id: "en-US-Neural2-F", label: "Sarah", lang: "en", gender: "Female", desc: "Friendly" },
  // French
  { id: "fr-FR-Neural2-B", label: "Claude", lang: "fr", gender: "Male", desc: "Elegant" },
  { id: "fr-FR-Neural2-A", label: "Marie", lang: "fr", gender: "Female", desc: "Soft" },
  { id: "fr-FR-Neural2-D", label: "Pierre", lang: "fr", gender: "Male", desc: "Deep" },
  { id: "fr-FR-Wavenet-C", label: "Sophie", lang: "fr", gender: "Female", desc: "Warm" },
  // Chinese (Mandarin)
  { id: "cmn-CN-Wavenet-C", label: "Li", lang: "zh", gender: "Male", desc: "Balanced" },
  { id: "cmn-CN-Wavenet-A", label: "Mei", lang: "zh", gender: "Female", desc: "Clear" },
  // Hindi
  { id: "hi-IN-Neural2-B", label: "Arjun", lang: "hi", gender: "Male", desc: "Clear" },
  { id: "hi-IN-Neural2-A", label: "Ananya", lang: "hi", gender: "Female", desc: "Soft" },
  // Arabic
  { id: "ar-XA-Wavenet-B", label: "Omar", lang: "ar", gender: "Male", desc: "Deep" },
  { id: "ar-XA-Wavenet-A", label: "Fatima", lang: "ar", gender: "Female", desc: "Detailed" },
  // Portuguese (Brazil)
  { id: "pt-BR-Neural2-B", label: "Tiago", lang: "pt", gender: "Male", desc: "Friendly" },
  { id: "pt-BR-Neural2-A", label: "Camila", lang: "pt", gender: "Female", desc: "Vibrant" },
  // Russian
  { id: "ru-RU-Wavenet-B", label: "Dmitry", lang: "ru", gender: "Male", desc: "Narrator" },
  { id: "ru-RU-Wavenet-A", label: "Svetlana", lang: "ru", gender: "Female", desc: "Warm" },
  // German
  { id: "de-DE-Neural2-B", label: "Klaus", lang: "de", gender: "Male", desc: "Professional" },
  { id: "de-DE-Neural2-F", label: "Hannah", lang: "de", gender: "Female", desc: "Soft" },
  // Japanese
  { id: "ja-JP-Neural2-C", label: "Takumi", lang: "ja", gender: "Male", desc: "Balanced" },
  { id: "ja-JP-Neural2-B", label: "Akari", lang: "ja", gender: "Female", desc: "Clear" },
  // Indonesian
  { id: "id-ID-Wavenet-B", label: "Budi", lang: "id", gender: "Male", desc: "Deep" },
  { id: "id-ID-Wavenet-A", label: "Siti", lang: "id", gender: "Female", desc: "Friendly" },
  // Korean
  { id: "ko-KR-Neural2-C", label: "Min", lang: "ko", gender: "Male", desc: "Modern" },
  { id: "ko-KR-Neural2-A", label: "Ji-Woo", lang: "ko", gender: "Female", desc: "Soft" },
  // Italian
  { id: "it-IT-Neural2-C", label: "Marco", lang: "it", gender: "Male", desc: "Deep" },
  { id: "it-IT-Neural2-A", label: "Chiara", lang: "it", gender: "Female", desc: "Vibrant" },
  // Turkish
  { id: "tr-TR-Wavenet-B", label: "Emre", lang: "tr", gender: "Male", desc: "Clear" },
  { id: "tr-TR-Wavenet-A", label: "Aylin", lang: "tr", gender: "Female", desc: "Warm" },
  // Dutch
  { id: "nl-NL-Wavenet-B", label: "Lars", lang: "nl", gender: "Male", desc: "Friendly" },
  { id: "nl-NL-Wavenet-A", label: "Lotte", lang: "nl", gender: "Female", desc: "Soft" },
];

export default function Home() {
  const [form, setForm] = useState(defaultForm);
  const [appState, setAppState] = useState<AppState>("form");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState("Preparing...");
  const [error, setError] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);

  // Usage Limit State
  const [usageState, setUsageState] = useState<{ usage: number; limit: number } | null>(null);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/user-status");
      if (res.ok) {
        const data = await res.json();
        setUsageState(data);
      }
    } catch (e) {
      console.error("Failed to fetch usage:", e);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

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

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Preview state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // EventSource ref for SSE connection
  const eventSourceRef = useRef<EventSource | null>(null);

  // Audio Analysis Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Stop logic decoupled from event
  const stopRecordingInternal = useCallback(async (shouldTranscribe = true) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    // Clear silence safeguards
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    const recorder = mediaRecorderRef.current;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });

        // Release tracks
        recorder.stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        chunksRef.current = [];

        if (!shouldTranscribe) {
          resolve();
          return;
        }

        setIsTranscribing(true);

        try {
          // If the blob is tiny (empty), skip
          if (blob.size < 1000) { // arbitrary small threshold for "silence" file
            setIsTranscribing(false);
            resolve();
            return;
          }

          const formData = new FormData();
          formData.append("file", blob, "recording.webm");
          formData.append("language", form.language);

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error("Transcription failed");
          }

          const data = await res.json();
          if (data.text) {
            setForm((prev) => ({
              ...prev,
              topic: prev.topic + (prev.topic ? " " : "") + data.text,
            }));
          }
        } catch (error) {
          console.error("Transcription error", error);
        } finally {
          setIsTranscribing(false);
          resolve();
        }
      };

      recorder.stop();
    });
  }, [form.language]); // Removed form.topic dependency

  // Start recording (Hold down)
  const startRecording = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isRecording || isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Set up Audio Analysis for Silence Detection
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastSpeechTime = Date.now();
      isSpeakingRef.current = false;

      const checkSilence = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for "speech" (adjust as needed, usually > 10-15 is noise/speech)
        const THRESHOLD = 10;

        if (average > THRESHOLD) {
          lastSpeechTime = Date.now();
          isSpeakingRef.current = true;
        }

        // Check if silence exceeded 2 seconds (2000ms)
        if (Date.now() - lastSpeechTime > 2000) {
          // Stop logic
          // If they never spoke, maybe cancel?
          // User: "si pulsamos y pasan dos segundos sin decir nada este debraa pasar de nuevo a estado sin pulsar"
          // AND "no deberia generar nada"
          const userSpokeAtAll = isSpeakingRef.current;
          stopRecordingInternal(userSpokeAtAll).then(() => {
            // Done
          });
          return; // Stop loop
        }

        animationFrameRef.current = requestAnimationFrame(checkSilence);
      };

      mediaRecorder.start();
      setIsRecording(true);
      checkSilence();

    } catch (err) {
      console.error("Error accessing microphone:", err);
      // alert("Microphone access denied or not available");
    }
  }, [isRecording, isTranscribing, stopRecordingInternal]);

  // Stop recording and transcribe (Release)
  const stopRecording = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    stopRecordingInternal(true); // Always try to transcribe on manual release? Or verify silence?
    // User expectation: manual release usually means "I'm done".
    // But if they released after 0.1s it might be a click.
  }, [stopRecordingInternal]);

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
    fetchUsage(); // Refresh usage when starting over
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

  const playPreview = async (previewVoiceId?: string) => {
    // If we are playing specific voice that is already playing, stop it
    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setIsPlayingPreview(false);
      // If we clicked the same voice that was playing, just return (toggle off)
      // If we clicked a different voice, we continue to play that new voice
      if (!previewVoiceId || previewVoiceId === form.voice) return;
    }

    const voiceToPlay = previewVoiceId || form.voice;
    if (!voiceToPlay) return;

    try {
      setIsPlayingPreview(true);
      const res = await fetch("/api/preview", {
        method: "POST",
        body: JSON.stringify({ voiceId: voiceToPlay }),
      });

      if (!res.ok) throw new Error("Preview failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.play();
        previewAudioRef.current.onended = () => setIsPlayingPreview(false);
      } else {
        const audio = new Audio(url);
        audio.onended = () => setIsPlayingPreview(false);
        audio.play();
        // audio doesn't need ref if we don't plan to stop it mid-way with same button, 
        // but for toggle we do. Let's rely on simple state for now.
        // Actually, to toggle stop, we need the ref.
        // Let's attach it to a temp ref if not using the DOM element ref (which we aren't for preview, usually).
        // Since I defined previewAudioRef, I should assign it.
        previewAudioRef.current = audio;
      }
    } catch (e) {
      console.error(e);
      setIsPlayingPreview(false);
    }
  };

  const handleShare = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!audioUrl) return;

    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const file = new File([blob], `${(jobTitle || form.topic || "podcast").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`, { type: "audio/mpeg" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: jobTitle || "My AI Podcast",
          text: `Check out this podcast about ${form.topic}!`,
          files: [file],
        });
      } else if (navigator.share) {
        // Fallback to link sharing if file sharing not supported
        await navigator.share({
          title: jobTitle || "My AI Podcast",
          text: `Check out this podcast about ${form.topic}!`,
          url: window.location.href, // Or public URL if available
        });
      } else {
        alert("Sharing is not supported on this device. Please download the file.");
      }
    } catch (err) {
      console.error("Share failed", err);
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

      {/* Main Container (iOS Safe Area handling) - Centered on desktop (Reduced top padding for mobile) */}
      <div className="relative h-[100dvh] w-full max-w-md md:max-w-xl mx-auto flex flex-col px-5 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4">

        {/* App Bar Area (Reduced margin) */}
        <div className="flex items-center justify-between mb-1 sm:mb-2">
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

          <div className="flex flex-col items-center relative">
            <img
              src="/logo.png"
              alt="App Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-md mb-1"
            />
            <h2 className="text-white text-lg font-bold tracking-tight leading-none">AI Voice Creator</h2>
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
        <div className="clay-card flex-1 flex flex-col rounded-2xl p-3 sm:p-4 overflow-hidden relative">

          {appState === "form" && (
            <>
              {/* Scrollable Form Area - Reduced Gap (gap-2 vs gap-3) */}
              <div className="flex-1 flex flex-col justify-start -mx-1 px-1 pb-2 overflow-y-auto no-scrollbar gap-2 sm:gap-4 min-h-0">

                {/* Top: Headline */}
                <div className="flex flex-col mb-1 sm:mb-2 text-center items-center justify-center gap-1">
                  <div className="text-center">
                    <h1 className="text-[#4a3a2a] text-lg sm:text-xl font-bold leading-none">Create Your Podcast</h1>
                    <p className="text-[#7a6a5a] text-[11px] sm:text-xs font-medium leading-none mt-1">Transform your ideas into audio</p>
                  </div>
                </div>

                {/* MAIN INPUT AREA (WhatsApp Style) */}
                <div className="flex flex-col gap-3">
                  <label className="block text-[#4a3a2a] text-[10px] md:text-[10px] font-bold uppercase tracking-wider ml-1 mb-0.5">Topic & Recording</label>

                  {/* Row: Input + Mic */}
                  <div className="flex items-center gap-2">
                    {/* Text Area (Grows) */}
                    <div className="glass-input rounded-xl p-2 sm:p-3 flex-1 flex items-start gap-1 transition-all focus-within:ring-2 focus-within:ring-primary/20 relative">
                      <textarea
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[#4a3a2a] placeholder:text-[#a59585] resize-none h-12 md:h-14 p-0 text-sm md:text-sm font-normal leading-snug outline-none"
                        placeholder={isRecording ? "Recording..." : isTranscribing ? "Processing..." : "What shall we talk about?"}
                        value={form.topic}
                        onChange={(e) => updateField("topic", e.target.value)}
                      ></textarea>
                      {form.topic && !isRecording && !isTranscribing && (
                        <button
                          onClick={() => updateField("topic", "")}
                          className="flex-none p-1 rounded-full text-[#a59585] hover:bg-black/5 hover:text-[#4a3a2a] transition-colors"
                          title="Clear text"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      )}
                    </div>

                    {/* Mic Button (Fixed) */}
                    <button
                      type="button"
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onMouseLeave={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`
                          flex-none size-14 md:size-16 rounded-2xl flex items-center justify-center transition-all shadow-lg select-none z-10
                          ${isRecording
                          ? "bg-red-500 text-white scale-95 ring-4 ring-red-500/30"
                          : isTranscribing
                            ? "bg-amber-500/20 text-white animate-pulse active:scale-95"
                            : "bg-transparent shadow-amber-500/20 hover:scale-105 active:scale-95"
                        }
                        `}
                      title="Hold to speak"
                    >
                      {isRecording ? (
                        <span className="material-symbols-outlined text-2xl md:text-3xl animate-pulse">mic</span>
                      ) : isTranscribing ? (
                        <span className="material-symbols-outlined text-2xl md:text-3xl animate-spin">sync</span>
                      ) : (
                        <img
                          src="/logo_mic_v2.png"
                          alt="Start Rec"
                          className="w-full h-full object-cover rounded-2xl shadow-sm border-2 border-primary/20 pointer-events-none"
                        />
                      )}
                    </button>
                  </div>
                  <span className="text-[9px] text-[#7a6a5a] text-right pr-2 -mt-1 uppercase tracking-wider font-medium select-none">
                    {isRecording ? "Release to stop" : isTranscribing ? "Transcribing..." : "Hold mic to speak"}
                  </span>
                </div>

                {/* "Buttons Below The Box" -> Style Grid */}
                <div className="flex flex-col mt-1">
                  <label className="block text-[#4a3a2a] text-[10px] md:text-[10px] font-bold uppercase tracking-wider mb-1 md:mb-1.5 ml-1">Style</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar md:grid md:grid-cols-4 md:overflow-visible">
                    {contentTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateField("contentType", type.value)}
                        className={`
                                        flex-none w-20 md:w-auto rounded-xl p-2 md:p-2 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer border-2 h-16 md:h-20
                                        ${form.contentType === type.value
                            ? "bg-primary/10 border-primary"
                            : "bg-white/40 border-transparent shadow-sm hover:border-primary/30"
                          }
                                    `}
                      >
                        <span className={`material-symbols-outlined text-xl md:text-2xl text-primary`}>
                          {type.icon}
                        </span>
                        <span className="text-[#4a3a2a] text-[9px] sm:text-[10px] font-bold uppercase leading-tight">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom: Language & Voice */}
                <div className="mt-1">
                  <label className="block text-[#4a3a2a] text-[10px] md:text-[10px] font-bold uppercase tracking-wider mb-1 md:mb-1.5 ml-1">Voice & Language</label>
                  <div className="flex gap-2 sm:gap-4 h-auto min-h-[160px]">
                    {/* Language Wheel */}
                    <div className="flex-1 rounded-xl overflow-hidden bg-[#1e1810] p-1 sm:p-2 shadow-inner">
                      <WheelPicker
                        options={[
                          { value: "en", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1fa-1f1f8.png" alt="US" className="w-4 h-4" /><span>English</span></div>), sublabel: "US" },
                          { value: "es", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1ea-1f1f8.png" alt="ES" className="w-4 h-4" /><span>Español</span></div>), sublabel: "Spanish" },
                          { value: "fr", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1eb-1f1f7.png" alt="FR" className="w-4 h-4" /><span>Français</span></div>), sublabel: "French" },
                          { value: "zh", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1e8-1f1f3.png" alt="CN" className="w-4 h-4" /><span>Chinese</span></div>), sublabel: "Mandarin" },
                          { value: "hi", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1ee-1f1f3.png" alt="IN" className="w-4 h-4" /><span>Hindi</span></div>), sublabel: "India" },
                          { value: "ar", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1f8-1f1e6.png" alt="SA" className="w-4 h-4" /><span>Arabic</span></div>), sublabel: "General" },
                          { value: "pt", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1e7-1f1f7.png" alt="BR" className="w-4 h-4" /><span>Português</span></div>), sublabel: "Brazil" },
                          { value: "ru", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1f7-1f1fa.png" alt="RU" className="w-4 h-4" /><span>Russian</span></div>), sublabel: "Russia" },
                          { value: "de", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1e9-1f1ea.png" alt="DE" className="w-4 h-4" /><span>Deutsch</span></div>), sublabel: "German" },
                          { value: "ja", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1ef-1f1f5.png" alt="JP" className="w-4 h-4" /><span>Japanese</span></div>), sublabel: "Japan" },
                          { value: "id", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1ee-1f1e9.png" alt="ID" className="w-4 h-4" /><span>Indonesian</span></div>), sublabel: "Indonesia" },
                          { value: "ko", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1f0-1f1f7.png" alt="KR" className="w-4 h-4" /><span>Korean</span></div>), sublabel: "Korea" },
                          { value: "it", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1ee-1f1f9.png" alt="IT" className="w-4 h-4" /><span>Italiano</span></div>), sublabel: "Italian" },
                          { value: "tr", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1f9-1f1f7.png" alt="TR" className="w-4 h-4" /><span>Turkish</span></div>), sublabel: "Turkey" },
                          { value: "nl", label: (<div className="flex items-center gap-1.5"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1f3-1f1f1.png" alt="NL" className="w-4 h-4" /><span>Dutch</span></div>), sublabel: "Netherl." },
                        ]}
                        value={form.language}
                        onChange={(val) => {
                          updateField("language", val);
                          const firstVoice = VOICES.find(v => v.lang === val);
                          if (firstVoice) updateField("voice", firstVoice.id);
                        }}
                        itemHeight={50}
                        visibleItems={3}
                      />
                    </div>

                    {/* Voice Wheel */}
                    <div className="flex-1 rounded-xl overflow-hidden bg-[#1e1810] p-1 sm:p-2 shadow-inner relative">
                      <WheelPicker
                        options={VOICES.filter(v => v.lang === form.language).map(v => {
                          const isSelected = v.id === (form.voice || VOICES.find(x => x.lang === form.language)?.id);
                          return {
                            value: v.id,
                            label: (
                              <div className="flex items-center justify-between w-full px-2">
                                <span>{v.label}</span>
                                {isSelected && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playPreview(v.id);
                                    }}
                                    className="w-6 h-6 rounded-full bg-primary/20 hover:bg-primary/40 text-primary flex items-center justify-center transition-all active:scale-95 ml-2"
                                    title="Preview Voice"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {isPlayingPreview && previewAudioRef.current && !previewAudioRef.current.paused ? "stop" : "play_arrow"}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ),
                            sublabel: `${v.gender} · ${v.desc}`,
                          };
                        })}
                        value={form.voice || VOICES.find(v => v.lang === form.language)?.id || ""}
                        onChange={(val) => updateField("voice", val)}
                        itemHeight={50}
                        visibleItems={3}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Fixed Generate Button - Reduced Padding (py-3) */}
              <div className="flex-none pt-2 md:pt-2">
                <button
                  onClick={onSubmit}
                  disabled={!form.topic || (usageState !== null && usageState.usage >= usageState.limit)}
                  className={`
                    w-full py-3 md:py-4 px-6 rounded-xl font-bold text-lg md:text-xl shadow-lg
                    transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 md:gap-3
                    ${!form.topic || (usageState !== null && usageState.usage >= usageState.limit)
                      ? "bg-[#d4c5b5] text-[#8a7a6a] cursor-not-allowed shadow-none"
                      : "bg-primary text-white hover:bg-primary/90 hover:shadow-primary/25 shadow-primary/20"
                    }
                  `}
                >
                  {usageState && usageState.usage >= usageState.limit ? (
                    <span>Limit Reached (4/4)</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">auto_awesome</span>
                      <span>Generate Podcast {usageState ? `(${usageState.usage}/${usageState.limit})` : ""}</span>
                    </>
                  )}
                </button>

                {/* Limit Warning / Contact Info */}
                {usageState && usageState.usage >= usageState.limit && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-center">
                    <p className="text-sm text-red-800 font-medium mb-1">
                      Beta Limit Reached (4/4)
                    </p>
                    <p className="text-xs text-red-600">
                      Limit resets in 24 hours.
                    </p>
                  </div>
                )}

                {usageState && usageState.usage === usageState.limit - 1 && (
                  <p className="text-center text-xs text-orange-600 mt-2 font-medium">
                    ⚠️ This is your last free generation!
                  </p>
                )}
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

                {/* Download and Share Actions */}
                <div className="flex justify-center mt-4 gap-3">
                  <a
                    href={audioUrl}
                    onClick={handleDownload}
                    className="flex items-center gap-2 text-[#7a6a5a] text-sm font-bold hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-orange-50/50 cursor-pointer bg-white/40 border border-white/50 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    Download
                  </a>

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-[#7a6a5a] text-sm font-bold hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-orange-50/50 cursor-pointer bg-white/40 border border-white/50 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-lg">share</span>
                    Share
                  </button>
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
