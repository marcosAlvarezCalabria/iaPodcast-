"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

const defaultForm = {
  topic: "",
  durationMinutes: 5,
  language: "en",
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            PodcastForge
          </p>
          <h1 className="text-4xl font-semibold">
            Genera podcasts completos desde un tema
          </h1>
          <p className="text-slate-300">
            Genera guiones, capítulos y audio en minutos. El progreso se transmite
            en tiempo real mientras el worker produce el episodio.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Tema
              <input
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.topic}
                onChange={(event) => updateField("topic", event.target.value)}
                placeholder="IA aplicada a educación"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Audiencia
              <input
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.targetAudience}
                onChange={(event) =>
                  updateField("targetAudience", event.target.value)
                }
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Duración (minutos)
              <input
                type="number"
                min={2}
                max={20}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.durationMinutes}
                onChange={(event) =>
                  updateField("durationMinutes", Number(event.target.value))
                }
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Idioma
              <input
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.language}
                onChange={(event) => updateField("language", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Tono
              <select
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.tone}
                onChange={(event) => updateField("tone", event.target.value)}
              >
                <option value="informative">Informative</option>
                <option value="casual">Casual</option>
                <option value="funny">Funny</option>
                <option value="serious">Serious</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Formato
              <select
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.format}
                onChange={(event) => updateField("format", event.target.value)}
              >
                <option value="solo-host">Solo host</option>
                <option value="host-guest">Host + guest</option>
              </select>
            </label>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-red-300">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creando job..." : "Generate"}
          </button>
        </form>
      </main>
    </div>
  );
}
