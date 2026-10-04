# Base44 build prompt — HandsOnDeck

*Paste the main prompt first. Then use the numbered follow-ups one at a time, checking the
build after each. Do not paste them all at once.*

---

## Main prompt

Build a single-page web app called **HandsOnDeck**. It turns a plain-language brief into real
HTML slides that a government officer can review, refine and send.

**The pipeline is three stages, and this is the most important part of the design. Do not
collapse it.**

1. **Brief** — the officer's plain text input
2. **Slide plan** — a structured JSON object, visible to the user in its own tab
3. **Rendered deck** — HTML slides generated from the plan

The plan is the single source of truth. The renderer only ever reads from the plan. Never
generate HTML directly from the brief, and never treat the rendered HTML as the record of
what the deck contains.

### Layout

Two columns. Left is the brief form, roughly 400px, fixed. Right is the output panel with
two tabs: **Deck** and **Slide plan**.

### The brief form

- **Deck title** — single-line text
- **Purpose** — single-line text, with the hint "What should happen after this deck?"
- **Audience** — single-line text
- **Key messages** — a textarea, at least 8 rows. Hint: "One per line. Start a line with a
  dash to make it a supporting point under the message above."
- **Preferred style** — a select with three options: "Operational brief — dense,
  evidence-forward", "Executive — spare, one idea per slide", "Workshop — conversational"
- Buttons: **Generate deck** and **Download HTML**

Pre-fill the form with this example so the app is useful on first load:

- Title: Extending the Case Triage Pilot
- Purpose: Get approval to extend the pilot to two more divisions
- Audience: Divisional directors, mixed technical and operational
- Key messages:
  ```
  The pilot cut average case triage time from 40 minutes to 12
  - Measured across 1,430 cases over 11 weeks
  - Largest gains on multi-source cases
  Officers adopted it without formal training
  - 87% weekly active use by week 4
  Two constraints must be resolved before we scale
  - Data retention rules differ across divisions
  - Model latency degrades past 50 concurrent users
  Extending to Divisions C and D needs a decision this month
  ```

### Parsing the brief into a plan

A line with no leading dash or indent is a **key message**. A line starting with a dash or
indented is a **supporting point** belonging to the message above it. Blank lines are
ignored.

The plan is an object: `{ meta: {...}, slides: [...], warnings: [...] }`. Slides are built
in this order:

1. A **title** slide: the deck title, with the audience as subtitle
2. A **context** slide titled "Why we are here", containing the purpose — only if a purpose
   was given
3. One **point** slide per key message, with its supporting points as bullets
4. A **close** slide titled "The ask", containing the purpose

### Rendering

Render the slides at 16:9. Show one slide at a time with Previous and Next buttons and a
"Slide N of M" counter. Arrow keys navigate.

**Do not use an iframe for the preview.** Render into a scaled container in the page itself.
An iframe creates cross-origin problems that make errors impossible to debug.

Each of the three styles must change type scale, line height and spacing — not only colour.
The executive style should be noticeably larger and sparer than the operational one.

### Inline editing

Headlines and bullets in the rendered preview are `contenteditable`. When the user edits one
and moves focus away:

- write the change into the slide plan
- **also write it back into the brief form**, so the brief and the plan can never diverge
- re-render

This means regenerating from the brief never destroys a slide-level edit. Nothing lives only
in the rendered HTML.

**Important:** while the user is editing text, the spacebar and arrow keys must type
normally, not navigate slides. Check whether the keyboard event came from an editable
element and ignore it if so.

### Download

A single self-contained `.html` file. All CSS and JavaScript inline. No external
dependencies, no CDNs, no remote fonts. It must open correctly from the local filesystem with
no internet connection. Arrow keys navigate in the downloaded file, and printing produces one
slide per page in landscape.

### Do not build

No login or accounts. No database or saved decks. No chat interface. No image upload. No
PowerPoint export. No theming beyond the three styles. This is a prototype demonstrating one
journey, and extra features weaken it.

Use plain HTML, CSS and JavaScript. Keep everything in one file if possible.

---

## Follow-up 1 — the content check

Add a check that runs after every generation, proving the system invented nothing.

Every piece of text in the slide plan must trace back to something the user typed in the
brief. The two fixed labels — "Why we are here" and "The ask" — are template chrome; count
them separately rather than hiding them.

Show the result under the form:

- If everything traces: a green line reading "Content check: all N content items trace back
  to your brief. Nothing was invented. (2 template labels.)"
- If anything does not: a red line naming how many items failed.

Store the result in the plan as `meta.contentCheck` so it is visible in the Slide plan tab.

This has to be able to fail. If it can only ever pass, it proves nothing.

---

## Follow-up 2 — quality warnings

After generation, show advisory warnings under the form. They must never block generation.

- A headline longer than about 120 characters — quote the offending text
- More than nine content slides — suggest consolidating
- A key message with no supporting points — name the message
- No key messages at all

---

## Follow-up 3 — delete and undo

Add **Delete slide** and **Undo** buttons next to the slide navigation.

Delete removes the currently displayed slide, updates the brief to match, and stays on the
same position rather than jumping to slide one. The title slide cannot be deleted. The deck
cannot go below a title slide plus one content slide.

Undo steps back through every change — inline edits, deletions, and regeneration — restoring
the plan, the preview and the brief form together. Keep about 40 steps. Disable the button
when there is nothing to undo. An edit that did not actually change the text should not
consume an undo step.

---

## Follow-up 4 — versioning

Mint a version number whenever a new artefact is produced: on each Generate, and on a
Download that follows slide edits. Downloading an unchanged deck twice should not increment
it.

Show the version in four places: a small "VERSION 3" mark in the corner of the title slide
in both the preview and the download; the downloaded file's `<title>`; the filename, as
`deck-title-v3.html`; and next to the slide counter.

Keep the version in `meta`, not inside any slide's title text — otherwise the content check
will correctly flag it as text the user never wrote.

Also show the generation time in milliseconds next to the slide counter.

---

## Follow-up 5 — polish pass

- Government-appropriate visual design: restrained, high contrast, no decorative gradients or
  rounded card shadows. Deep violet `#4b2e83` as primary, teal `#00a3ad` as accent.
- Make sure the app creates no global JavaScript variables — wrap the script in an
  immediately-invoked function. In particular never name a variable `history`, `location` or
  `name`, as these collide with read-only browser globals and throw in strict mode.
- Check the browser console is clean on load.
- Confirm the downloaded file opens with the network disconnected.

---

## For the walkthrough

Generate. Edit a headline in the slide and switch to the Slide plan tab to show the JSON
change. Point out the content check staying green — the edit came from the user, so it still
traces. Delete a slide and undo it. Download, then open the file from the filesystem with the
network off and navigate with arrow keys.
