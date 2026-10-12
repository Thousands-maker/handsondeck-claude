// Prepares Supercharged mode for publishing alongside the app.
//
// Runs in the GitHub Actions build, never in the browser. It:
//   1. bundles the WebLLM engine into one local file (vendor/web-llm.js), so the app
//      never loads code from a CDN;
//   2. downloads the chosen model's weights and its WebGPU runtime, checking every file
//      against the SHA-256 the model host publishes where one exists;
//   3. writes models/manifest.json listing every file with its size and SHA-256, which
//      the app checks each download against before anything is used.
//
// Usage: node tools/prepare-model.mjs <site-dir>
// Env:   MODEL_ID     WebLLM prebuilt model id (default below)
//        MODEL_CACHE  folder reused between builds (default .model-cache)

import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createRequire } from "node:module";

const DEFAULT_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const MODEL_ID = (process.env.MODEL_ID || DEFAULT_MODEL).trim();
const SITE = path.resolve(process.argv[2] || "_site");
const CACHE = path.resolve(process.env.MODEL_CACHE || ".model-cache");
const require = createRequire(import.meta.url);

function log(...a) { console.log("[prepare-model]", ...a); }

async function sha256File(p) {
  const h = crypto.createHash("sha256");
  const fh = await fs.open(p);
  for await (const chunk of fh.createReadStream()) h.update(chunk);
  return h.digest("hex");
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function download(url, dest, expectSha) {
  if (await exists(dest)) {
    if (!expectSha || (await sha256File(dest)) === expectSha) return;
    log("cached copy failed its check, downloading again:", path.basename(dest));
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const tmp = dest + ".part";
      await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
      if (expectSha) {
        const got = await sha256File(tmp);
        if (got !== expectSha) throw new Error(`SHA-256 mismatch for ${url}: ${got} != ${expectSha}`);
      }
      await fs.rename(tmp, dest);
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      log(`retrying (${attempt}) ${url}: ${err.message}`);
    }
  }
}

async function copyInto(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

// ---- 1. engine ----
globalThis.self ??= globalThis;
const pkgJson = JSON.parse(await fs.readFile(require.resolve("@mlc-ai/web-llm/package.json"), "utf8"));
const webllm = await import("@mlc-ai/web-llm");
const record = webllm.prebuiltAppConfig.model_list.find((m) => m.model_id === MODEL_ID);
if (!record) {
  const similar = webllm.prebuiltAppConfig.model_list.map((m) => m.model_id)
    .filter((id) => /0\.5B|1B|1\.5B|Qwen|Llama-3\.2|gemma/i.test(id));
  throw new Error(`Model ${MODEL_ID} isn't in WebLLM ${pkgJson.version}. Small options: ${similar.join(", ")}`);
}
log("engine", pkgJson.version, "model", MODEL_ID);

const esbuild = await import("esbuild");
const enginePath = path.join(SITE, "vendor", "web-llm.js");
await fs.mkdir(path.dirname(enginePath), { recursive: true });
await esbuild.build({
  stdin: { contents: 'export * from "@mlc-ai/web-llm";', resolveDir: process.cwd(), loader: "js" },
  bundle: true, format: "esm", platform: "browser", target: "es2020", minify: true,
  outfile: enginePath, logLevel: "warning",
});

// ---- 2. model weights and runtime ----
const hfMatch = /huggingface\.co\/([^/]+\/[^/]+)/.exec(record.model);
if (!hfMatch) throw new Error("Unexpected model location: " + record.model);
const repo = hfMatch[1];
const treeRes = await fetch(`https://huggingface.co/api/models/${repo}/tree/main?recursive=true`);
if (!treeRes.ok) throw new Error(`Couldn't list ${repo}: HTTP ${treeRes.status}`);
const tree = (await treeRes.json()).filter((f) => f.type === "file" && f.path !== ".gitattributes");
let license = null;
try {
  const info = await (await fetch(`https://huggingface.co/api/models/${repo}`)).json();
  license = (info.cardData && info.cardData.license) || null;
} catch { /* optional */ }

const modelRel = `models/${MODEL_ID}/`;
const files = [];
for (const f of tree) {
  const cached = path.join(CACHE, MODEL_ID, f.path);
  const expect = f.lfs && f.lfs.oid ? f.lfs.oid : null;
  await download(`https://huggingface.co/${repo}/resolve/main/${f.path}`, cached, expect);
  // WebLLM looks for files under <model>/resolve/main/, so publish them there.
  const rel = `${modelRel}resolve/main/${f.path}`;
  await copyInto(cached, path.join(SITE, rel));
  const stat = await fs.stat(cached);
  files.push({ path: rel, size: stat.size, sha256: await sha256File(cached) });
}

const libName = path.basename(new URL(record.model_lib).pathname);
const libCached = path.join(CACHE, "lib", libName);
await download(record.model_lib, libCached, null);
const libRel = `models/lib/${libName}`;
await copyInto(libCached, path.join(SITE, libRel));
files.push({ path: libRel, size: (await fs.stat(libCached)).size, sha256: await sha256File(libCached) });

const engineStat = await fs.stat(enginePath);
files.unshift({ path: "vendor/web-llm.js", size: engineStat.size, sha256: await sha256File(enginePath), keep: true });

// ---- 3. manifest ----
const published = { ...record, model: modelRel, model_lib: libRel };
const manifest = {
  generatedAt: new Date().toISOString(),
  engine: { name: "WebLLM", version: pkgJson.version, path: "vendor/web-llm.js" },
  model: {
    id: MODEL_ID,
    name: MODEL_ID.replace(/-q\w+-MLC$/, "").replace(/-/g, " "),
    source: `https://huggingface.co/${repo}`,
    license,
    record: published,
  },
  totalBytes: files.reduce((n, f) => n + f.size, 0),
  files,
};
await fs.writeFile(path.join(SITE, "models", "manifest.json"), JSON.stringify(manifest, null, 2));
log(`published ${files.length} files, ${(manifest.totalBytes / 1048576).toFixed(0)} MB`);
