# HandsOnDeck

Turn a plain-language brief into real HTML slides you can edit, version and send.

**Live:** https://thousands-maker.github.io/handsondeck-claude/

Deliberately small: one file, no build step, no dependencies, no server, no model.
It works offline, it works from a USB stick, and nothing you type leaves your browser.

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

## Offline

The app works with no connection, and that is a design position rather than a side
effect.

- **No network calls at all.** No CDN, no fonts, no analytics, no API. Everything —
  parsing, structuring, rendering, versioning, download — runs in the page.
- **No model in the loop.** The chat surface parses a fixed command set
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

The app does not use it. HandsOnDeck runs entirely in the browser and never calls
anything; [`mcp/`](mcp/) is a separate process you start only when you want an AI
assistant working on a deck with you. Delete the folder and the app is unchanged.

That separation is deliberate. The guarantee that nothing leaves the browser holds
because the assistant integration is something you turn on, not something baked in.

[`mcp/handsondeck-mcp-server.js`](mcp/handsondeck-mcp-server.js) is a real
JSON-RPC-over-stdio MCP server, so an assistant works through the same plan object the
interface edits.

**Tools:** `create_deck_plan`, `render_deck`, `revise_plan`, `review_deck`
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
stop. The open question is not which features are missing — it is whether the brief form
is the right first screen for someone who cannot describe what they need. The answer
might be that the first screen should ask what happened, not what the deck should say.

---

## Repository

```
index.html                     the app — one file, no build step
sw.js                          service worker, precaches the shell
manifest.webmanifest           installable as a standalone app
mcp/                           optional MCP server — off unless you start it
docs/jtbd-and-user-stories.md  jobs-to-be-done and user stories with acceptance criteria
docs/product-deck.md           the case for the product, in eight slides
docs/base44-prompt.md          build prompt and iteration prompts
```
