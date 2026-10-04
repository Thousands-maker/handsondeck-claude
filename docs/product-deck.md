# The product in eight slides

*The case for HandsOnDeck: who it is for, what was tested, what was built and what
comes next. Headline plus supporting points, format-neutral.*

---

## Slide 1 — Officers do not have a slide problem
**Answers: 1a — target users, pain points, jobs-to-be-done**

**Headline:** Officers do not have a slide problem. They have a get-a-decision problem.

**Two users, same job, opposite starting points**

*Primary — staff officer or programme manager.* Writes briefings constantly and presents
upward as routine. The recurring deck is a proposal seeking a management decision or
approval. Knows the argument before sitting down. **Pain is time:** the thinking takes
twenty minutes, the formatting takes the afternoon, and one round of feedback means
rebuilding the artefact.

*Secondary — frontline officer who reports occasionally.* Does not present as part of the
job until a reporting cycle or an operations or incident report requires it. Knows the
substance better than anyone in the room. **Pain is starting:** no habit, no template, no
recent practice, and a blank slide is the same problem as a blank text box. Also carries a
status cost the primary user does not — not wanting to look amateur next to a headquarters
deck.

**The core job**
> When I need a decision from someone senior, I want to turn what I already know into
> something they will read and act on, so that I get the decision without losing a day to
> formatting.

**The secondary user's version**
> When I am asked to report on something I know well, I want to produce something that
> belongs alongside everyone else's, so that the work is judged rather than the packaging.

**Related job, belonging to the recipient:** receive briefings structured consistently, so
they can be read and compared quickly. Served without them ever opening the product.

*Speaker note: the job is stated without the word "slides" on purpose. Name the solution in
the job and the real competition disappears — which here is PowerPoint, a colleague who is
good at decks, and last quarter's deck overwritten.*

---

## Slide 2 — What I would test before building further
**Answers: 1b — assumptions to validate. 1c — what "good enough for MVP" means**

**Headline:** The riskiest assumption is not about usability. It is about whether officers
can describe what they need.

**Assumptions to validate with users**

1. **Officers can describe what they need in prose — riskiest.** The primary user can. The
   secondary user often cannot. If most users are the second kind, the input model has to
   change from a text box to a guided interview. Tested by asking eight officers to
   describe a real briefing cold, and seeing what comes out.
2. **Structure, not visual polish, is what makes decks slow.** If the real cost is
   formatting rather than sequencing, this product solves the wrong half.
3. **An HTML deck survives the real workflow.** It opens on their machine, it holds up when
   forwarded across networks, and nobody asks for it in PowerPoint.
4. **Officers trust generated structure enough to send it upward.** Tested by watching what
   they do after generation, not by asking whether they liked it.

**Good enough for MVP**

An officer describes a real briefing they need, gets slides that are structurally sound,
refines them without starting over, and sends them on with only light editing.

The bar: **they would rather use it than open PowerPoint.**

**Explicitly not in the MVP:** brand-perfect output, every layout, images, collaborative
editing, and any operational, case or classified content.

---

## Slide 3 — Five user stories
**Answers: 2a — user stories with acceptance criteria**

**Headline:** Stories 1 to 4 are the four verbs in the requirement: opened, reviewed,
refined, shared.

**1. Generate from a plain-language brief — Must**
As a staff officer, I describe purpose, audience, key messages and preferred style in plain
language, so I get a structured deck without fighting formatting.
*Title, context, one slide per message, closing ask, under 10 seconds. Supporting points
stay attached to their message. No new factual claims: the system restructures what I
wrote and never adds content.*

**2. Open and review — Must**
As a staff officer, I see the deck as it will appear, so I can judge whether it is fit to
send.
*Renders 16:9, navigable with a visible slide count. The underlying slide plan is
inspectable, so I can see how my brief was interpreted.*

**3. Refine — Must**
As a staff officer, I change things at both argument and slide level, so feedback does not
mean a rebuild.
*Amending the brief regenerates the deck. Editing a headline or bullet in place writes back
to the brief, so the two cannot diverge. Slides can be deleted and any change undone.*

