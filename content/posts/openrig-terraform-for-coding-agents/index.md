+++
title = "OpenRig: Terraform for Coding Agents — Managing Claude Code and Codex as One System"
date = "2026-09-24T17:30:00.000Z"
slug = "openrig-terraform-for-coding-agents"
+++

<p>If you run more than two coding agents at once, you already know the failure mode: a pile of terminal tabs you are afraid to close, no record of which session is doing what, and total amnesia after a reboot or a context compaction. <strong>OpenRig</strong> is an open-source control plane that treats that pile as a single managed system. One YAML file, one command, and your whole fleet of <strong>Claude Code + Codex</strong> sessions boots as a versioned, snapshotable topology.</p>
<p>The tagline from <a href="https://www.openrig.dev/">openrig.dev</a> is deliberate: <em>Terraform for coding agents</em>. A harness wraps a model. A rig wraps your harnesses.</p>
<h2>The problem: harness sprawl</h2>
<p>Each modern coding harness — Claude Code, Codex CLI, Pi, OpenCode — is good at running <em>one</em> agent. None of them answers the fleet-level questions: which sessions are running, how do they relate, how do they talk without you as the router, and what survives a <code>reboot</code> or a <code>/compact</code>? OpenRig sits one layer above the harnesses and owns exactly that. It does not compete with Claude Code; it manages the topology those sessions form when you run them together.</p>
<p>This matters now because persistent, specialized agents finally work. With Claude's 1M-token context and Codex's mostly-reliable self-compaction, an orchestrator can live for 15M+ tokens across 20 compactions. What was missing was the infrastructure to keep that alive across cycles — identity, shared memory, and recovery when resume fails.</p>
<h2>What OpenRig actually is</h2>
<p>OpenRig (<a href="https://github.com/mvschwarz/openrig">mvschwarz/openrig</a>, Apache 2.0, by Esoteric Labs) runs entirely local: a <strong>Hono HTTP daemon + SQLite</strong> for state, a <strong>CLI/TUI</strong> (40+ commands, now the primary surface), a <strong>React UI</strong> in maintenance mode, and an <strong>MCP server with 17 tools</strong> so agents can manage their own topology. Each agent is an ordinary harness session in its own <strong>tmux</strong> pane — you can <code>tmux attach</code>, inspect scrollback, and work alongside it. Session names are human-readable: <code>dev-impl@auth-feats</code>.</p>
<ul>
<li><strong>Runtimes today:</strong> Claude Code, Codex, plain terminal. Pi is a first-class adapter as of v0.4.6; OpenCode is in development.</li>
<li><strong>No cloud dependency.</strong> No per-session fee. Compare with Anthropic's Managed Agents ($0.08/session-hour, Claude-only, API-driven, proprietary).</li>
<li><strong>Agent-first CLI:</strong> every mutating command reports what happened, current state, and next action. Error messages are context engineering, not just errors.</li>
</ul>
<h2>Core primitives: specs, pods, edges, culture</h2>
<p>Everything is YAML and Markdown, comprehensible to humans and agents alike:</p>
<ul>
<li><strong>AgentSpec</strong> — a reusable agent blueprint: runtime, model, working directory, skills, hooks, guidance, startup contract, lifecycle defaults.</li>
<li><strong>RigSpec</strong> — a declarative topology: pods with members, edges between them, continuity policies, and a <code>CULTURE.md</code> that sets coordination norms for the fleet (exploratory for research rigs, trust-but-verify for implementation rigs).</li>
<li><strong>Pod</strong> — a bounded context group. A coder, a QA specialist, and a frontend engineer share a context domain and shared memory. When one compacts, the others restore it. That is mental-model HA.</li>
<li><strong>Rig</strong> — a topology of pods: orchestration pod, dev pod, review pod, research pod. Edges (<code>can_observe</code>, bidirectional peer links, hierarchy) define who can talk to whom.</li>
<li><strong>RigBundle</strong> — a portable <code>.rigbundle</code> archive with vendored AgentSpecs and SHA-256 integrity. Teammates import and boot your exact topology.</li>
</ul>
<p>A minimal rig looks like this:</p>
<pre><code>name: adversarial-review
pods:
  - name: review
    members:
      - agent: claude-reviewer
        runtime: claude-code
      - agent: codex-reviewer
        runtime: codex
    edges:
      - { from: claude-reviewer, to: codex-reviewer, mode: bidirectional }
continuity:
  policy: rebuild-from-memory
