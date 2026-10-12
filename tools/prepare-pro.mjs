// Prepares Supercharged Pro for publishing.
//
// Runs in the GitHub Actions build, never in the browser. The Pro model is too large for
// GitHub Pages, so it is NOT copied here: people download it directly from the model
// maker's official Hugging Face repository, and the app says so before they do. What this
// script publishes on this site is everything needed to make that download trustworthy
// and offline-capable:
//   1. the Transformers.js engine and its ONNX Runtime files, bundled locally so the app
//      never loads code from a CDN;
//   2. models/pro-manifest.json: the repository pinned to one exact commit, and every file
//      the app will download with its size and SHA-256. The app checks each download
//      against these fingerprints, so a file that changes upstream is rejected.
//
// Usage: node tools/prepare-pro.mjs <site-dir>
// Reads "pro" in supercharged.json: { "repo", "dtype", "enabled" }.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const SITE = path.resolve(process.argv[2] || "_site");
const require = createRequire(import.meta.url);
const log = (...a) => console.log("[prepare-pro]", ...a);

const config = JSON.parse(await fs.readFile("supercharged.json", "utf8"));
const pro = config.pro || {};
if (pro.enabled === false) { log("Supercharged Pro is switched off in supercharged.json"); process.exit(0); }
const REPO = pro.repo || "mistralai/Ministral-3-3B-Instruct-2512-ONNX";
const DTYPE = pro.dtype || "q4f16";
const HOST = "https://huggingface.co/";

async function sha256Of(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }
async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// ---- 1. engine and runtime, served from this site ----
const tfPkgPath = require.resolve("@huggingface/transformers/package.json");
const tfDir = path.dirname(tfPkgPath);
const tfPkg = JSON.parse(await fs.readFile(tfPkgPath, "utf8"));
const candidates = ["transformers.web.min.js", "transformers.min.js", "transformers.web.js", "transformers.js"];
let entry = null;
for (const c of candidates) {
  try { await fs.access(path.join(tfDir, "dist", c)); entry = path.join(tfDir, "dist", c); break; } catch {}
}
if (!entry) throw new Error("Couldn't find the Transformers.js browser build in " + path.join(tfDir, "dist"));

const esbuild = await import("esbuild");
const enginePath = path.join(SITE, "vendor", "transformers.js");
await fs.mkdir(path.dirname(enginePath), { recursive: true });
await esbuild.build({
  entryPoints: [entry], bundle: true, format: "esm", platform: "browser", target: "es2020",
  outfile: enginePath, logLevel: "warning",
  external: ["fs", "path", "url", "sharp", "onnxruntime-node", "node:*"],
});

const ortPkg = require.resolve("onnxruntime-web/package.json", { paths: [tfDir] });
const ortDist = path.join(path.dirname(ortPkg), "dist");
const ortOut = path.join(SITE, "vendor", "ort");
await fs.mkdir(ortOut, { recursive: true });
const localFiles = [];
for (const name of await fs.readdir(ortDist)) {
  if (!/^ort-wasm-simd-threaded.*\.(wasm|mjs)$/.test(name)) continue;
  await fs.copyFile(path.join(ortDist, name), path.join(ortOut, name));
}
for (const [rel, abs] of [["vendor/transformers.js", enginePath],
  ...(await fs.readdir(ortOut)).map((n) => [`vendor/ort/${n}`, path.join(ortOut, n)])]) {
  const buf = await fs.readFile(abs);
  localFiles.push({ path: rel, size: buf.length, sha256: await sha256Of(buf), keep: true });
}

// ---- 2. the model, pinned to one commit, with fingerprints ----
const info = await getJson(`${HOST}api/models/${REPO}`);
const revision = info.sha;
const tree = await getJson(`${HOST}api/models/${REPO}/tree/${revision}?recursive=true`);
const files = tree.filter((f) => f.type === "file");

const wantedOnnx = (p) => {
  const m = /^onnx\/(embed_tokens|vision_encoder|decoder_model_merged)_([a-z0-9]+)\.onnx(_data(_\d+)?)?$/.exec(p);
  return m && m[2] === DTYPE;
};
const wantedRoot = (p) => !p.includes("/") && !/^(README\.md|\.gitattributes)$/i.test(p) &&
  /\.(json|jinja|txt|model)$/i.test(p);
const chosen = files.filter((f) => wantedOnnx(f.path) || wantedRoot(f.path));
if (!chosen.some((f) => /decoder_model_merged/.test(f.path))) {
  throw new Error(`No ${DTYPE} decoder found in ${REPO}. Check "dtype" in supercharged.json.`);
}

const remote = [];
for (const f of chosen) {
  const url = `${HOST}${REPO}/resolve/${revision}/${f.path}`;
  let sha = f.lfs && f.lfs.oid;
  let size = f.lfs ? f.lfs.size : f.size;
  if (!sha) {
    // Small non-LFS files: Hugging Face lists a git hash, not SHA-256, so fetch and hash.
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    const buf = Buffer.from(await r.arrayBuffer());
    sha = await sha256Of(buf); size = buf.length;
  }
  remote.push({ url, size, sha256: sha });
}

const remoteBytes = remote.reduce((n, f) => n + f.size, 0);
const localBytes = localFiles.reduce((n, f) => n + f.size, 0);
const name = REPO.split("/")[1].replace(/-ONNX$/, "").replace(/-\d{4}$/, "").replace(/-/g, " ");
const manifest = {
  generatedAt: new Date().toISOString(),
  engine: { name: "Transformers.js", version: tfPkg.version, path: "vendor/transformers.js", runtimePath: "vendor/ort/" },
  model: {
    id: REPO, name, repo: REPO, revision, dtype: DTYPE, host: HOST,
    publisher: /^mistralai\//.test(REPO) ? "Mistral AI (France)" : REPO.split("/")[0],
    source: `${HOST}${REPO}`,
    license: (info.cardData && info.cardData.license) || null,
    requiredFeatures: /f16/.test(DTYPE) ? ["shader-f16"] : [],
  },
  remoteBytes, localBytes, totalBytes: remoteBytes + localBytes,
  files: [...localFiles, ...remote],
};
await fs.mkdir(path.join(SITE, "models"), { recursive: true });
await fs.writeFile(path.join(SITE, "models", "pro-manifest.json"), JSON.stringify(manifest, null, 2));
log(`${REPO}@${revision.slice(0, 8)}: ${remote.length} files from Hugging Face, ` +
  `${(remoteBytes / 1048576).toFixed(0)} MB; engine ${(localBytes / 1048576).toFixed(0)} MB on this site`);
