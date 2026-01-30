import { createClient } from "@supabase/supabase-js";
import type { JobMetadata, JobState, JobStatus, JobLog, JobOutputs } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabase = () => {
  if (supabaseClient) return supabaseClient;

  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    console.warn("Missing or invalid NEXT_PUBLIC_SUPABASE_URL, using placeholder for build/dev safety.");
    // Return a dummy client or throw helpful error at runtime
    // For build safety, we return a client connected to a dummy URL if validation fails, 
    // but this ensures 'createClient' doesn't crash module scope.
    return createClient("https://placeholder.supabase.co", "placeholder", { auth: { persistSession: false } });
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClient;
};

const BUCKET = "PodcastApp";

// Helper to upload JSON to Supabase
export const writeJSON = async <T>(path: string, data: T): Promise<void> => {
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, JSON.stringify(data, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) throw new Error(`Supabase Write Error (${path}): ${error.message}`);
};

// Helper to read JSON from Supabase
const readJSON = async <T>(path: string): Promise<T> => {
  const { data, error } = await getSupabase().storage.from(BUCKET).download(path);

  if (error) throw new Error(`Supabase Read Error (${path}): ${error.message}`);

  const text = await data.text();
  return JSON.parse(text) as T;
};

// ... (keep logic same, replace 'supabase' with 'getSupabase()') ...

// New Helper: Upload generic files (mp3, md)
export const saveJobFile = async (
  jobId: string,
  filename: string, // e.g. "podcast.mp3"
  content: string | Buffer | Blob,
  contentType: string,
): Promise<string> => {
  const path = `${jobId}/${filename}`;
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, content, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Supabase Upload Error (${filename}): ${error.message}`);

  // Return public URL
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// Helper: Get public URL for a file
export const getJobFileUrl = (jobId: string, filename: string): string => {
  const path = `${jobId}/${filename}`;
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};
