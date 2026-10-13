# Jobs-to-be-done and user stories

---

## The two user groups

**Primary — the staff officer or programme manager.** Writes briefings as a routine part of
the role and presents upward regularly. The recurring artefact is a proposal seeking a
management decision or approval. Knows the argument before sitting down.

**Secondary — the frontline officer who reports occasionally.** Does not present as part of
the job until a reporting cycle, an operations or incident report, or a request from above
requires it. Knows the operational substance better than anyone in the room, and has no
habit, no template and no recent practice.

They share a job. They approach it from opposite ends: one is slowed by the artefact, the
other is stopped by the blank page.

---

## Jobs-to-be-done

### The core job — both groups

> **When** I need a decision or endorsement from someone senior,
> **I want to** turn what I already know into something they will read and act on,
> **so that** I get the decision without losing a day to formatting.

Stated without the word "slides" deliberately. Naming the solution inside the job hides the
real competition, which here is PowerPoint, a colleague who is good at decks, and last
quarter's deck overwritten.

A job is never only functional. Across the three dimensions:

| | Primary — staff officer | Secondary — frontline officer |
|---|---|---|
| **Functional** | Produce a briefing that carries the argument, and revise it cheaply when feedback arrives | Produce something that belongs alongside everyone else's, without inventing the structure |
| **Emotional** | Not being judged on presentation when the thinking is the confident part | Not feeling out of my depth doing something that is not really my job |
| **Social** | Being seen as someone whose briefings are worth reading | Not looking amateur next to a headquarters deck |

The emotional and social dimensions are not decoration. They explain the behaviour that
would kill this product: an officer who fears the artefact reflects on them will rebuild it
in PowerPoint however good the generated structure was.

### Primary user — the staff officer

**Functional job**

> When I have worked out what I am asking for, I want to produce a briefing that carries the
> argument, so that the meeting is spent on the decision rather than on the material.

**Related job — revision**

> When I get feedback on my argument, I want to change the argument without rebuilding the
> artefact, so that a revision costs minutes rather than another afternoon.

This is the job the product actually wins on. First generation saves an afternoon once.
Cheap revision saves an afternoon every time feedback arrives, which is most weeks.

**Emotional dimension.** I do not want to be judged on presentation when the thinking is the
part I am confident about.

**Social dimension.** I want to be seen as someone whose briefings are worth reading, because
that is how I get invited to the next decision. This is why a weak deck is not a small cost
to this user, and it is the mechanism behind assumption 4: if sending something structurally
poor damages how they are perceived, they will rebuild it in PowerPoint rather than risk it.

**What they hire today.** PowerPoint, at two to three hours a deck. Sometimes a previous deck
overwritten, which is why so much house structure is accidental rather than designed.

**Forces.** *Push:* the time cost, and the rework loop. *Pull:* the same artefact in minutes.
*Habit:* the organisation runs on PowerPoint and switching costs feel higher than they are.
*Anxiety:* will generated structure be good enough to put my name on and send to my director?

### Secondary user — the frontline officer

**Functional job**

> When I am asked to report on something I know well, I want to produce something that
> belongs alongside everyone else's, so that the work is judged rather than the packaging.

**Related job — getting started**

> When I have the facts but not the shape, I want something that tells me what a briefing of
> this kind normally contains, so that I am not deciding the structure and the content at the
> same time.

**Emotional dimension.** I do not want to feel out of my depth doing something that is not
really my job. The competence I have is operational, and producing a briefing puts me on
ground where I have no practice.

**Social dimension.** I do not want my report to look amateur next to a headquarters deck.
This is stronger for this group than for the primary user, and it is the reason they
sometimes over-invest in appearance at the expense of the argument.

**What they hire today.** A colleague's old deck, a template nobody maintains, or an
afternoon lost to PowerPoint they cannot spare from operational duties.

**Forces.** *Push:* not knowing where to start, and the cost of the attempt. *Pull:* getting
a defensible structure without having to invent one. *Habit:* weaker here, since there is no
established routine to displace. *Anxiety:* stronger — this artefact will be read by people
who do not see their day-to-day work.

### The recipient — a job served without them using the product

> When I receive briefings from across my teams, I want them structured consistently, so that
> I can read and compare them quickly.

Served as a side effect of the product producing a fixed structure. Nobody has to use the
product for this job to be done, which is why it earns no user story in the MVP — and why
the MVP constrains layout rather than offering themes.

### Desired outcomes

Written as direction, metric and object, and carried directly into the measurement plan:

- Minimise the time between having the argument and having something sendable
- Minimise the effort required to incorporate feedback
- Minimise the likelihood that the artefact undermines the argument
- Increase confidence that the briefing is structurally sound before a senior person sees it

---

## User stories for the MVP

Stories 1 to 4 correspond to the four verbs in the requirement — opened, reviewed, refined,
shared. Story 5 is the quality safeguard.

### 1. Generate a deck from a plain-language brief
**Priority: Must · Primary and secondary user**

> As a staff officer, I want to describe the purpose, audience, key messages and preferred
> style of my briefing in plain language, so that I get a structured deck without choosing a
> template or fighting formatting.

**Acceptance criteria**

