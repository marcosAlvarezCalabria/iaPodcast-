"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// Job Types
type JobStatus = {
  status: string;
  step: string;
  percent: number;
  error?: string;
  topic?: string;
  outputs?: {
    script: string;
    chapters: string;
    audio: string;
  };
};

type JobLog = {
  step: string;
  percent: number;
  message: string;
  ts: string;
  done?: boolean;
  status?: string;
};

export default function JobPageClient() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isDone = status?.status === "DONE";
  const progress = status?.percent ?? 0;
  const audioUrl = isDone ? `/api/jobs/${jobId}/audio` : undefined;

  // 1. Initial Status Load & SSE
  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) return;
        const data = (await response.json()) as JobStatus;
        if (active) setStatus(data);
      } catch (e) {
        console.error("Failed to load status", e);
      }
    };
    loadStatus();

    const eventSource = new EventSource(`/api/jobs/${jobId}/events`);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as JobLog;
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              step: payload.step,
              percent: payload.percent,
              status: payload.status ?? prev.status,
            }
          : prev
      );
      if (payload.done) eventSource.close();
    };
    eventSource.onerror = () => eventSource.close();

    return () => {
      active = false;
      eventSource.close();
    };
  }, [jobId]);

  // Audio Handlers
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
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="bg-[#FFB74D] font-display select-none min-h-screen flex flex-col items-center justify-center overflow-x-hidden p-4 relative">
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
      <header className="flex w-full items-center justify-between mb-4 max-w-md">
        <button
          onClick={() => router.push("/")}
          className="flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-sm active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">expand_more</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
            {isDone ? "Now Playing" : "Generating..."}
          </span>
          <h2 className="text-white text-lg font-bold leading-tight max-w-[200px] truncate text-center">
            {status?.topic || `Job #${jobId.slice(0, 4)}`}
          </h2>
        </div>
        <div className="flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-sm opacity-0 pointer-events-none">
          <span className="material-symbols-outlined">more_horiz</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex w-full max-w-md flex-1 flex-col items-center justify-center pb-8">
        {/* Central Aura / Radio Wave Visualizer */}
        <div className="w-full mb-4 relative flex flex-col items-center">
          <div className="relative aspect-square w-48 h-48 rounded-full bg-white p-2 clay-card flex items-center justify-center overflow-hidden z-20">
            {/* Inner Content */}
            <div className="w-full h-full rounded-full bg-orange-50 flex items-center justify-center relative overflow-hidden">
              {/* Radio Waves Animation (When Playing or Generating) */}
              {(isPlaying || !isDone) && (
                <>
                  <div
                    className="radio-wave"
                    style={{ animationDelay: "0s" }}
                  ></div>
                  <div
                    className="radio-wave"
                    style={{ animationDelay: "0.6s" }}
                  ></div>
                  <div
                    className="radio-wave"
                    style={{ animationDelay: "1.2s" }}
                  ></div>
                </>
              )}

              {/* Icon / Central Element */}
              <div className="z-30 relative bg-white/50 backdrop-blur-sm p-3 rounded-full shadow-sm">
                <span
                  className={`material-symbols-outlined text-3xl text-[#FFB74D] ${!isDone ? "animate-pulse" : ""}`}
                >
                  {isDone ? "mic" : "auto_awesome"}
                </span>
              </div>

              {!isDone && (
                <div className="absolute bottom-4 flex flex-col items-center">
                  <span className="text-[#FFB74D] font-bold text-base">
                    {progress}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Outer Pulsing Aura (Decorative) */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-white/20 rounded-full blur-3xl z-10 transition-opacity duration-1000 ${isPlaying || !isDone ? "opacity-100 scale-110" : "opacity-0 scale-90"}`}
          ></div>

          <div className="mt-4 text-center z-20">
            <h1 className="text-white text-xl font-bold tracking-tight">
              {status?.step || "Preparing..."}
            </h1>
          </div>
        </div>

        {/* 3D Waveform Visualizer - Compacted with new Animation */}
        <div className="w-full flex items-center justify-center gap-1.5 h-12 mb-6">
          {isDone && isPlaying ? (
            // Active Visualizer
            [...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-2.5 bg-white rounded-full wave-bar"
                style={{
                  height: `${20 + (i % 2) * 20}%`,
                  opacity: 0.8,
                  animationDelay: `${i * 0.1}s`,
                }}
              ></div>
            ))
          ) : (
            // Static / Loading State
            <div className="flex gap-1.5 items-center justify-center h-full opacity-50">
              <div className="w-2.5 h-6 bg-white rounded-full"></div>
              <div className="w-2.5 h-10 bg-white rounded-full"></div>
              <div className="w-2.5 h-5 bg-white rounded-full"></div>
              <div className="w-2.5 h-8 bg-white rounded-full"></div>
              <div className="w-2.5 h-12 bg-white rounded-full"></div>
              <div className="w-2.5 h-6 bg-white rounded-full"></div>
            </div>
          )}
        </div>

        {/* Floating Controls Card - Containing Play Button */}
        <div className="w-full bg-white rounded-[2rem] p-6 clay-card flex flex-col gap-6 transition-opacity duration-500">
          {/* Progress Slider */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[#FFB74D] font-bold text-xs">
                {formatTime(currentTime)}
              </span>
              <span className="text-gray-400 font-bold text-xs">
                {formatTime(duration)}
              </span>
            </div>
            <div className="relative h-2.5 w-full bg-orange-100 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-[#FFB74D] rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between px-2">
            {/* Shuffle / Prev */}
            <div className="flex items-center gap-4">
              <button
                disabled={!isDone}
                className="text-gray-300 hover:text-[#FFB74D] transition-colors disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-2xl">
                  shuffle
                </span>
              </button>
              <button
                disabled={!isDone}
                onClick={() => {
                  if (audioRef.current) audioRef.current.currentTime -= 10;
                }}
                className="text-[#FFB74D] disabled:opacity-30 hover:scale-110 transition-transform"
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  replay_10
                </span>
              </button>
            </div>

            {/* Central Play Button (Integrated) */}
            <button
              onClick={togglePlay}
              disabled={!isDone}
              className="flex size-16 items-center justify-center rounded-full bg-[#FFB74D] text-white shadow-lg shadow-orange-200 active:scale-95 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="material-symbols-outlined text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>

            {/* Next / Repeat */}
            <div className="flex items-center gap-4">
              <button
                disabled={!isDone}
                onClick={() => {
                  if (audioRef.current) audioRef.current.currentTime += 10;
                }}
                className="text-[#FFB74D] disabled:opacity-30 hover:scale-110 transition-transform"
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  forward_10
                </span>
              </button>
              <button
                disabled={!isDone}
                className="text-gray-300 hover:text-[#FFB74D] transition-colors disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-2xl">
                  repeat
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
