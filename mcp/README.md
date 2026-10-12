# MCP server — optional, off by default

**HandsOnDeck does not use this.** The app is a single HTML file that runs entirely in
the browser and never calls anything. Nothing in this folder runs unless you start it
yourself, and deleting the folder changes nothing about the app.

It is here to let a **live AI model or an agentic AI agent** work on decks: a cloud
assistant, an organisation's own internally hosted model, or an agent running a
multi-step workflow (gather notes → draft → review → revise). It exposes the deck as
tools over the Model Context Protocol, so whatever you connect works through the same
structured slide plan the interface edits, and every change is traced back to the brief
by the same content check. When you do not want that, there is nothing running, nothing
listening and nothing to switch off.

Unlike the app's on-device Supercharged tiers, what you send through this server goes
to whichever model or agent you connect — that is your choice to make, per connection.

That separation is the point. The app's own guarantee — that nothing leaves the browser
— holds because the assistant integration is a separate process you start deliberately,
not a dependency baked into the product.

---

## Turning it on

Requires Node 18 or later. No dependencies to install.

```bash
node mcp/handsondeck-mcp-server.js
```

It speaks JSON-RPC over stdio, so it is normally launched by an MCP client rather than
run by hand. For a client that reads a JSON config, add:

```json
{
  "mcpServers": {
    "handsondeck": {
      "command": "node",
      "args": ["/absolute/path/to/handsondeck-claude/mcp/handsondeck-mcp-server.js"]
    }
  }
}
```

Use the absolute path. Restart the client afterwards.

## Turning it off

Remove that entry from the config and restart the client, or stop the process. The app
is unaffected either way.

---

## What it exposes

**Tools**

| Tool | Does |
| --- | --- |
| `create_deck_plan` | Brief in, structured slide plan out |
| `revise_deck_plan` | Apply one structural change to an existing plan |
| `render_preview` | Plan to standalone HTML, for confirmation only |
| `read_deck_plan` | Read-only inspection of a plan's shape |
| `review_deck` | Check structure and trace content back to the brief |

**Resources** — `handsondeck://house-style`, `handsondeck://structure-rules`

**Prompts** — `decision_brief`, `incident_report`, `exec_summary`

---

## Why it reads and writes the plan, not the HTML

The slide plan is the single source of truth the app renders from. An assistant that
edited the rendered HTML would produce changes the app could not see, and the brief
would drift out of step with the slides.

Working on the plan means an assistant's change behaves exactly like one made by hand:
it updates the plan, the render follows, and the brief stays in step.

The plan carries `meta.sourceText`, the original brief. Without it, `revise_deck_plan`
re-checked content against the revision instruction rather than against the brief, and
flagged every legitimate item as untraced. That field is the fix.