- **Given** I am on the brief screen, **when** I enter purpose, audience and key messages as
  free text, select a style and generate, **then** the deck contains a title slide, a context
  slide derived from the purpose, one slide per key message, and a closing slide stating the
  ask — within 10 seconds.
- **And** supporting points written beneath a key message remain attached to that message.
- **And** no new factual claims appear: every content item in the output traces back to text I
  entered, and the product shows me this check.
- **And** the selected style changes type scale, spacing and density, not only colour.
- **And** all styling is inline and internally defined, with no external network calls.

### 2. Open and review the deck
**Priority: Must · Primary and secondary user**

> As a staff officer, I want to see the generated deck as it will actually appear, so that I
> can judge whether it is fit to send before anyone else sees it.

**Acceptance criteria**

- **Given** a deck has been generated, **when** I view it, **then** it renders at 16:9 and I
  can move through it slide by slide with a visible slide count.
- **And** I can inspect the underlying slide plan, so I can see how my brief was interpreted
  rather than guessing.

### 3. Refine at both argument and slide level
**Priority: Must · Primary user**

> As a staff officer, I want to change things at both the argument level and the slide level,
> so that responding to feedback does not mean rebuilding the deck.

**Acceptance criteria**

- **Given** a deck exists, **when** I amend the brief and regenerate, **then** the deck
  rebuilds from the amended brief, and reordering or removing a key message reorders or
  removes the corresponding slide.
- **Given** a deck exists, **when** I edit a headline or bullet directly in the slide, **then**
  the change is written to the slide plan and back into the brief, so the two cannot diverge.
- **And** I can delete a slide, and undo any change.
- **And** I can change the style without re-entering any content.

### 4. Share it as a real file
**Priority: Must · Primary and secondary user**

> As an officer working across different networks, I want to download the deck as a
> self-contained HTML file, so that I can send it to stakeholders without a server or special
> software.

**Acceptance criteria**

- **Given** I am ready to share, **when** I download, **then** I receive a single `.html` file
  with all styling and scripting inline and no external dependencies.
- **And** the file opens from the local filesystem with no internet connection, in standard
  browsers, without triggering security blocklists.
- **And** arrow-key navigation works in the downloaded file.
- **And** printing produces one slide per page.

### 5. Be warned before sending something poor
**Priority: Should · Primary and secondary user**

> As a staff officer, I want to be told when my content will produce a weak deck, so that I
> can fix it before my director sees it.

**Acceptance criteria**

- **Given** I generate a deck, **when** a headline is too long to sit on one slide, **then** a
  warning appears quoting the offending text.
- **And** more than nine content slides raises a consolidation suggestion.
- **And** a key message with no supporting points is flagged.
- **And** warnings are advisory — they never block generation.

---

## North Star

**Decisions obtained with a HandsOnDeck deck that was sent as it came out — not rebuilt
in another tool.** Counted per week.

It joins the two halves of the core job — *get the decision* and *without losing a day to
formatting* — and it is the direct opposite of the known adoption risk, that people still
rebuild in PowerPoint. A deck that is generated but rebuilt elsewhere does not count; a
deck that is sent but doesn't get a decision does not count.

Input metrics that move it:

| Input | What it says |
| --- | --- |
| Time from brief to sent deck | The "minutes, not a day" promise (Must 1, Must 3) |
| Share of decks sent with the ask stated and the content check clean | The deck is fit to act on (Should 4) |
| Revisions per deck and time per revision | Feedback changes the argument, not the deck (Must 2) |
| Rebuild rate — decks recreated in another tool | The adoption risk, measured |
| Return use within 30 days | The deck was good enough to come back for |

Measuring it without breaking the product's position: the app sends nothing, so none of
this is collected automatically. It comes from the files themselves — every downloaded or
editable deck carries its version number and edit history in its slide plan — and from a
short follow-up with pilot users ("Did this go out as it was? Did you get the decision?").
If telemetry is ever added, it must be opt-in and carry counts, never content.

## How the stories serve each group

| | Primary — staff officer | Secondary — frontline officer |
|---|---|---|
| **1 Generate** | Removes the formatting afternoon | Removes the blank page; the returned structure shows what a briefing of this kind contains |
| **2 Review** | Confidence before sending upward | Confidence that it belongs alongside a headquarters deck |
| **3 Refine** | The story they use most — feedback arrives weekly | Used rarely; one report, one revision |
| **4 Share** | Routine distribution | Often the only step that matters, if the report goes to one recipient |
| **5 Warnings** | A safety net they will occasionally need | A substitute for the practice they do not have |

The secondary user is served without a story of their own. That is deliberate: their needs
shaped the design — plain prose input rather than a form of dropdowns, a fixed returned
structure rather than a blank canvas, and a closing slide that always states the ask — but
building for them directly would mean the guided interview, which belongs to the agentic
version rather than the MVP.

---

## Deferred, and why

**Drafting from an existing document.** The bridge to the agentic version, and stronger there
than as a diluted MVP story.

**A guided interview for the officer who cannot yet articulate the argument.** This is the
secondary user's real need. It is deferred because assumption 1 has not been tested: if most
officers can describe what they want in prose, the interview is unnecessary complexity; if
they cannot, it becomes the primary input model rather than an addition. Building it before
that is answered would be guessing.

**Images and charts, PowerPoint export, collaboration, full theming.** Real needs, none
required to learn whether the core idea works.
