#!/usr/bin/env node
/**
 * HandsOnDeck MCP server — appendix artefact for Part 5.
 *
 * Speaks JSON-RPC 2.0 over stdio, which is why it cannot live inside the
 * browser prototype: that file has no server and makes no network calls, and
 * that constraint is the reason it can be demonstrated on a government machine.
 * The two share the same slide-plan structure, so a plan produced here renders
 * in the prototype unchanged.
 *
 * Exposes all three MCP primitives:
 *   tools     — actions an agent executes
 *   resources — read-only context an agent reads
 *   prompts   — reusable structures an agent works to
 *
 * Deliberately absent: any tool that sends, shares or files a deck. Release
 * stays with a human in the native product.
 *
 * Run:  node handsondeck-mcp-server.js
 */

"use strict";

/* ---------------- shared plan logic (same rules as the prototype) ---------------- */

const TEMPLATE_LABELS = ["Why we are here", "The ask", "Untitled briefing"];

const STYLES = {
  operational: { accent: "#4b2e83", head: "44px", body: "25px", lead: 1.45, gap: "16px" },
  executive:   { accent: "#1d3f5e", head: "60px", body: "32px", lead: 1.6,  gap: "26px" },
  workshop:    { accent: "#00707a", head: "50px", body: "28px", lead: 1.7,  gap: "21px" }
};

