# HandsOnDeck

Turn a plain-language brief into real HTML slides you can edit, version and send.

**Live:** https://thousands-maker.github.io/handsondeck-claude/

Deliberately small: one file, no build step, no dependencies, no server. It works
offline, it works from a USB stick, and nothing you type leaves your browser. An optional
on-device AI model (Supercharged mode) can be downloaded once from the same site; the app
works fully without it.

---

## The problem it was built for

Two groups of officers, chosen because they sit at opposite ends of one axis — how well
someone can describe what they need.

| | Staff officer / programme manager | Frontline officer |
| --- | --- | --- |
| Presents | Regularly | Occasionally, under duress |
| Can articulate what a good deck is | Yes | No — can only describe the last one that went badly |
| Real job to be done | Get a decision without rewriting the deck four times | Report what happened without it looking amateurish |
| Fails today by | Spending the thinking time on formatting | Starting from a colleague's old file and inheriting its structure |

The product takes the structure problem off both of them without taking away the
judgement about what to say. See [`docs/jtbd-and-user-stories.md`](docs/jtbd-and-user-stories.md)
for the full jobs-to-be-done analysis and the user stories with acceptance criteria.

---

## Two ways in

The app opens on a start screen, not on a filled-in form, and offers two paths that match
the two user groups:

- **Walk me through it** — five short questions for someone who knows what happened but
  not how to present it: who will be in the room, what you need from them, what happened
  (as up to four story beats — what changed, why it matters, what is in the way, what
  happens next — each with optional supporting detail), how it should look, then a review
  of everything before the deck is built. Every answer is written word for word into the
  same brief fields the form uses, so the content check still traces each line back to
  something the person typed.
- **I'll write the brief** — straight to the form and the deck, for someone who already
  knows their key messages.

In the guided path, *what happened* is a free-text box with the slides building live
underneath it. Paste an email or type it the way you'd say it, and as you write, your
sentences are sorted into slide cards — what happened, why it matters, what is in the
way, what happens next — with numbers and examples attached as bullets under the
sentence they back up, and a sentence that asks for a decision taken as the ask on the
last slide. It uses keyword rules, not a model, and never rewrites a sentence: it only
splits, sorts and places the person's own words, so the content check still holds. Each
card can be edited, removed or added to in place; once a card is edited by hand, live
sorting pauses (with a one-click *Re-sort from the text*) so manual changes are never
overwritten. For people who would rather be prompted, *answer four short questions
instead* gives four empty cards with a question on each.

The example briefing is never loaded on its own. It sits behind a button — *see a finished
example first* on the start screen, *Load example* on the brief, *Fill with example
answers* in the guided path — and loading it over a brief you have started can be undone.

---

## How it works

Three stages, with a structured plan in the middle rather than a jump straight from text
to HTML.

```
  Brief  ──────►  Slide plan (JSON)  ──────►  Rendered slides
 (a form)          the source of truth         (HTML on a stage)
                          ▲
                          │
      every edit writes here — inline edits, chat commands,
      slide deletion, undo — and syncs back to the brief
```

The middle stage is the whole design. Because the plan is the single source of truth:

- An edit made on a slide updates the plan **and the brief**, so nothing lives only in
  the rendered output.
- The chat surface and the form are two views of one object, so a change made in one
  survives being edited in the other.
- An agent reads and writes the plan, not the HTML. That is what the MCP server does.
- Undo is a plan snapshot, so it steps back through every kind of change uniformly.

### The content check

After every generation and every edit, each piece of text on every slide is traced back
to the brief. Anything that cannot be found there is listed as untraced.

This exists because the obvious failure mode of a tool like this is inventing a
confident sentence the officer never wrote and then having them present it. The check
**can fail**, and is meant to — a check that always passes tells you nothing.

Three labels are exempt as known scaffolding: *Why we are here*, *The ask*,
*Untitled briefing*. They are counted separately and reported as template labels.

---

## Supercharged mode — optional, on-device AI

On first visit the start screen asks how the app should run on this device:

