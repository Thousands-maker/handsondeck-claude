# MCP server — optional, off by default

**HandsOnDeck does not use this.** The app is a single HTML file that runs entirely in
the browser and never calls anything. Nothing in this folder runs unless you start it
yourself, and deleting the folder changes nothing about the app.

It is here as an option: when you want an AI assistant to work on a deck with you, you
turn it on. When you do not, there is nothing running, nothing listening and nothing to
switch off.

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
| `render_deck` | Plan to standalone HTML |
| `revise_plan` | Apply a change to an existing plan |
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

The plan carries `meta.sourceText`, the original brief. Without it, `revise_plan`
re-checked content against the revision instruction rather than against the brief, and
flagged every legitimate item as untraced. That field is the fix.
