"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Definimos los tipos para nuestros valores visuales
type Language = "es" | "en" | "fr";

const defaultForm = {
  topic: "",
  durationMinutes: 1,
  language: "es" as Language,
  tone: "informative",
  targetAudience: "general",
  format: "solo-host",
};

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    if (!form.topic.trim()) return;
    setSubmitting(true);
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
      const { jobId } = (await response.json()) as { jobId: string };
      router.push(`/job/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fbb751] dark:bg-[#231b0f] min-h-screen flex flex-col items-center overflow-x-hidden p-6 font-display">
      {/* Top Navigation Area */}
      <header className="w-full max-w-md flex justify-end items-center py-4 mb-4">
        <a
          href="https://github.com/marcosAlvarezCalabria?tab=repositories"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-sm border border-white/30 active:scale-95 transition-transform"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
        </a>
      </header>

      {/* Main 3D Stage Card */}
      <main className="w-full max-w-md flex-1 flex flex-col items-center justify-center">
        <div className="clay-card w-full p-6 flex flex-col items-center gap-6 border-b-8 border-black/5 relative overflow-hidden">
          {/* 3D Microphone Illustration Placeholder */}
          <div className="relative w-full h-48 flex items-center justify-center">
            {/* Decorative background elements for 3D feel */}
            <div className="absolute w-40 h-40 bg-[#fbb751]/10 rounded-full blur-3xl"></div>
            {/* Main Asset */}
            <div className="relative w-40 h-40 flex items-center justify-center bg-gradient-to-br from-white to-gray-50 rounded-full shadow-lg border border-gray-100">
              <div
                className="w-36 h-36 rounded-full bg-cover bg-center"
                data-alt="3D claymorphism microphone illustration with soft highlights"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAJDEv7dT11P2hF6luD6LnQQ17DUWrzDr0sPK3YMQT-ensAKnXhGFr6YwauqxRaltWhy2VUTlsWbjlwVVfd8e-bv963a_tIVmjx582rNN78O9gulVNPJoLHLdoJeHkdbekwIIvWxMBz52cOJz8zLO4zIh-SY2jhPzGaKInonKbzM2e2_2ak9NcDfmQEPDmAPrhGjoyhVPbJIGysFsGPLgO_8qJ9r26W_bdjL_nLtpn-bg8wOkoYnpu-PFdj0WenTjwzUzQYev9xm80")',
                }}
              ></div>
            </div>
          </div>

          {/* Descriptive Text */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Audio Creator
            </h1>
            <p className="text-gray-400 font-medium text-xs mt-1">
              Start your 3D audio journey
            </p>
          </div>

          {/* Pop Style Input Field */}
          <div className="w-full px-2 pb-2">
            <div className="relative flex items-center">
              <input
                className="clay-input w-full h-14 px-5 pr-12 border-none rounded-full text-gray-700 placeholder:text-gray-400 text-base focus:ring-4 focus:ring-[#fbb751]/20 transition-all font-medium outline-none"
                placeholder="Enter your script..."
                type="text"
                value={form.topic}
                onChange={(e) => updateField("topic", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmit();
                }}
              />
              <button
                onClick={onSubmit}
                disabled={submitting || !form.topic}
                className="absolute right-2 h-10 w-10 flex items-center justify-center bg-[#fbb751] rounded-full text-white shadow-md active:scale-90 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {submitting ? "hourglass_empty" : "auto_awesome"}
                </span>
              </button>
            </div>
            {error && <p className="mt-2 text-center text-red-400 font-bold text-xs">{error}</p>}
          </div>
        </div>

        {/* Language Selection Section */}
        <section className="w-full mt-6">
          <h4 className="text-white/90 text-xs font-bold leading-normal tracking-widest px-4 py-1 text-center uppercase">
            Select Language
          </h4>
          <div className="flex gap-3 p-2 flex-wrap justify-center mt-1">
            {/* English Chip */}
            <button
              onClick={() => updateField("language", "en")}
              className={`flex h-12 items-center justify-center gap-x-2 rounded-full pl-2 pr-5 shadow-lg active:scale-95 transition-transform border-b-4 ${form.language === "en"
                ? "bg-white/90 backdrop-blur-sm border-black/5"
                : "bg-white/40 backdrop-blur-sm border-white/30"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${form.language === "en"
                  ? "bg-gray-100 border border-gray-200"
                  : "bg-white/50"
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${form.language === "en" ? "text-gray-700" : "text-white"
                    }`}
                >
                  language
                </span>
              </div>
              <p
                className={`text-base font-bold ${form.language === "en" ? "text-gray-800" : "text-white"
                  }`}
              >
                English
              </p>
            </button>
            {/* Spanish Chip */}
            <button
              onClick={() => updateField("language", "es")}
              className={`flex h-14 items-center justify-center gap-x-3 rounded-full pl-3 pr-6 shadow-lg active:scale-95 transition-transform border-b-4 ${form.language === "es"
                ? "bg-white/90 backdrop-blur-sm border-black/5"
                : "bg-white/40 backdrop-blur-sm border-white/30"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${form.language === "es"
                  ? "bg-gray-100 border border-gray-200"
                  : "bg-white/50"
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${form.language === "es" ? "text-gray-700" : "text-white"
                    }`}
                >
                  flag
                </span>
              </div>
              <p
                className={`text-base font-bold ${form.language === "es" ? "text-gray-800" : "text-white"
                  }`}
              >
                Spanish
              </p>
            </button>
            {/* French Chip */}
            <button
              onClick={() => updateField("language", "fr")}
              className={`flex h-14 items-center justify-center gap-x-3 rounded-full pl-3 pr-6 shadow-lg active:scale-95 transition-transform border-b-4 ${form.language === "fr"
                ? "bg-white/90 backdrop-blur-sm border-black/5"
                : "bg-white/40 backdrop-blur-sm border-white/30"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${form.language === "fr"
                  ? "bg-gray-100 border border-gray-200"
                  : "bg-white/50"
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${form.language === "fr" ? "text-gray-700" : "text-white"
                    }`}
                >
                  flag
                </span>
              </div>
              <p
                className={`text-base font-bold ${form.language === "fr" ? "text-gray-800" : "text-white"
                  }`}
              >
                French
              </p>
            </button>
          </div>
        </section>

        {/* Bottom Spacer for iOS Home Indicator */}
        <div className="h-10"></div>
      </main>
    </div>
  );
}