- **Standard — ready now.** Everything above. Nothing to download.
- **Supercharged — one-time download.** Adds a small AI model (by default Qwen2.5 0.5B
  Instruct, about 300–400 MB) that runs in the browser on the device's graphics
  processor, through [WebLLM](https://github.com/mlc-ai/web-llm). It adds two things:
  - **Smarter sorting** of free text: the model reads each sentence and decides which
    slide it belongs on. Wording is still the person's own.
  - **Tighter headlines**: *✦ Tighten headlines* above the deck, or `tighten headlines` in
    chat, shortens long headlines to ten words or fewer. A shortened headline is only
    accepted if it is actually shorter, adds no number that wasn't in the person's text,
    and drops none of the numbers in the original. Accepted headlines are marked ✦ on the
    slide strip and counted separately by the content check until a person edits them,
    and Undo reverses the whole step.

### Supercharged Pro — Ministral 3 3B, laptops and desktops

A second, larger tier: **Ministral 3 3B Instruct** by Mistral AI (Apache 2.0), run through
[Transformers.js](https://huggingface.co/docs/transformers.js) on the device's graphics
processor, following Mistral's own published browser setup. It is about 2.7 GB (the
browser version includes the model's image encoder, which can't be left out), needs a
laptop or desktop with WebGPU and around 8 GB of memory, and is not offered on phones.

Because it is far over GitHub Pages' 1 GB limit, **it is downloaded directly from
Mistral AI's official Hugging Face repository, not from this site, and the screen says so
before anyone downloads**: Hugging Face sees the device's internet address and that the
model was downloaded, never anything typed. What this site publishes is
`models/pro-manifest.json`, which pins the repository to one exact commit and lists every
file with its SHA-256 — so each file is checked before use, and a file that changes
upstream is rejected — plus the Transformers.js engine and ONNX Runtime files, so no code
loads from a CDN. Set `"pro": { "enabled": false }` in `supercharged.json` to hide it.

Both tiers can be installed side by side; the top bar shows which is in use, and each can
be removed on its own.

How it stays safe and offline:

- **Same site only.** The model, its WebGPU runtime and the WebLLM engine are published on
  this site by the build workflow (below). The app never loads them from anywhere else.
- **Checked before use.** Each tier's manifest lists every file with its size and
  SHA-256. The app streams each file into storage while hashing it — so even a 2 GB file
  is checked without being held in memory — and marks it checked only if it matches; the
  service worker then hands the model nothing but checked copies. A file that fails the check
  is discarded and nothing is installed. Downloads can be paused, and resume where they
  stopped.
- **Offline afterwards.** Once installed, it runs with no connection. Text is only handed
  to the model inside the page.
- **Only where it can work.** A device check (WebGPU, required GPU features, memory hint,
  free storage) runs before the download is offered, and says plainly why not when it
  isn't. If the browser later clears the model, the app falls back to Standard and says so.
- **Removable.** *Remove from this device* deletes the model and its caches.

Limits worth stating: it is a small model, so it can misjudge; it is slower on phones; it
needs a reasonably recent browser with WebGPU; it only works from the hosted site, not a
saved copy of the file; and on iPhone the browser may clear stored data for sites that
aren't added to the home screen. GitHub Pages also has a soft bandwidth limit of about
100 GB a month, which at this model size is a few hundred first-time downloads.

### Publishing it

`.github/workflows/pages.yml` builds and publishes the site on every push to `main`.
GitHub's servers install the engine, bundle it into `vendor/web-llm.js`, download the
model weights and runtime (checking them against the model host's own SHA-256 where it
publishes one), and write the manifest — `tools/prepare-model.mjs` does the work.

### Swapping the model

The model is set in one place: `"model"` in [`supercharged.json`](supercharged.json).
Change it to another WebLLM model id and commit — on GitHub's website is fine — and the
site rebuilds with that model. The file lists tested options with who made each, its
licence and rough size:

| Model id | From | Licence | Size | Notes |
| --- | --- | --- | --- | --- |
| `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | Alibaba Qwen (China) | Apache 2.0 | ~300–400 MB | current default |
| `SmolLM2-360M-Instruct-q4f16_1-MLC` | Hugging Face (France/US) | Apache 2.0, open training data | ~250 MB | most transparent, weakest |
| `SmolLM2-1.7B-Instruct-q4f16_1-MLC` | Hugging Face (France/US) | Apache 2.0, open training data | ~1 GB | most transparent; laptops; near the Pages limit |
| `Llama-3.2-1B-Instruct-q4f16_1-MLC` | Meta (US) | Llama 3.2 community licence | ~700 MB | laptops and newer phones |

The build stops with a clear message if the id isn't one WebLLM packages (listing small
ones that are) or if the model would take the site past GitHub Pages' 1 GB limit. The
Supercharged screen shows each model's publisher before anyone downloads it. When the
model changes, people who installed the old one fall back to Standard, are told the site
now uses a different model, and the old one is removed from their device when they
download the new one.

One-time setting: **Settings → Pages → Build and deployment → Source: GitHub Actions.**

---

## Logo and page numbers

Every slide carries a logo slot. By default it is a neutral *Your logo* placeholder;
**Upload logo** in the brief replaces it on every slide with a PNG, JPG, SVG or WebP up to
500 KB, and *No logo* removes it. The image is stored inside the slide plan, so it travels
with downloaded and editable copies and comes back when a deck is reopened. Every slide
except the title slide shows its page number.

---

## Offline

The app works with no connection, and that is a design position rather than a side
effect.

- **No network calls at all.** No CDN, no fonts, no analytics, no API. Everything —
  parsing, structuring, rendering, versioning, download — runs in the page.
- **No model in the loop by default.** Supercharged mode is opt-in and runs on the
  device. Without it, the chat surface parses a fixed command set
  deterministically. That is a deliberate limit, not a stub: it demonstrates the surface
  and the shared source of truth without making the product depend on an external
  service, a network, or a per-call cost.
- **Cached after the first visit.** A service worker precaches the app, so the hosted
  version opens offline too. The status pill in the header reports connectivity and
  states that nothing changes when it drops.
- **Runs from a file.** Download `index.html` and open it directly. No server needed.
- **Decks are self-contained.** A downloaded deck is one HTML file with its own
  arrow-key navigation and print rules. It opens on any machine, forever, with nothing
  installed.

For an organisation handling operational content, the useful property is not that it
works on a plane. It is that nothing leaves the browser.

---

## Using it

1. Fill in the brief: title, purpose, audience, key messages, style.
   Indent a line or start it with a dash to make it a supporting point under the message
   above.
2. **Generate deck.**
3. Click any headline or bullet on the slide to edit it in place.
4. Refine by chat: `cut to 5 slides` · `delete slide 4` ·
   `make slide 3 say Latency is the binding constraint` ·
   `add to slide 2: measured over 11 weeks` · `style executive` ·
   `make the ask explicit` · `undo`
5. **Download** — version number increments whenever there are edits since the last save,
   and the version is stamped on the title slide, in the document title and in the
   filename.
6. **Send for editing** — saves a copy that carries its own editor and its own slide plan.
7. **Open a deck** — brings a version someone sent back into the app, structure intact.

Three styles change type scale, spacing and density, not just colour: operational
(dense, evidence-forward), executive (spare, one idea per slide), workshop
(conversational).

---

## Handing a deck to someone else

A deck usually has to survive other people. **Send for editing** produces a single HTML
file that carries the slide plan inside it and its own editor with it. Whoever receives
it opens the file, clicks a headline or a bullet, changes it, and presses Save a copy.
No install, no account, no sign-in, no connection.

```
  You ──► deck-v1-editable.html ──► them ──► deck-v2-editable.html ──► you
          plan travels inside           they edit in the file         Open a deck
                                        with nothing installed        restores it here
```

Their edits come back as **structure, not prose**. Because the plan rides along in the
file, reopening their version fills the brief back in, re-runs the content check against
it, and leaves you able to keep working — rather than handing you a reworded HTML file
you have to reconcile by eye.

Two consequences worth noticing. The version number increments on their save, so you can
tell whose copy you are looking at. And an edit someone else made that does not trace
back to the brief is flagged on reopening, exactly like one of your own.

This is also why the deck travels as a file rather than a link. Files already move
between officers through channels that are approved; a link needs somewhere to host the
content, and that is the moment the content leaves the building.

---

## The MCP server — optional, off by default

**What it is for:** connecting a live AI model, or an agentic AI agent, to HandsOnDeck.
It exposes the deck as tools — create a plan from a brief, revise it, review it, preview
it — so any MCP-capable assistant or agent can draft and refine decks through the same
structured plan the interface edits, with the same content check. That might be a cloud
assistant, an organisation's own internally hosted model, or an agent running a
multi-step workflow (gather notes → draft the deck → review → revise).

This is the third way to bring AI in, alongside the on-device tiers:

| | Standard | Supercharged / Pro | MCP server |
| --- | --- | --- | --- |
| AI | none — keyword rules | small model on the device | any live model or agent you connect |
| Where it runs | in the browser | in the browser | wherever that model or agent runs |
| Content leaves the device | never | never | to whatever you connect, by your choice |

The app itself does not use it: [`mcp/`](mcp/) is a separate process you start only when
you want a model or agent working on decks. Delete the folder and the app is unchanged.

That separation is deliberate. The guarantee that nothing leaves the browser holds
because the assistant integration is something you turn on, not something baked in.

[`mcp/handsondeck-mcp-server.js`](mcp/handsondeck-mcp-server.js) is a real
JSON-RPC-over-stdio MCP server, so an assistant works through the same plan object the
interface edits.

**Tools:** `create_deck_plan`, `revise_deck_plan`, `review_deck`, `render_preview`, `read_deck_plan`
**Resources:** `handsondeck://house-style`, `handsondeck://structure-rules`
**Prompts:** `decision_brief`, `incident_report`, `exec_summary`

The plan carries `meta.sourceText`, so provenance survives revision — a revised plan is
still checked against the original brief rather than against the revision instruction.
That bug was found and fixed during the build, and it is the reason the field exists.

```bash
node mcp/handsondeck-mcp-server.js
```

Requires Node 18+, no dependencies. See [`mcp/README.md`](mcp/README.md) for how to wire
it into a client and how to switch it off again.

---

## What it does not do

Stated plainly, because a prototype that claims to be finished is worse than one that
knows what it is.

- **No real language understanding.** The chat parses a fixed command set. Anything
  outside it is rejected rather than guessed at.
- **No images, charts, tables or speaker notes.** Text slides only.
- **No PowerPoint export.** Output is HTML, which prints to PDF. If a .pptx is a hard
  requirement for a user group, that is a build decision, not a formatting one.
- **No persistence beyond the file.** Nothing is stored. Close the tab and the deck is
  gone unless it was downloaded or sent for editing. Round-tripping works, but there is
  no history of who changed what, and two people editing at once will produce two
  versions with no way to merge them.
- **No accessibility audit.** Keyboard navigation and focus states exist; a contrast and
  screen-reader pass has not been done.
- **One template family.** Three styles, one layout grammar.

### What version two would test, not build

Put it in front of six frontline officers with a real report due and watch where they
stop. The guided path is a first answer to whether the brief form was the right first
screen for someone who cannot describe what they need: it asks what happened, not what
the deck should say. Whether four story beats is the right scaffold — or whether people
need to start from something even looser, like pasting in an email thread — is what the
test should find out.

---

## Repository

```
index.html                     the app — one file, no build step
sw.js                          service worker, precaches the shell, serves checked model files
manifest.webmanifest           installable as a standalone app
supercharged.json              which models Supercharged and Supercharged Pro use
tools/prepare-model.mjs        build step: bundles WebLLM, fetches and fingerprints the Supercharged model
tools/prepare-pro.mjs          build step: bundles Transformers.js, pins and fingerprints the Pro model
.github/workflows/pages.yml    publishes the site and the optional model to GitHub Pages
mcp/                           optional MCP server — off unless you start it
docs/jtbd-and-user-stories.md  jobs-to-be-done and user stories with acceptance criteria
docs/product-deck.md           the case for the product, in eight slides
docs/base44-prompt.md          build prompt and iteration prompts
```
