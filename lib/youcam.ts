import type { SkinAnalysis, SkinMetrics } from "@/types/dermshield";

/**
 * YouCam Skin AI adapter.
 *
 * Server-side only (it reads process.env.YOUCAM_API_KEY). The browser talks to
 * it through app/api/analyze/route.ts so the key is never exposed.
 *
 */

export interface AnalyzeInput {
  imageBytes?: Uint8Array;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
}

/** A problem with the photo itself (not our server): safe to show to the user. */
export class YouCamUserError extends Error {}

const FRIENDLY_ERRORS: Record<string, string> = {
  error_src_face_too_small: "Your face is too small in the photo. Move closer so it fills more of the frame.",
  error_src_face_out_of_bound: "Part of your face is outside the photo. Keep your forehead, cheeks and chin in view.",
  error_src_no_face: "We couldn't find a face in that photo. Try a clear, front-facing selfie.",
  error_lighting_dark: "The lighting is too dim. Try a brighter spot.",
  error_below_min_image_size: "That photo is too small. Please use a higher-resolution image.",
  error_exceed_max_image_size: "That photo is too large. Please use a smaller image.",
  error_invalid_params: "That image format isn't supported. Please use a JPG or PNG.",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Map a raw YouCam Skin Analysis payload to DermShield metrics.
 *
 * ASSUMPTION: YouCam reports per-concern scores where HIGHER = HEALTHIER, so
 * redness/texture are inverted here. Verify against the payload your plan returns.
 */
export function mapYouCamPayload(raw: {
  redness?: { score: number };
  texture?: { score: number };
  moisture?: { score: number };
}): SkinMetrics {
  return {
    redness: clamp(100 - (raw.redness?.score ?? 50)),
    roughness: clamp(100 - (raw.texture?.score ?? 50)),
    hydration: clamp(raw.moisture?.score ?? 50),
  };
}

const BASE = (process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com").replace(/\/$/, "");

async function youcam(path: string, apiKey: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const code: string | undefined = json?.error_code ?? json?.error ?? json?.data?.error;
    if (code && FRIENDLY_ERRORS[code]) throw new YouCamUserError(FRIENDLY_ERRORS[code]);
    throw new Error(`YouCam ${path} -> ${res.status} ${text.slice(0, 200)}`);
  }
  return json;
}

/**
 * Live YouCam Skin AI call (server-side only):
 * 1) ask for an upload slot, 2) PUT the photo, 3) start the skin-analysis task, 4) poll to "success".
 * Scores are 0-100 where HIGHER = healthier, which mapYouCamPayload() inverts for redness/texture.
 */
async function callYouCamLive(input: AnalyzeInput, apiKey: string): Promise<SkinMetrics> {
  if (!input.imageBytes) throw new Error("No image bytes to analyse.");
  const contentType = input.contentType || "image/jpeg";

  const init = await youcam("/s2s/v2.0/file/skin-analysis", apiKey, {
    method: "POST",
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: input.fileName || "scan.jpg", file_size: input.imageBytes.length }],
    }),
  });
  const file = init?.data?.files?.[0];
  const slot = file?.requests?.[0];
  if (!file?.file_id || !slot?.url) throw new Error("YouCam returned no upload slot.");

  const putHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries((slot.headers ?? {}) as Record<string, string>)) {
    if (!["host", "content-length"].includes(k.toLowerCase())) putHeaders[k] = v;
  }
  const put = await fetch(slot.url, {
    method: "PUT",
    headers: putHeaders,
    body: input.imageBytes as unknown as BodyInit,
    signal: AbortSignal.timeout(30_000),
  });
  if (!put.ok) throw new Error(`YouCam photo upload failed (${put.status}).`);

  const task = await youcam("/s2s/v2.0/task/skin-analysis", apiKey, {
    method: "POST",
    body: JSON.stringify({
      src_file_id: file.file_id,
      dst_actions: ["redness", "texture", "moisture"],
      format: "json",
    }),
  });
  const taskId: string | undefined = task?.data?.task_id;
  if (!taskId) throw new Error("YouCam returned no task id.");

  const deadline = Date.now() + 60_000;
  let delay = 1200;
  while (Date.now() < deadline) {
    await sleep(delay);
    delay = Math.min(delay + 400, 3000);
    const poll = await youcam(`/s2s/v2.0/task/skin-analysis/${taskId}`, apiKey);
    const status: string | undefined = poll?.data?.task_status;
    if (status === "success") {
      const output: Array<{ type?: string; ui_score?: number; raw_score?: number }> =
        poll?.data?.results?.output ?? [];
      const score = (type: string) => {
        const o = output.find((x) => x.type === type);
        return o ? (o.ui_score ?? o.raw_score) : undefined;
      };
      return mapYouCamPayload({
        redness: { score: score("redness") ?? 50 },
        texture: { score: score("texture") ?? 50 },
        moisture: { score: score("moisture") ?? 50 },
      });
    }
    if (status === "error" || status === "failed") {
      const code: string | undefined = poll?.data?.error ?? poll?.data?.error_code;
      if (code && FRIENDLY_ERRORS[code]) throw new YouCamUserError(FRIENDLY_ERRORS[code]);
      throw new Error(`YouCam task failed: ${code ?? poll?.data?.error_message ?? "unknown"}`);
    }
  }
  throw new Error("YouCam analysis timed out.");
}

export async function analyzeSkin(input: AnalyzeInput): Promise<SkinAnalysis> {
  const started = Date.now();
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) throw new Error("YOUCAM_API_KEY is not configured on the server.");

  const metrics = await callYouCamLive(input, apiKey);
  return {
    metrics,
    source: "youcam-live",
    latencyMs: Date.now() - started,
    capturedAt: new Date().toISOString(),
  };
}