function esc(s){
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function createDeckPlan(brief){
  const title = (brief.title || "").trim();
  const purpose = (brief.purpose || "").trim();
  const audience = (brief.audience || "").trim();
  const raw = brief.key_messages || "";
  const style = STYLES[brief.style] ? brief.style : "operational";

  const messages = [];
  for (const line of raw.split("\n")){
    if (!line.trim()) continue;
    const isSupport = /^\s+/.test(line) || /^\s*[-*\u2022]/.test(line);
    const text = line.replace(/^\s*[-*\u2022]\s*/, "").trim();
    if (!text) continue;
    if (isSupport && messages.length) messages[messages.length - 1].support.push(text);
    else messages.push({ headline: text, support: [] });
  }

  const slides = [{ type: "title", title: title || "Untitled briefing", subtitle: audience }];
  if (purpose) slides.push({ type: "context", title: "Why we are here", support: [purpose] });
  for (const m of messages) slides.push({ type: "point", title: m.headline, support: m.support });
  slides.push({ type: "close", title: "The ask", support: [purpose || "Decision requested."] });

  const warnings = [];
  if (!messages.length) warnings.push("No key messages found.");
  for (const m of messages){
    if (m.headline.length > 120) warnings.push(`Headline too long for one slide: "${m.headline.slice(0,60)}…"`);
    if (!m.support.length) warnings.push(`No supporting points under: "${m.headline.slice(0,60)}"`);
  }
  if (messages.length > 9) warnings.push(`${messages.length} content slides — consider consolidating to nine or fewer.`);

  return {
    meta: { title, purpose, audience, style, generated: new Date().toISOString(),
            /* the brief is carried with the plan so any later revision can still be
               checked against what the officer actually wrote */
            sourceText: [title, purpose, audience, raw].join("\n"),
            contentCheck: checkContent(slides, [title, purpose, audience, raw].join("\n")) },
    slides,
    warnings
  };
}

/* The no-new-claims guarantee, enforced server-side as well as in the product.
   An agent cannot use this server to introduce content the officer did not write. */
function checkContent(slides, sourceText){
  const source = String(sourceText).toLowerCase();
  let traced = 0, templated = 0;
  const notTraced = [];
  const check = (str) => {
    if (!str) return;
    if (TEMPLATE_LABELS.includes(str)){ templated++; return; }
    if (source.includes(String(str).toLowerCase())) traced++;
    else notTraced.push(str);
  };
  for (const s of slides){
    check(s.title); check(s.subtitle);
    (s.support || []).forEach(check);
  }
  return { tracedToBrief: traced, templateLabels: templated, notTraced };
}

function slideMarkup(plan){
  return plan.slides.map((s, i) => {
    let body = "";
    if (s.type === "title"){
      body = s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : "";
    } else if (s.support && s.support.length){
      body = "<ul>" + s.support.map(x => `<li>${esc(x)}</li>`).join("") + "</ul>";
    }
    const tag = (s.type === "title" && plan.meta.version)
      ? `<p class="vtag">Version ${plan.meta.version}</p>` : "";
    return `<section class="slide ${s.type}" data-i="${i}">${tag}<h3>${esc(s.title)}</h3>${body}</section>`;
  }).join("");
}

function renderDeck(plan){
  const st = STYLES[plan.meta.style] || STYLES.operational;
  const css = [
    "*{box-sizing:border-box}",
    "html,body{margin:0;padding:0;height:100%}",
    "body{font-family:'Segoe UI',-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#14161a;background:#fff}",
    ".slide{display:none;height:100vh;padding:6% 7%;flex-direction:column;justify-content:center}",
    ".slide.on{display:flex}",
    `.slide h3{font-size:${st.head};line-height:1.15;margin:0 0 ${st.gap};font-weight:600;max-width:22ch}`,
    `.slide.title{background:${st.accent};color:#fff;position:relative}`,
    `.slide:not(.title) h3{border-left:5px solid ${st.accent};padding-left:16px}`,
    `.sub{font-size:${st.body};opacity:.85;margin:0}`,
    ".vtag{position:absolute;top:6%;right:7%;margin:0;letter-spacing:.08em;text-transform:uppercase;opacity:.7}",
    "ul{margin:0;padding-left:22px}",
    `li{font-size:${st.body};line-height:${st.lead};margin-bottom:${st.gap};max-width:52ch}`,
    ".nav{position:fixed;bottom:18px;right:22px;font-size:14px;color:#666}",
    "@page{size:A4 landscape;margin:0}",
    "@media print{.nav{display:none}",
    ".slide{display:flex!important;height:100vh;page-break-after:always;break-after:page}",
    ".slide:last-child{page-break-after:auto;break-after:auto}}"
  ].join("\n");

  const js = [
    "var slides=document.querySelectorAll('.slide');var i=0;var nv=document.getElementById('nav');",
    "function show(n){if(n<0||n>=slides.length)return;slides[i].classList.remove('on');i=n;",
    "slides[i].classList.add('on');nv.textContent=(i+1)+' / '+slides.length;}",
    "document.addEventListener('keydown',function(e){",
    "if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();show(i+1);}",
    "if(e.key==='ArrowLeft'){e.preventDefault();show(i-1);}});",
    "slides[0].classList.add('on');nv.textContent='1 / '+slides.length;"
  ].join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${esc(plan.meta.title || "Briefing")}</title><style>${css}</style></head><body>` +
    slideMarkup(plan) + `<div class="nav" id="nav"></div><script>${js}<\/script></body></html>`;
}

/* Structural edits only. The instruction set matches what the interface can do,
   so an agent has no capability a person lacks. */
function revisePlan(plan, instruction){
  const p = JSON.parse(JSON.stringify(plan));
  const t = String(instruction).toLowerCase();
  const points = p.slides.map((s, i) => s.type === "point" ? i : -1).filter(i => i >= 0);
  let m, applied;

  if ((m = t.match(/style (?:to )?(operational|executive|workshop)/))){
    p.meta.style = m[1];
    applied = `Style set to ${m[1]}.`;
  } else if ((m = t.match(/(?:cut|reduce|trim)(?:[a-z ]*)to (\d+) slides?/))){
    const fixed = p.slides.length - points.length;
    const keep = Math.max(1, parseInt(m[1], 10) - fixed);
    const drop = points.slice(keep);
    for (let i = drop.length - 1; i >= 0; i--) p.slides.splice(drop[i], 1);
    applied = `Removed ${drop.length} key message slide(s); ${p.slides.length} slides remain.`;
  } else if ((m = t.match(/(?:delete|remove|drop) slide (\d+)/))){
    const n = parseInt(m[1], 10) - 1;
    if (!p.slides[n]) throw new Error(`No slide ${n + 1}.`);
    if (p.slides[n].type === "title") throw new Error("The title slide cannot be deleted.");
    p.slides.splice(n, 1);
    applied = `Deleted slide ${n + 1}.`;
  } else if ((m = String(instruction).match(/(?:make|retitle|change) slide (\d+) (?:say|to say|about) (.+)$/i))){
    const n = parseInt(m[1], 10) - 1;
    if (!p.slides[n]) throw new Error(`No slide ${n + 1}.`);
    p.slides[n].title = m[2].trim();
    applied = `Headline on slide ${n + 1} updated.`;
  } else if ((m = String(instruction).match(/add (?:to )?slide (\d+)\s*:\s*(.+)$/i))){
    const n = parseInt(m[1], 10) - 1;
    if (!p.slides[n] || p.slides[n].type === "title") throw new Error(`Cannot add a point to slide ${n + 1}.`);
    (p.slides[n].support = p.slides[n].support || []).push(m[2].trim());
    applied = `Supporting point added to slide ${n + 1}.`;
  } else {
    throw new Error("Unrecognised instruction. Supported: change style, cut to N slides, " +
      "delete slide N, make slide N say …, add to slide N: …");
  }

  /* Re-run the check. Anything the instruction introduced that the officer never
     wrote is reported rather than silently accepted. */
  const source = [p.meta.sourceText || "", String(instruction)].join("\n");
  p.meta.sourceText = source;
  p.meta.contentCheck = checkContent(p.slides, source);
  return { plan: p, applied };
}

/* Critique only — never mutates. */
/* Read-only inspection. An agent about to revise a plan should be able to look at it
   first without re-deriving it from the rendered HTML, and without any call that could
   change it. Returns the plan's shape, not its rendering. */
function readDeckPlan(plan){
  if (!plan || !Array.isArray(plan.slides)) throw new Error("plan is missing or has no slides");
  const meta = plan.meta || {};
  return {
    meta: {
      title: meta.title || null,
      purpose: meta.purpose || null,
      audience: meta.audience || null,
      style: meta.style || null,
      version: meta.version || 0,
      contentCheck: meta.contentCheck || null
    },
    slideCount: plan.slides.length,
    outline: plan.slides.map((s, i) => ({
      n: i + 1,
      type: s.type,
      title: s.title,
      support: s.support || (s.subtitle ? [s.subtitle] : [])
    }))
  };
}

function reviewDeck(plan){
  const findings = [];
  const points = plan.slides.filter(s => s.type === "point");
  if (points.length > 9) findings.push({ severity: "advisory", note: `${points.length} content slides; consider consolidating to nine or fewer.` });
  for (const s of points){
    if (s.title.length > 120) findings.push({ severity: "advisory", slide: s.title.slice(0, 50), note: "Headline too long for one slide." });
    if (!s.support || !s.support.length) findings.push({ severity: "advisory", slide: s.title.slice(0, 50), note: "No supporting points." });
  }
  const close = plan.slides[plan.slides.length - 1];
  if (!close || close.type !== "close" || !close.support || !close.support[0])
    findings.push({ severity: "structural", note: "No closing slide stating the ask." });
  const cc = plan.meta.contentCheck;
  if (cc && cc.notTraced && cc.notTraced.length)
    findings.push({ severity: "blocking", note: `${cc.notTraced.length} item(s) do not trace back to the brief.`, items: cc.notTraced });
  return { slideCount: plan.slides.length, findings,
           verdict: findings.some(f => f.severity === "blocking") ? "not ready to send" :
                    findings.length ? "sendable, with advisories" : "structurally sound" };
}

/* ---------------- MCP surface ---------------- */

const TOOLS = [
  { name: "create_deck_plan",
    description: "Turn a plain-language brief into a structured slide plan. The plan is the source of truth; render_preview reads from it.",
    inputSchema: { type: "object", required: ["key_messages"], properties: {
      title: { type: "string", description: "Deck title." },
      purpose: { type: "string", description: "What should happen after this deck — becomes the context slide and the ask." },
      audience: { type: "string", description: "Who it is for." },
      key_messages: { type: "string", description: "One message per line; a line starting with a dash is a supporting point under the message above." },
      style: { type: "string", enum: ["operational", "executive", "workshop"] } } } },

  { name: "render_preview",
    description: "Render a slide plan as a self-contained HTML preview with no external dependencies. Returns the file contents for confirmation; it does not approve, store, send or release anything. Release stays in the native product.",
    inputSchema: { type: "object", required: ["plan"], properties: { plan: { type: "object" } } } },

  { name: "revise_deck_plan",
    description: "Apply one structural edit to a slide plan and return the revised plan. Structure only — it cannot introduce content the officer did not write.",
    inputSchema: { type: "object", required: ["plan", "instruction"], properties: {
      plan: { type: "object" },
      instruction: { type: "string", description: "e.g. 'cut to 5 slides', 'delete slide 4', 'make slide 3 say …', 'add to slide 2: …', 'style executive'." } } } },

  { name: "review_deck",
    description: "Critique a slide plan against structural and content-provenance rules. Read-only: never mutates the plan.",
    inputSchema: { type: "object", required: ["plan"], properties: { plan: { type: "object" } } } },

  { name: "read_deck_plan",
    description: "Return the shape of a slide plan — meta, slide count and a numbered outline — so a plan can be inspected before it is revised. Read-only: never mutates the plan and never renders it.",
    inputSchema: { type: "object", required: ["plan"], properties: { plan: { type: "object" } } } }
];

const RESOURCES = [
  { uri: "handsondeck://house-style", name: "House style", mimeType: "application/json",
    description: "Approved styles and the structural rules every deck follows." },
  { uri: "handsondeck://structure-rules", name: "Structural rules", mimeType: "text/plain",
    description: "What a briefing must contain: context derived from purpose, one slide per key message, a closing slide stating the ask." }
];

const PROMPTS = [
  { name: "decision_brief",
    description: "The shape of a proposal seeking a management decision or approval — the staff officer's recurring artefact.",
    arguments: [{ name: "subject", description: "What the decision is about.", required: true },
                { name: "audience", description: "Who decides.", required: false }] },
  { name: "incident_report",
    description: "The shape of an operations or incident report — for the frontline officer who reports occasionally and has no template.",
    arguments: [{ name: "subject", description: "The incident or operation being reported.", required: true }] },
  { name: "exec_summary",
    description: "Condense an existing slide plan for a more senior audience, preserving the ask.",
    arguments: [{ name: "max_slides", description: "Target slide count.", required: false }] }
];

/* Prompts encode structure, never content. They tell an agent what a briefing of
   this kind contains; the officer still supplies every fact. */
function promptText(name, args){
  const a = args || {};
  if (name === "decision_brief"){
    return `Help the officer assemble a briefing that seeks a decision on: ${a.subject || "[subject]"}.` +
      (a.audience ? ` The decision-maker is ${a.audience}.` : "") + `

Collect from the officer, in their own words:
1. The decision or approval being sought, stated in one sentence.
2. The situation that makes it necessary now.
3. The evidence supporting it, with figures where they have them.
4. The options considered and why the recommended one is preferred.
5. The constraints or risks a decision-maker should know about.

Then call create_deck_plan with their words. Do not supply facts, figures or
justifications they did not give you. If something essential is missing, ask for
it rather than filling the gap.`;
  }
  if (name === "incident_report"){
    return `Help the officer report on: ${a.subject || "[subject]"}.

This officer knows the operational substance and does not write briefings often,
so ask for the content in the order it happened rather than in slide order:
1. What occurred, and when.
2. What action was taken, by whom.
3. The outcome, and current status.
4. What is still outstanding, and what is being asked of the reader.

Then call create_deck_plan with their words. Do not characterise, grade or
interpret the incident. Do not add facts. If the material is operational or
classified, stop and tell the officer this route is not accredited for it.`;
  }
  if (name === "exec_summary"){
    return `Condense an existing slide plan to ${a.max_slides || "five"} slides for a more senior audience.

Use revise_deck_plan. Keep the closing slide stating the ask, and keep the strongest
supporting evidence for each retained message. Remove detail, never conclusions.
Do not rewrite the argument into something the officer did not make, and report
what was dropped so they can put it back.`;
  }
  throw new Error(`Unknown prompt: ${name}`);
}

/* ---------------- JSON-RPC over stdio ---------------- */

const ok = (result) => ({ result });
const text = (obj) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] });

function handle(method, params){
  switch (method){
    case "initialize":
      return ok({ protocolVersion: "2024-11-05",
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "handsondeck", version: "0.1.0" } });

    case "tools/list":     return ok({ tools: TOOLS });
    case "resources/list": return ok({ resources: RESOURCES });
    case "prompts/list":   return ok({ prompts: PROMPTS });

    case "prompts/get":
      return ok({ description: (PROMPTS.find(p => p.name === params.name) || {}).description,
                  messages: [{ role: "user", content: { type: "text", text: promptText(params.name, params.arguments) } }] });

    case "resources/read": {
      if (params.uri === "handsondeck://house-style")
        return ok({ contents: [{ uri: params.uri, mimeType: "application/json", text: JSON.stringify(STYLES, null, 2) }] });
      if (params.uri === "handsondeck://structure-rules")
        return ok({ contents: [{ uri: params.uri, mimeType: "text/plain", text:
          "Every deck: a title slide; a context slide derived from the purpose; one slide per key message with its supporting points; a closing slide stating the ask. Supporting points stay attached to their message. No content appears that the officer did not write." }] });
      throw new Error(`Unknown resource: ${params.uri}`);
    }

    case "tools/call": {
      const a = params.arguments || {};
      switch (params.name){
        case "create_deck_plan":  return ok(text(createDeckPlan(a)));
        case "render_preview":    return ok(text(renderDeck(a.plan)));
        case "revise_deck_plan":  return ok(text(revisePlan(a.plan, a.instruction)));
        case "review_deck":       return ok(text(reviewDeck(a.plan)));
        case "read_deck_plan":    return ok(text(readDeckPlan(a.plan)));
        default: throw new Error(`Unknown tool: ${params.name}`);
      }
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0){
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let id = null;
    try {
      const req = JSON.parse(line);
      id = req.id;
      const out = handle(req.method, req.params || {});
      if (id !== undefined && id !== null)
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...out }) + "\n");
    } catch (err){
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id,
        error: { code: -32603, message: err.message } }) + "\n");
    }
  }
});

module.exports = { createDeckPlan, renderDeck, revisePlan, reviewDeck, readDeckPlan, promptText, TOOLS, RESOURCES, PROMPTS };
