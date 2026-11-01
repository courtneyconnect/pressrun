// Turns a Press Stop's sample episode into an 18-second vertical clip with the
// "Booked through Press Run" end card, and grabs a cover frame. Uses ffmpeg.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CLIP_SECONDS = 18;

async function run(cmd: string[]): Promise<string> {
  const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  if (code !== 0) throw new Error(`${cmd[0]} failed (${code}): ${err.slice(-600)}`);
  return out + err;
}

export async function probe(path: string): Promise<{ duration: number; hasAudio: boolean }> {
  const out = await run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", path]);
  const j = JSON.parse(out.slice(out.indexOf("{")));
  return { duration: Number(j.format?.duration ?? 0), hasAudio: (j.streams ?? []).some((s: { codec_type: string }) => s.codec_type === "audio") };
}

/** The preview is the first 18 seconds unless the Press Stop asks for another start ("start at 0:40"). Crops to 720×1280, evens out loudness, adds the end card. Returns MP4 bytes (H.264 + AAC). */
export async function makeClip(samplePath: string, endCardPng: Uint8Array, opts: { start?: number; seconds?: number } = {}): Promise<{ data: Uint8Array; start: number }> {
  const seconds = opts.seconds ?? CLIP_SECONDS;
  const { duration, hasAudio } = await probe(samplePath);
  const start = Math.max(0, Math.min(opts.start ?? 0, Math.max(0, duration - 1)));
  const len = Math.min(seconds, Math.max(1, duration - start));
  const dir = await mkdtemp(join(tmpdir(), "pressrun-clip-"));
  try {
    const endPath = join(dir, "end.png");
    const outPath = join(dir, "clip.mp4");
    await Bun.write(endPath, endCardPng);
    const audioIn = hasAudio ? "[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100,aformat=channel_layouts=stereo[a0]" : "[3:a]atrim=0:" + len + "[a0]";
    await run([
      "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
      "-ss", String(start), "-t", String(len), "-i", samplePath,
      "-loop", "1", "-t", "1", "-i", endPath,
      "-f", "lavfi", "-t", "1", "-i", "anullsrc=r=44100:cl=stereo",
      "-f", "lavfi", "-t", String(len), "-i", "anullsrc=r=44100:cl=stereo",
      "-filter_complex",
      `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,fps=30,format=yuv420p[v0];` +
      `[1:v]scale=720:1280,setsar=1,fps=30,format=yuv420p[v1];${audioIn};[v0][a0][v1][2:a]concat=n=2:v=1:a=1[v][a]`,
      "-map", "[v]", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-maxrate", "3M", "-bufsize", "6M", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outPath,
    ]);
    return { data: new Uint8Array(await Bun.file(outPath).arrayBuffer()), start };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A JPEG frame from the middle of a clip, for "use a frame" covers. */
export async function grabFrame(videoPath: string, at: number): Promise<Uint8Array> {
  const dir = await mkdtemp(join(tmpdir(), "pressrun-frame-"));
  try {
    const out = join(dir, "frame.jpg");
    await run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", String(at), "-i", videoPath, "-frames:v", "1", "-vf", "scale=1080:-2", "-q:v", "3", out]);
    return new Uint8Array(await Bun.file(out).arrayBuffer());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export class SampleUnavailable extends Error {
  constructor(public link: string) { super(`Couldn't open ${link}`); }
}

/** Gets an attached video onto disk (a URL from the iMessage provider, or a local path in tests). */
export async function fetchSample(sample: { url?: string; mediaUrl?: string }, dir: string): Promise<string> {
  const src = sample.mediaUrl ?? sample.url ?? "";
  if (!sample.mediaUrl) throw new SampleUnavailable(src); // Downloading from links isn't built yet.
  if (src.startsWith("file://") || src.startsWith("/")) {
    const path = src.replace(/^file:\/\//, "");
    if (!(await Bun.file(path).exists())) throw new SampleUnavailable(src);
    return path;
  }
  const res = await fetch(src).catch(() => null);
  if (!res?.ok) throw new SampleUnavailable(src);
  const path = join(dir, `sample-${crypto.randomUUID()}.mp4`);
  await Bun.write(path, await res.arrayBuffer());
  return path;
}
