"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type JobStatus = {
  status: string;
  step: string;
  percent: number;
  error?: string;
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

export default function JobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [script, setScript] = useState<string | null>(null);
  const [chapters, setChapters] = useState<unknown>(null);

  const progress = status?.percent ?? 0;
  const isDone = status?.status === "DONE";
  const isError = status?.status === "ERROR";

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as JobStatus;
      if (active) {
        setStatus(data);
      }
    };
    loadStatus();
    return () => {
      active = false;
    };
  }, [jobId]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/jobs/${jobId}/events`);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as JobLog;
      setLogs((prev) => [...prev, payload]);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              step: payload.step,
              percent: payload.percent,
              status: payload.status ?? prev.status,
            }
          : prev,
      );
      if (payload.done) {
        eventSource.close();
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, [jobId]);

  useEffect(() => {
    if (!isDone) {
      return;
    }
    const loadOutputs = async () => {
      const [scriptRes, chaptersRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}/script`),
        fetch(`/api/jobs/${jobId}/chapters`),
      ]);
      if (scriptRes.ok) {
        setScript(await scriptRes.text());
      }
      if (chaptersRes.ok) {
        setChapters(await chaptersRes.json());
      }
    };
    loadOutputs();
  }, [isDone, jobId]);

  const lastLog = useMemo(() => logs[logs.length - 1], [logs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="space-y-2">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            ← Volver
          </Link>
          <h1 className="text-3xl font-semibold">Job {jobId}</h1>
          <p className="text-slate-400">
            {status?.step ?? "Preparando"} · {progress}%
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="space-y-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-3 rounded-full bg-emerald-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-slate-300">
              {lastLog?.message ?? "Esperando actualizaciones"}
            </p>
            {isError && status?.error ? (
              <p className="text-sm text-red-300">{status.error}</p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Logs</h2>
            <ul className="mt-4 max-h-64 space-y-2 overflow-auto text-sm text-slate-300">
              {logs.length === 0 ? (
                <li>Esperando eventos...</li>
              ) : (
                logs.map((log, index) => (
                  <li key={`${log.ts}-${index}`}>
                    <span className="text-slate-500">[{log.step}]</span> {log.message}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Audio</h2>
            {isDone ? (
              <div className="mt-4 space-y-3">
                <audio controls className="w-full">
                  <source src={`/api/jobs/${jobId}/audio`} />
                </audio>
                <a
                  href={`/api/jobs/${jobId}/audio`}
                  className="text-sm text-emerald-300 hover:text-emerald-200"
                  download
                >
                  Descargar audio
                </a>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                El audio aparecerá cuando el job termine.
              </p>
            )}
          </div>
        </section>

        {isDone ? (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Guion</h2>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-sm text-slate-200">
                {script ?? "Cargando..."}
              </pre>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Capítulos</h2>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-sm text-slate-200">
                {chapters ? JSON.stringify(chapters, null, 2) : "Cargando..."}
              </pre>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