**4. Share as a real file — Must**
As an officer working across networks, I download a self-contained HTML file, so I can send
it without a server or special software.
*One file, all styling inline, no external dependencies. Opens offline from the local
filesystem without triggering security blocklists. Arrow-key navigation. Prints one slide
per page.*

**5. Be warned before sending something poor — Should**
As a staff officer, I am told when my content will produce a weak deck, so I fix it before
my director sees it.
*Flags over-long headlines quoting the text, more than nine content slides, and messages
with no supporting points. Advisory — never blocks generation.*

*Full acceptance criteria in the appendix.*

---

## Slide 4 — Prioritisation and trade-offs
**Answers: 2b — prioritisation and trade-offs across value, complexity, security, speed**

**Headline:** Four Musts, because dropping any one means the product does not meet the
requirement. The prioritisation is visible in what sits below them.

| Story | User value | Complexity | Security risk | Speed | Priority |
|---|---|---|---|---|---|
| Generate | High — this is the product | Medium | Medium — input sanitisation | Fast | Must |
| Open and review | High — nobody sends what they cannot see | Low | Low | Fast | Must |
| Refine | High — the time saving lands here | Medium — two-way sync | Low | Medium | Must |
| Share as a file | High — an artefact that cannot leave does no job | Medium | High — must guarantee no leakage | Medium | Must |
| Warnings | Medium — works without it | Low | Low | Fast | Should |

**The trade-offs**

**Security over speed of delivery.** No CDNs, no remote fonts. The file must open on a
locked-down machine and cross network boundaries. Inlining everything and verifying it
costs time up front. Skipping it fails the only test that matters: does the file open on
the recipient's machine.

**Structure over user control.** Three fixed styles, not a theming engine. This constrains
the officer deliberately, in service of the recipient's need for consistency, and removes
the risk of generating something unreadable.

**Source of truth over free editing.** Slide edits write back to the brief, never only to
the rendered HTML. Otherwise the two drift apart and we have built a weak HTML editor. This
is the trade-off I expect to be challenged on.

**Deferred, and why:** images and charts, PowerPoint export, collaboration, full theming,
and drafting from an existing document. The last is the bridge to the agentic version and
is stronger there than as a diluted MVP story.

---

## Slide 5 — The working prototype
**Answers: 3 — working MVP, requirement input to HTML slide output**

**Headline:** Brief, then slide plan, then rendered HTML. The middle stage is the product
decision.

- **Brief** — purpose, audience, key messages and style, captured as plain text
- **Slide plan** — an inspectable structure; the single source of truth the renderer reads
- **Rendered deck** — real HTML, navigable in the app, downloadable as one self-contained file

**Why the middle stage matters.** Prose is not mapped straight to markup. Everything later
reads and writes this one object instead of re-parsing prose: refinement, the agent, and
the MCP tools. It is what makes slide-level editing safe, and what makes the no-new-claims
check possible at all.

**Built with:** [AI-assisted coding tool], as a single self-contained file. Everything is
generated at runtime. No server, no external calls, no network dependency, which is why it
can be demonstrated on a government machine.

**Current limitations, stated plainly:** no images or charts; three fixed styles; rule-based
structure rather than a model in the loop, which is what keeps it offline; no persistence
between sessions; no PowerPoint export.

*Speaker note: the walkthrough follows the presentation, so this slide explains what was
built and why. The walkthrough is the proof.*

---

## Slide 6 — From tool to agent
**Answers: 4a — how it becomes agentic. 4b — actions, approvals, guardrails. 4c — chatbot**

**Headline:** The agentic version is the answer to the officer who cannot yet describe what
they need. It is not a layer on top.

**What the agent does**
- Interviews the officer who has not worked out their argument yet, rather than waiting for
  a clean brief — this is the secondary user's whole problem
- Drafts from a source the officer already has access to: a report, a meeting note, a
  programme update
- Restructures on instruction: cut to five slides, lead with the constraint, make the ask
  explicit
- Checks the argument, not only the format: flags an unsupported claim or a missing ask
- Prepares a variant for a different audience from the same plan

