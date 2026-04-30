# Platypus

A multi-tenant platform for configuring AI Agents, assigning them tools, and chatting with them.

## Language

**Organization**: Top-level tenant.
_Avoid_: Tenant, account.

**Workspace**: A scoped environment within an Organization. Owns Chats, Agents, MCPs, and Providers.
_Avoid_: Project, environment.

**Agent**: A configured AI persona within a Workspace — system prompt, model, temperature, plus
assignments to Tool sets, Skills, and Sub-agents.
_Avoid_: Bot, assistant, persona.

**Sub-agent**: An Agent assigned to another Agent (the parent) as a delegation target. The parent
gets a generated `delegateTo<Name>` tool per sub-agent. Sub-agents cannot themselves have
sub-agents (depth limit, enforced at runtime).
_Avoid_: Child agent, helper agent.

**Tool set**: A named bundle of tools, assignable to an Agent by id. Multiple tool sets compose by
union when the Agent runs.
_Avoid_: Tool group, plugin.

**Skill**: A named, on-demand prompt fragment listed in the System prompt by name + description
only; full body fetched via the `loadSkill` tool when the LLM needs it.
_Avoid_: Capability, ability, prompt.

**Memory**: Persistent per-User context surfaced into the System prompt and queryable via the
`memorySearch` / `memoryGet` tools. Stored as daily summaries.
_Avoid_: Note, recollection.

**MCP**: A Model Context Protocol integration — an external server that exposes tools to an Agent.
MCP clients are opened per Chat turn and must be closed on completion or abort.
_Avoid_: Plugin, extension.

**Provider**: A configurable AI Provider record (OpenAI / OpenRouter / Bedrock / Google /
Anthropic / custom OpenAI-compatible) bound to a Workspace.
_Avoid_: Model, vendor.

**System prompt**: The rendered string sent as the system message at the start of a Chat turn.
Composed from the Agent's own prompt plus contextual fragments (Workspace, User, Memories,
Skills, Sub-agents). Built per turn — not stored.
_Avoid_: Instructions, preamble.

**Chat turn**: One request/response cycle within a Chat — the unit of execution that resolves
context, loads tools, opens MCP clients, renders the System prompt, streams the response, and
cleans up.
_Avoid_: Message, request.

## Relationships

- An **Organization** has many **Workspaces**.
- A **Workspace** has many **Chats**, **Agents**, **MCPs**, and **Providers**.
- An **Agent** can be assigned **Tool sets**, **Skills**, and **Sub-agents** (themselves Agents).
- A **Chat turn** uses one **Agent** and produces one rendered **System prompt**.
- A **Sub-agent** is reachable by exactly one parent **Agent** at depth ≤ 1.