culture: CULTURE.md
</code></pre>
<p>Point your agent at <code>openrig.dev/docs</code> and say "build me an adversarial review rig" — it reads the spec grammar, writes the YAML, and sets it up. That is the intended workflow.</p>
<h2>Lifecycle in practice</h2>
<pre><code>npm install -g @openrig/cli
rig setup            # core: tmux, cmux, Claude Code, Codex, tmux defaults
rig doctor           # diagnose what setup could not finish
rig up demo/rig.yaml # resolve specs, launch tmux, deliver startup files, wait for ready
rig ps --nodes       # rigs, pods, node status in the terminal
rig send dev-impl@auth-feats "rebase on main, then run tests"
rig broadcast --pod review "freeze merges until the verdict lands"
rig snapshot create
rig down --snapshot  # auto-snapshot before teardown
rig up auth-feats    # auto-restore from latest snapshot
</code></pre>
<p>Three commands deserve special attention. <code>rig discover</code> fingerprints your <em>existing</em> tmux sessions (process trees, pane content, working directories) and drafts a candidate RigSpec; <code>rig adopt</code> binds those sessions under management without restarting them. Organic sprawl becomes managed infrastructure. <code>rig expand / rig shrink / rig launch / rig remove</code> evolve a live topology — add a design-audit pod when you need it, pull it out when you do not.</p>
<h2>Cross-harness is the point</h2>
<p>Single-harness orchestrators (OpenClaw, GStack, Paperclip) hard-code one pattern. In OpenRig they are all just RigSpecs you can visualize, remix, and improve — plus topologies none of them can express:</p>
<ul>
<li><strong>Cross-harness pod:</strong> Claude Code drafts architecture, Codex implements, a second Claude Code adversarially reviews. Three runtimes, one shared memory domain.</li>
<li><strong>Ring review:</strong> A reviews B, B reviews C, C reviews A. Adversarial by structure.</li>
<li><strong>Observer topology:</strong> production agents work while a separate observer watches via <code>can_observe</code> edges and writes a dossier without participating.</li>
<li><strong>Peer research network:</strong> four agents, bidirectional edges, no hierarchy, each owning a domain.</li>
</ul>
<p>Shipped starters include <code>product-team</code> (7 seats: orchestrator HA pair + dev + review), <code>conveyor</code> (intake → plan → build → review factory), <code>implementation-pair</code>, <code>adversarial-review</code>, <code>research-team</code>, <code>secrets-manager</code> (a HashiCorp Vault instance operated by a specialist agent), and <code>factory-rsi</code> (self-driving plan → implement → qa → review → release loop).</p>
<h2>Persistence: resume, rebuild, or admit loss</h2>
<p>The unit of persistence is the topology, not the session. <code>rig down --snapshot</code> captures everything; <code>rig up &lt;name&gt;</code> restores by name and reports per-node outcomes: <strong>resumed</strong>, <strong>rebuilt</strong> (session unresumable, reconstructed from shared memory + filesystem artifacts — not a silent fresh start), or <strong>failed</strong> flagged WARNING. You always know if an agent lost its memory. Honesty over convenience.</p>
<h2>Communication substrate</h2>
<p>Agents talk through the topology, not through you:</p>
<ul>
<li><code>rig send / rig broadcast</code> — direct and group delivery, with <code>--context</code> attachment from the context library.</li>
<li><code>rig chatroom</code> — shared space with topics, history, and watch mode.</li>
<li><code>rig ask</code> — daemon-backed evidence search over transcripts. Not a second LLM call.</li>
<li><code>rig capture / rig transcript</code> — grab terminal output or query what actually happened.</li>
<li><code>rig queue / rig workflow</code> — deterministic handoffs and multi-step workflows with loop guards, exception routing, and human gates (v0.4.6+), plus cross-host routing (<code>agent@rig@host</code>).</li>
<li><code>rig whoami / rig specs</code> — any agent can learn its own identity (node, pod, rig) and browse the local spec library.</li>
</ul>
<h2>Permissions, context, and recent hardening</h2>
<p>v0.4.8–v0.5.0 did the unglamorous work that makes autonomy safe: configurable launch posture (default <code>dontAsk</code> so seats never freeze on a modal prompt), deny rules written to user-level <code>~/.claude/settings.json</code> so deny wins over project-local approvals, prefix gates on <code>git push</code>, <code>gh pr create</code>, <code>npm publish</code>, and <code>rig down</code>, plus an agent-driven <code>applying-a-permission-policy</code> skill that diffs before writing harness configs (deterministic writers break every time harness grammars change). v0.5.0 also adds a <code>rig context</code> library with strict grammar — nouns store and compose, verbs deliver — and provider-usage observability (<code>rig provider status</code>) so you know before you hit a limit. The new mission-control TUI (<code>rig</code> / <code>rig tui</code>) is now the primary surface; the web UI still ships but is in maintenance mode.</p>
<h2>OpenRig vs. Managed Agents</h2>
<p>Anthropic's launch validated the category: multi-agent topology is a first-class problem. The products are different layers — Terraform vs. AWS. Managed Agents is a cloud platform for embedding Claude agents into SaaS products. OpenRig is a local control plane for developers running their own topologies: Claude + Codex today, interactive sessions you can attach to, portable artifacts, visual graphs, discovery of organic sessions, shared pod memory, and persistent identity — all shipped, all Apache 2.0. Managed Agents could eventually become just another runtime adapter in a hybrid rig.</p>
<h2>Honest limitations</h2>
<p>Web UI is maintenance-mode; live in the CLI/TUI. Multi-host and workflow surfaces are powerful but young — expect to read <code>rig doctor</code> output. The daemon's <code>HOME</code> must equal the tmux seat's <code>HOME</code> or Codex permission writes miss. And type safety of the YAML guarantees shape, not judgment: evaluate routing and guardrail decisions on your own data and keep fallback paths.</p>
<h2>Getting started</h2>
<pre><code>npm install -g @openrig/cli
rig setup
rig up product-team   # week-one experience: orchestrator HA pair + dev + review
rig tui               # mission control in the terminal
</code></pre>
<p>Then tell your orchestrator to manage the fleet while you keep one conversation. "Just talk to it" scales when <em>it</em> is an orchestrator managing a rig. Sources: <a href="https://www.openrig.dev/">openrig.dev</a>, <a href="https://github.com/mvschwarz/openrig">github.com/mvschwarz/openrig</a>, <a href="https://esoteric.run/blog/why-i-built-openrig">Why I Built OpenRig</a>, and the <a href="https://github.com/mvschwarz/openrig/releases">v0.4.6–v0.5.0 release notes</a>.</p>