**Human approvals — required**
- Nothing is sent, shared or filed without explicit confirmation. The agent drafts; a
  person releases.
- Use of any source is confirmed against the officer's own access rights before it is read
- The officer approves the plan, not only the output, because the plan is what is reviewable

**Guardrails**
- Reads only what the officer can already read. No privilege elevation.
- Classification inherited from source, displayed on the artefact, never downgraded
- No new factual claims, enforced as it is in the MVP
- Every generation logged with source, prompt and output
- Autonomy expands on measured accuracy: drafting first, restructuring next, source-reading
  last

**Chatbot experience.** The conversational surface writes to the same slide plan. "Make
slide three about latency instead" edits the plan and re-renders. Chat and interface are two
views of one object, not two products — which is why a change made in chat survives being
edited in the interface afterwards.

---

## Slide 7 — MCP, integration and governance
**Answers: 5a — capabilities as tools. 5b — tools, resources, what stays native. 5c —
security, audit, approval, monitoring**

**Headline:** Expose the plan, not the pixels.

**Tools**
- `create_deck_plan(brief)` — prose in, structured plan out
- `render_deck(plan)` — plan in, HTML out
- `revise_plan(plan, instruction)` — targeted structural edit
- `review_deck(plan)` — critique only, no mutation

**Resources the product needs**
- House style definitions and approved templates, so structure is consistent rather than
  reinvented per officer
- The officer's own documents, only where access is granted for a specific task
- Past decks as structural examples, never as content to copy from
- No access to operational or case systems in this release or the next

**What stays native**
- The editing experience and the preview — direct manipulation is the point
- The human release step. If sending becomes a tool call, we have given away the control
  point that makes this safe.
- No code execution, no arbitrary fetching, no automatic sharing

**Before this is used more widely**
- Authenticate as the officer, never as the service, so access rights are inherited not
  granted
- Full audit trail: who called what, with which source, producing which artefact
- Named control owners agreed before build, not after; controls tested throughout delivery
  rather than validated once at the end
- Residual risk accepted by someone with the authority to accept it
- Monitoring for the things that should never happen: classification downgrades, approval
  steps bypassed, sources read outside a granted scope
- Staged exposure: internal first, then trusted agents, then wider

---

## Slide 8 — Metrics and learning plan
**Answers: 6 — adoption, completion, quality, time saved, satisfaction, safety**

**Headline:** Usage data alone will mislead us. A high generation count says nothing about
whether the deck was any good.

| | Measure |
|---|---|
| **Adoption** | Officers who use it again within 30 days, by user group |
| **Task completion** | Briefs started against decks actually sent onward |
| **Quality** | Edit distance between generated and sent; reviewer-rated structural quality on a sample |
| **Time saved** | Total task time from brief to sent artefact, including review and rework — not generation speed |
| **Satisfaction** | Would you use this again for a real briefing, asked once at the moment of download rather than as a periodic survey |
| **Safety and governance** | Classification handling errors, target zero. Generations where the content check failed. Approval steps bypassed, target zero. |
| **Cost** | Cost per accepted deck, against the officer hours it displaces |

**Why total task time, not generation speed.** A deck produced in ten seconds that then
takes an hour to fix has saved nothing. An hour saved on something that was never the
bottleneck is worth nothing either — which is why assumption 2 has to be tested before this
metric means anything.

**Learning plan**
- Weeks 1–2: test the four assumptions with about eight officers across both user groups
- Weeks 3–8: limited pilot on real work only, no synthetic tasks
- Week 9: evidence gate — scale, change the input model, or stop
- Expect a dip before a gain. A new workflow usually costs time before it saves any, so a
  weak week three is not yet evidence of failure.

**What would make me stop:** officers generate a deck and rebuild it in PowerPoint anyway.
That is a trust problem, and no amount of feature work fixes a trust problem.

---

## Appendix

- Full user stories with complete acceptance criteria
- Assumptions register, including data, security and network assumptions
- Prototype architecture and what was tested
- Proposed MCP tool definitions
- Prototype limitations and planned improvements
