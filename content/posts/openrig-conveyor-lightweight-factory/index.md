+++
title = "OpenRig Conveyor: Your First Lightweight Software Factory"
date = "2026-09-26T13:19:30.394Z"
slug = "openrig-conveyor-lightweight-factory"
+++

<style>
.k-paper{max-width:760px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.75;color:#1f2937;font-size:17px}
.k-paper h1{font-size:2.1em;line-height:1.2;margin:.4em 0 .2em}
.k-paper h2{font-size:1.45em;margin:1.6em 0 .5em;padding-top:.6em;border-top:2px solid #e5e7eb}
.k-paper h3{font-size:1.15em;margin:1.2em 0 .4em;color:#374151}
.k-paper blockquote{border-left:4px solid #22d3ee;background:#f0fdfa;padding:.9em 1.1em;margin:1.2em 0;font-style:italic;color:#0f766e}
.k-paper code{background:#f3f4f6;padding:.15em .45em;border-radius:6px;font-size:.88em}
.k-paper pre{background:#0d1117;color:#e6edf3;padding:1em 1.2em;border-radius:12px;overflow-x:auto}
.k-paper pre code{background:transparent;color:inherit;padding:0}
.k-paper table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.92em}
.k-paper th,.k-paper td{border:1px solid #e5e7eb;padding:.6em .7em;text-align:left}
.k-paper th{background:#f8fafc}
.k-paper ol,.k-paper ul{padding-left:1.4em}
.k-paper li{margin:.35em 0}
.k-meta{color:#6b7280;font-size:.9em;margin-bottom:1em}
.k-cta{background:#0d1117;color:#e6edf3;border-radius:14px;padding:1.1em 1.3em;margin:1.6em 0}
.k-cta b{color:#22d3ee}
</style>
<div class="k-paper">
<div class="k-meta">Whitepaper &middot; OpenRig &middot; Conveyor lightweight factory &middot; Beginner next-step guide &middot; ~20 min read</div>
<div class="k-cta><b>TL;DR for the impatient:</b> <b>rig up conveyor</b> boots a 4-seat factory (intake &rarr; plan &rarr; build &rarr; review, 2 Claude + 2 Codex). Keep diffs under 200 lines, let review verify the exact candidate, merge humanly, snapshot often. Everything below shows you how.</div>
<h1
id="openrig-conveyor-your-first-lightweight-software-factory">OpenRig
Conveyor: Your First Lightweight Software Factory</h1>
<h3 id="from-basics-to-a-running-factory-in-one-command">From Basics to
a Running Factory in One Command</h3>
<blockquote>
<p>You already understand rigs, pods, and seats — Conveyor turns that
vocabulary into a working software factory you can boot in one command
and grow without rewriting.</p>
</blockquote>
<h2 id="executive-summary">Executive Summary</h2>
<p>If you know what OpenRig is but have not yet run a team that ships
code while you watch, this paper is your bridge. OpenRig — “Terraform
for coding agents” — is a local control plane that manages Claude Code
and Codex sessions as a single versioned topology: one YAML file, one
<code>rig up</code>, persistent identity across reboots and
compactions.</p>
<p>The mistake most beginners make is booting the biggest team first.
The <code>product-team</code> starter (7 seats, 4 Claude + 3 Codex,
orchestrator HA pair) is the week-one showcase, but four Claude seats at
once will throttle a single-plan user and bury you in coordination noise
before you learn the primitives. The self-driving
<code>factory-rsi</code> starter (plan → implement → qa_check → review →
release) is even heavier.</p>
<p><strong>Conveyor is the deliberate lightweight alternative.</strong>
Four pods — intake, plan, build, review — four seats split 2 Claude + 2
Codex, one moving belt where multiple work packets can be active at once
and queue depth provides natural backpressure. The project itself calls
it “the smallest shippable software factory, one command.” It keeps the
footprint low enough for a laptop while still showing a real handoff
path from idea to reviewed code.</p>
<p>In the next 30 minutes you will: recap the 60-second mental model,
understand why Conveyor beats the other starters for learning, see
exactly what each station does, boot it in 15 minutes, run a guided
factory build end-to-end, customize the YAML into your own minimal
factory, learn to operate snapshots, permissions, and troubleshooting
like a pro, and know precisely when to graduate to a full factory. The
data says this order matters: across 8.1 million pull requests, AI code
merges at 32.7% versus 84.4% for humans — not because generation is
weak, but because review and ownership break. Conveyor puts the review
station and human gates where the bottleneck actually is.</p>
<h2 id="where-you-are-the-60-second-openrig-recap">1. Where You Are: The
60-Second OpenRig Recap</h2>
<p>You know the basics, so let us lock them in with the exact language
OpenRig uses in its docs and CLI.</p>
<p><strong>A harness wraps a model. A rig wraps your harnesses.</strong>
Claude Code is excellent at running one agent. Codex is excellent at
running one agent. Neither answers the fleet questions: which sessions
are running, how do they relate, how do they talk without you as the
router, and what survives a reboot?</p>
<p>OpenRig sits one layer above and owns exactly that:</p>
<pre><code>CLI / TUI / MCP
      |
Hono HTTP daemon
      |
Domain services
      |
SQLite + tmux + runtime adapters</code></pre>
<p>Everything runs local: a Hono HTTP daemon plus SQLite for state, 40+
CLI commands designed for agents, a terminal TUI (<code>rig</code> /
<code>rig tui</code>) that is now the primary surface, 17 MCP tools so
agents can manage their own topology, and each agent as an ordinary
harness session in its own tmux pane you can attach to. No cloud
dependency. Apache 2.0. No per-session fee — a deliberate contrast with
Anthropic’s Managed Agents at $0.08/session-hour, Claude-only,
API-driven, proprietary.</p>
<p>Six words carry the whole model:</p>
<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 66%" />
</colgroup>
<thead>
<tr>
<th>Term</th>
<th>What it is</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Seat</strong></td>
<td>A named position with a role and address,
e.g. <code>dev-owner@first-project</code>. A session occupies it; when
the session ends, the seat keeps its name, role, and accumulated
context.</td>
</tr>
<tr>
<td><strong>Pod</strong></td>
<td>A bounded context group. Seats whose knowledge is useful to each
other, with pod-local edges and optional continuity policy.</td>
</tr>
<tr>
<td><strong>Rig</strong></td>
<td>A team for a purpose: pods, seats, and edges in one file, run as one
unit. The unit of persistence — not the session.</td>
</tr>
<tr>
<td><strong>RigSpec</strong></td>
<td>The declarative <code>rig.yaml</code> (version <code>0.2</code>,
pod-aware) describing pods, members, edges, continuity, startup. A
member in the file becomes a seat at runtime.</td>
</tr>
<tr>
<td><strong>AgentSpec</strong></td>
<td>A portable single-agent blueprint: runtime, model, cwd, skills,
hooks, guidance, startup contract.</td>
</tr>
<tr>
<td><strong>RigBundle</strong></td>
<td>A portable <code>.rigbundle</code> archive of a RigSpec plus
vendored AgentSpecs with SHA-256 integrity. Teammates import and boot
your exact topology.</td>
</tr>
</tbody>
</table>
<p>Two ideas from founder Mike Schwarz (Esoteric Labs, ex-Agent Focus,
~8,000 hours running these topologies) explain why this design wins:</p>
<ol type="1">
<li><strong>Distributed context management.</strong> Not managing
context for one agent, but engineering context across a network. A
reviewer that only reviews gets dramatically better over a day —
hyper-focus. Pods scope shared memory to a context domain so
communication stays on-topic.</li>
<li><strong>Culture as coordination technology.</strong>
<code>CULTURE.md</code> is the constitution for the group, like
<code>SOUL.md</code> is for an individual. Research rigs get exploratory
culture; implementation rigs get conservative, trust-but-verify culture.
Topology plus culture was, in his words, “the single biggest leverage
over outcomes.”</li>
</ol>
<p>Persistence is honest by design. <code>rig down --snapshot</code>
captures the topology; <code>rig up &lt;name&gt;</code> restores by name
and reports per-seat outcomes in a five-term vocabulary:
<code>resumed</code> (proven continuity), <code>fresh-primed</code>
(deliberate fresh start), <code>awaiting-decision</code> (could not
resume, zero session started — honest, not silent),
<code>attention_required</code> (live but stuck on auth/trust/menu),
<code>failed</code> (transport failed). If a session cannot resume,
OpenRig reconstructs from shared memory plus filesystem artifacts — not
a silent fresh start — or flags WARNING. You always know if an agent
lost its memory.</p>
<p>If that paragraph made sense, you are ready. You do not need
multi-host, workflows, or watchdogs yet. You need one moving belt.</p>
<h2 id="why-conveyor-is-the-right-next-step">2. Why Conveyor Is the
Right Next Step</h2>
<p>OpenRig ships a ladder of starters. Picking the right rung determines
whether your second week feels like leverage or sprawl.</p>
<table>
<colgroup>
<col style="width: 23%" />
<col style="width: 17%" />
<col style="width: 17%" />
<col style="width: 41%" />
</colgroup>
<thead>
<tr>
<th>Starter</th>
<th>Shape</th>
<th>Seats</th>
<th>When to use it</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>first-project</code></td>
<td>1 pod</td>
<td>2 seats, both Codex: owner + checker</td>
<td>Your very first run, or a single plan. Smallest useful team. Needs
Codex login only.</td>
</tr>
<tr>
<td><strong><code>conveyor</code></strong></td>
<td><strong>4 pods: intake, plan, build, review</strong></td>
<td><strong>4 seats, 2 Claude + 2 Codex</strong></td>
<td><strong>A visible handoff path. The light option with two Claude
seats. Smallest shippable factory.</strong></td>
</tr>
<tr>
<td><code>product-team</code></td>
<td>3 pods: orchestration, dev, review</td>
<td>7 seats, 4 Claude + 3 Codex: orchestrator pair, implementer, QA,
designer, 2 reviewers</td>
<td>Full product team. Four Claude seats at once — expect provider
throttling on single-plan.</td>
</tr>
<tr>
<td><code>factory-rsi</code></td>
<td>1 rig + workflow</td>
<td>7 seats, self-driving
<code>plan → implement → qa_check → review → release</code> + dogfood +
<code>release_signoff</code> gate</td>
<td>Autonomous factory MVP. Powerful, young, not a starter.</td>
</tr>
<tr>
<td><code>basic-loop</code></td>
<td>workflow only</td>
<td>1 token at a time</td>
<td>Learn workflow mechanics in isolation.</td>
</tr>
</tbody>
</table>
<p>Three reasons Conveyor is the sweet spot for a beginner who already
knows the vocabulary:</p>
<p><strong>1. It is small enough to observe.</strong> Two Claude seats
instead of four halves your throttling risk and your token burn. Four
single-member pods mean you can hold the whole topology in your head and
in one TUI screen. The official getting-started guide says it directly:
Conveyor is “the light option with two Claude seats” versus
product-team’s warning about throttling.</p>
<p><strong>2. It teaches the factory pattern, not just chat.</strong>
<code>first-project</code> teaches ownership and checking. Conveyor
teaches flow: intake triages, planning decomposes, building implements,
review verdicts. Queue depth becomes visible backpressure — when build
clogs, intake waits. That is the manufacturing intuition behind every
real software factory, from Uber’s cost-equation work to Gas City’s
Beads-backed pipelines. <code>basic-loop</code> teaches
one-packet-at-a-time; Conveyor teaches the realistic case where multiple
packets are in flight.</p>
<p><strong>3. It puts review where the data says the bottleneck
is.</strong> LinearB’s 2026 benchmarks across 8,109,244 PRs from 4,813
teams found AI PRs merge at 32.7% versus 84.4% for manual PRs, run 2.6x
larger, and wait 5.3x longer for pickup — then get reviewed 2x faster
once picked up. An ACM study of 40,214 PRs found each extra reviewer
comment raises merge odds 2.7% for humans but lowers them 2.8% for
agents. Code-review-agent-only PRs merge at 45.2% versus 68.37%
human-only, with 60.2% low-signal noise. Translation: generation is
solved; ownership and high-signal review are not. Conveyor’s dedicated
review station with a cross-harness reviewer (Codex reviewing Claude’s
build) plus a human merge gate attacks exactly that gap. A bigger rig
without a crisp review station just generates more unmerged code
faster.</p>
<p>Opinionated take: start with Conveyor even if your end goal is
autonomous. Autonomy is a maturation spectrum — scoped delegation, then
automated review, then multi-day missions — not a day-one switch.
Conveyor lets you practice stages one and two with training wheels you
can later remove.</p>
<h2 id="anatomy-of-conveyor-four-stations-one-moving-belt">3. Anatomy of
Conveyor: Four Stations, One Moving Belt</h2>
<p>Preview it yourself before booting:</p>
<pre class="bash"><code>rig specs ls
rig specs preview conveyor --kind rig</code></pre>
<p>You will see:</p>
<pre><code>conveyor (rig, pod_aware)
  Starter workflow rig: a station pipeline that can move multiple
  work packets at once, with queue depth acting as natural backpressure.

  Pod: intake (1 member)
    lead — claude-code
  Pod: plan (1 member)
    planner — codex
  Pod: build (1 member)
    builder — claude-code
  Pod: review (1 member)
    reviewer — codex</code></pre>
<p>Each pod has one seat. Each seat has a stable address:
<code>intake-lead@conveyor</code>, <code>plan-planner@conveyor</code>,
<code>build-builder@conveyor</code>,
<code>review-reviewer@conveyor</code>. The session behind the address
can change across compactions and restores; the seat and its accumulated
context do not.</p>
<p><strong>Station 1 — Intake (Claude Code).</strong> The front door.
Turns a vague request (“speed up login” / “fix flaky test”) into a
scoped packet with acceptance criteria. Good intake says no or asks for
clarification early — the cheapest place to reject bad work. In factory
terms, this is triage plus spec-framing.</p>
<p><strong>Station 2 — Plan (Codex).</strong> Decomposes the packet into
steps with file pointers and test ideas. Note the harness switch: a
different model family plans what Claude triaged. That diversity is
intentional — the same pattern as having Codex review Claude’s
architecture. Different error profiles catch different blind spots.</p>
<p><strong>Station 3 — Build (Claude Code).</strong> Implements against
the plan in the repo worktree, runs tests locally, records the queue
item ID. Build does not merge. Build produces a candidate plus evidence:
branch, diff, test output, how to try it.</p>
<p><strong>Station 4 — Review (Codex).</strong> Adversarial by position.
Verifies the exact candidate (not a description of it), checks markers
and test evidence, issues a verdict. If it fails, the packet goes back
to build with notes — that loop is the factory’s quality gate. Only a
human merges to main.</p>
<p>Why split across two harnesses instead of all-Claude? Three practical
reasons: (a) throttling — two and two stays under single-plan limits
where four Claude seats stall; (b) independence — a second model family
reviewing the first catches issues the author’s own model misses; (c)
cost — you learn cross-harness messaging (<code>rig send</code>,
<code>rig broadcast</code>, <code>rig queue handoff</code>) on day one,
which is the skill that scales to 10- and 40-agent rigs later.</p>
<p>Edges between stations are intentional and minimal. In RigSpec terms,
pod-local edges use bare member IDs, cross-pod edges use
<code>pod.member</code>:</p>
<pre class="yaml"><code>edges:
  - kind: delegates_to
    from: intake.lead
    to: plan.planner
  - kind: delegates_to
    from: plan.planner
    to: build.builder
  - kind: reviews
    from: review.reviewer
    to: build.builder</code></pre>
<p>You do not need to memorize edge kinds yet. Just know: edges declare
who may hand work to whom and who may observe. The observer pattern (a
seat with <code>can_observe</code> that watches without participating)
is how quality dossiers and dogfood loops are added later without
touching the belt.</p>
<h2 id="zero-to-running-in-15-minutes">4. Zero to Running in 15
Minutes</h2>
<p>Prerequisites are small and explicit. OpenRig needs Node 20, 22, or
24 (even LTS — odd releases lack native prebuilds), tmux, and at least
one harness logged in. Conveyor needs both Claude Code and Codex;
<code>first-project</code> needs only Codex if you want an even smaller
dry run first.</p>
<pre class="bash"><code>node --version   # v20/v22/v24
tmux -V
codex --version
codex login status</code></pre>
<p>Install and boot:</p>
<pre class="bash"><code>npm install -g @openrig/cli

# Preview what setup will change, then apply it
rig setup --dry-run
rig setup

# Boot the factory
rig specs preview conveyor
rig up conveyor

# Inspect
rig status
rig ps --nodes
rig workspace doctor

# Mission control
rig tui</code></pre>
<p>What each step does, honestly:</p>
<ul>
<li><code>rig setup --dry-run</code> shows the plan without applying it.
Read it. Setup attempts tmux, cmux, Claude Code, Codex, tmux defaults,
seeds <code>~/.openrig</code> state, discovery skills, and with defaults
enabled writes Codex hook/trust records. It reports what it tried and
what actually succeeded — hand the JSON (<code>--json</code>) to your
coding agent to finish what failed.</li>
<li><code>rig setup</code> applies it. Back up
<code>~/.claude.json</code>, <code>.claude/settings.local.json</code>,
<code>~/.codex/config.toml</code>, <code>~/.tmux.conf</code> first if
you have customized them. Managed launches pre-trust the workspace and
set <code>acceptEdits</code> / <code>workspace-write</code> floors. YOLO
stays off unless you opt in.</li>
<li><code>rig up conveyor</code> resolves specs, verifies runtimes,
creates four tmux sessions, delivers startup files, waits for readiness.
One command, deterministic.</li>
<li><code>rig ps --nodes</code> is your ground truth in the terminal.
<code>rig tui</code> is the same truth visualized: topology graph, seat
detail (cwd, runtime, context %), feed, system health.</li>
<li><code>rig workspace doctor</code> runs an eight-check readiness
diagnostic. Run it when something feels off before diving into
logs.</li>
</ul>
<p>Success looks like four READY seats, each attachable
(<code>tmux attach -t build-builder@conveyor</code> or via herdr/cmux
provider), each answering <code>rig whoami</code> with its own
node/pod/rig identity. If a seat shows <code>attention_required</code>,
it is live but parked on auth, trust, or a model-selection menu — clear
it, do not relaunch the world. <code>rig doctor</code> plus
<code>rig seat clear-attention</code> (evidence-gated, audited) replaces
the old hand-edit-SQLite habit.</p>
<p>Resource note from the field: plan ~2 GB RSS per seat as an observed
baseline and add swap on small hosts. Conveyor at four seats is
comfortable on a laptop; product-team at seven is where a Mac Mini or
VPS starts to matter.</p>
<h2 id="your-first-factory-run-a-guided-build">5. Your First Factory
Run: A Guided Build</h2>
<p>Do not start with “build my app.” Start with one bounded outcome in
your own repo clone. The belt learns from small wins.</p>
<p>Send the first packet to intake:</p>
<pre class="bash"><code>rig send intake-lead@conveyor &#39;Take one small issue from this repo: fix the flakiest test OR speed up one slow path by 10%. Scope it to &lt;200 lines changed. Create a queue item and return its ID. Hand to plan-planner@conveyor when scoped.&#39; --verify

rig queue list --destination intake-lead@conveyor --limit 20</code></pre>
<p>Watch the handoffs:</p>
<pre class="bash"><code># Planner decomposes
rig send plan-planner@conveyor &#39;Decompose queue item &lt;ID&gt; into 3-5 steps with file pointers and test commands. Hand to build-builder@conveyor.&#39; --verify

# Builder implements (it will run tests itself)
rig capture build-builder@conveyor --lines 80

# Reviewer checks the EXACT candidate
rig send review-reviewer@conveyor &#39;Check the exact candidate branch from build-builder@conveyor for queue &lt;ID&gt;. Verify markers, run the stated test command, return VERDICT: pass/fail + 3 bullet findings.&#39; --verify</code></pre>
<p>What you are practicing:</p>
<ul>
<li><strong>Queue ownership.</strong> Sending a message does not create
a queue item; the owner seat records it.
<code>rig queue list/show/handoff</code> is the durable work record.
Handoff is transactional — successor created first, local closed
second.</li>
<li><strong>Evidence over description.</strong> Review checks the branch
and test output, not the builder’s summary. <code>rig capture</code> and
<code>rig transcript</code> query what actually happened in the pane.
<code>rig ask</code> searches transcript evidence without a second LLM
call.</li>
<li><strong>Small diffs merge.</strong> Elite PR size is under 100
lines; AI PRs at 293–408 lines (P75) stall. Your intake rule (&lt;200
lines) is not aesthetic — it is the difference between 32.7% and 84.4%
acceptance.</li>
<li><strong>Human merges.</strong> Even when review passes, you merge.
Branch protection plus a human merge is the one gate to keep until your
review signal is proven over dozens of runs.</li>
</ul>
<p>When the verdict lands, snapshot:</p>
<pre class="bash"><code>rig snapshot create --rig conveyor
rig ps --nodes
rig down conveyor --snapshot
rig up conveyor   # auto-restores by name, reports resumed/rebuilt/fresh</code></pre>
<p>You just ran a software factory: triage → spec → implement → verify →
human ship, with replayable state. Repeat it three times on three small
issues before customizing anything. The third run will be twice as fast
— that is the compounding the topology is for.</p>
<h2 id="make-it-yours-the-minimal-custom-factory">6. Make It Yours: The
Minimal Custom Factory</h2>
<p>Conveyor is a starting point, not a religion. Your factory should
reflect your repo, your gates, and your taste. The good news: a rig is a
file. Fork it.</p>
<pre class="bash"><code>rig specs preview conveyor --kind rig &gt; my-factory.yaml
# edit, then:
rig up my-factory.yaml
rig bundle create my-factory  # portable .rigbundle for teammates</code></pre>
<p>Minimal valid RigSpec (v0.2, pod-aware) needs only a name and one
pod:</p>
<pre class="yaml"><code>version: &quot;0.2&quot;
name: lite-factory
culture_file: culture.md

pods:
  - id: dev
    label: Development
    members:
      - id: impl
        agent_ref: &quot;local:agents/impl&quot;
        profile: default
        runtime: claude-code
        cwd: &quot;.&quot;
    edges: []

edges: []</code></pre>
<p>Three edits that matter most for beginners:</p>
<p><strong>1. Write a 10-line culture file.</strong> This shapes every
seat more than any prompt tweak:</p>
<pre class="markdown"><code># CULTURE.md — lite-factory
- Conservative, trust-but-verify. No direct pushes to main.
- Small diffs (&lt;200 lines). One packet, one branch, one verdict.
- Evidence required: branch + test command + output for every handoff.
- Ask when scoped work exceeds 30 min; hand back with notes, never stall silently.
- Human merges. Record how to try it in every queue item.</code></pre>
<p><strong>2. Keep cross-harness review.</strong> If you collapse to one
runtime to save logins, keep at least the review station on the other
family. The data is blunt: mixed review (human + CRA) merges at 61–68%
versus 45% CRA-only. Model diversity is cheap quality.</p>
<p><strong>3. Add one terminal node for deterministic checks.</strong>
Do not spend an agent on lint:</p>
<pre class="yaml"><code>      - id: lint
        agent_ref: &quot;builtin:terminal&quot;
        profile: none
        runtime: terminal</code></pre>
<p>That exact triple is required — any partial combination is rejected
by the validator. Terminal nodes run your <code>npm test</code> /
<code>pytest</code> / <code>semgrep</code> without burning context.</p>
<p>Reuse AgentSpecs; do not author ten new ones. Point
<code>agent_ref</code> at <code>local:agents/&lt;name&gt;</code> entries
you already have, override with <code>profile</code> and
<code>cwd</code>. Use <code>rig discover</code> to adopt tmux sessions
you started by hand — fingerprint, draft candidate RigSpec,
<code>rig adopt</code> — instead of rebuilding organic work. Use
<code>rig expand / shrink / launch / remove</code> (or newer
<code>rig add</code> / <code>rig add-member</code> with member
fragments) to evolve the live rig rather than tearing it down.</p>
<p>Share via bundle when it works: <code>rig bundle create</code>
vendors AgentSpecs with SHA-256 integrity. A teammate imports and boots
your exact topology. That portability is why YAML beats oral
tradition.</p>
<h2 id="operate-like-a-pro-without-the-overhead">7. Operate Like a Pro
Without the Overhead</h2>
<p>You do not need the full workflow engine yet, but you need five
operational habits:</p>
<p><strong>Snapshots are your save game.</strong> Periodic
auto-snapshots run every 300 seconds (keep 10) plus pre-down snapshots.
After a reboot or crash, <code>rig up &lt;name&gt;</code> picks the
newest. <code>rig up --plan</code> previews the restore without
mutating. <code>rig start --last</code> recovers headless. If you
hand-resumed a seat with <code>claude --resume</code>, run
<code>rig reconcile-session</code> to rebind it to its node without
relaunching — same node ID, no re-key, drift reported honestly.</p>
<p><strong>Permissions are explicit.</strong> Defaults are safe: Claude
<code>acceptEdits</code>, Codex <code>workspace-write</code>, YOLO off.
Broader access is a separate choice via
<code>rig setup --policy locked|standard|open|yolo|none</code> plus the
bundled <code>applying-a-permission-policy</code> skill that diffs
harness configs before writing (deterministic writers break whenever
harness grammars change — hence agent-driven). Deny rules live at user
level so deny wins. Prefix gates guard <code>git push</code>,
<code>gh pr create</code>, <code>npm publish</code>,
<code>rig down</code>. Never freeze on a modal: seats run
<code>dontAsk</code> so they park as <code>attention_required</code>
instead of hanging.</p>
<p><strong>Context is addressed, not pasted.</strong> v0.5.0’s grammar
is strict: nouns store and compose (<code>rig context</code>), verbs
deliver (<code>rig send --context</code>,
<code>rig broadcast --context</code>, <code>rig walk</code>,
<code>rig queue create --context</code>). <code>rig.yaml</code> startup
<code>context_pack</code> no longer auto-delivers — compose then
deliver. This prevents the 30K-token MCP-definition mistake the founder
hit with Agent Focus: CLI plus markdown, progressive disclosure, not
everything in every prompt.</p>
<p><strong>Messaging has semantics.</strong> <code>rig send</code> is
direct, <code>rig broadcast</code> is group, <code>rig chatroom</code>
is durable rig-scoped discussion with topics/history/watch,
<code>rig queue</code> is owned work with handoff history,
<code>rig workflow</code> (when you graduate) is a declared sequence
with <code>loop_guards.max_hops</code>, exception routing, and human
gates. <code>rig whoami</code> lets any seat learn its identity;
<code>rig specs</code> is the local library. Cross-host
(<code>agent@rig@host</code>, <code>--host</code>) exists — ignore it
until single-host is boring.</p>
<p><strong>Costs are knowable.</strong> OpenRig itself is free; model
usage is not. <code>rig provider status</code> plus per-seat context %
in TUI answer “am I about to hit a limit” before you do. Mixed 2+2 plus
terminal nodes for deterministic steps is the cheapest topology that
still teaches cross-harness review. Compare honestly with cloud: Managed
Agents simplifies ops at $0.08/session-hour but locks you to
Claude-only, API-driven, proprietary. OpenRig costs your hardware plus
your existing Max/API plans and keeps interactive sessions you can
attach to.</p>
<p>Troubleshooting order that resolves 90%: <code>rig ps --nodes</code>
→ <code>rig doctor</code> → <code>rig workspace doctor</code> →
<code>rig capture &lt;seat&gt;</code> →
<code>rig seat clear-attention</code> (with evidence or
<code>--reason</code>) →
<code>rig launch &lt;rig&gt; &lt;seat&gt;</code> for one seat →
<code>rig reconcile-session</code> if you hand-resumed → ask in
Discussions with <code>--json</code> output attached. Do not
<code>rig down</code> to “fix” a stuck seat; you will lose the evidence
that explains it.</p>
<h2 id="from-conveyor-to-full-factory-where-next">8. From Conveyor to
Full Factory: Where Next</h2>
<p>Conveyor is not the ceiling. It is the on-ramp with clear exits:</p>
<ul>
<li><strong>Need orchestration?</strong> Graduate to
<code>product-team</code>: orchestrator HA pair plus dev plus review.
Talk to one orchestrator; it talks to fifteen. “Just talk to it scales
when it is an orchestrator managing a rig.”</li>
<li><strong>Need autonomy?</strong> Graduate to <code>factory-rsi</code>
plus the deterministic workflow engine:
<code>rig workflow run --rig &lt;name&gt;</code>, roles resolve to
capable seats by runtime/backlog/tiebreak, <code>release_signoff</code>
keeps publish human. Dogfood out-of-band against the shipped product
feeds findings into the next plan — the recursive self-improvement
loop.</li>
<li><strong>Need scale?</strong> Multi-host staged spin-up,
<code>rig file</code> cross-host movement, consolidated For-You feed
across hosts, fleet-altitude attention band. Same RigSpec, more
machines.</li>
<li><strong>Need different shapes?</strong> Peer research network (no
hierarchy, bidirectional), ring review (A→B→C→A), cross-harness pod
(Claude architects, Codex implements, Claude reviews), observer topology
(<code>can_observe</code> dossier without participating),
secrets-manager (Vault operated by a specialist agent, needs Docker). In
OpenRig, OpenClaw, GStack, and Paperclip are all just RigSpecs you can
remix.</li>
</ul>
<p>Alternatives are worth knowing, not fearing. Gas City (MIT,
Pack/Formula/Beads with Dolt-backed durable work graph) is excellent if
you want Beads as the work ledger and Dolt semantics. OpenPraxis (Go
single binary, Idea→Product→Manifest→Task→ReviewTask DAG, cost-first,
watcher audit) is excellent if you want per-task cost attribution as the
primary surface. Session platforms (OpenInspect), workflow graphs
(fabro), and local control planes (Machinist) optimize different points.
The durable bet, echoing the Kubernetes analogy, is that models
commoditize and the coordination layer accrues value. OpenRig’s bet is
the topology primitive: any control plane can implement the open spec
(taxonomy, AgentSpec, RigSpec, edge types, RigBundle).</p>
<p>Vision, plainly: one developer running an engineering shop, not a
chat thread. Intake that says no cheaply, plans that decompose crisply,
builds that prove with tests, reviews that verify the exact candidate,
humans who merge with confidence, memory that compounds across
compactions instead of resetting every morning. Start lit — in Addy
Osmani’s terms, a lit factory that moves judgment upstream to design —
before you go dark. Comprehension debt widens fast when machines ship to
machines without a review station you trust.</p>
<h2 id="checklist-recommendations">9. Checklist &amp;
Recommendations</h2>
<p><strong>Your next-30-minutes checklist:</strong></p>
<ol type="1">
<li><code>node --version</code>, <code>tmux -V</code>,
<code>codex login status</code> pass in your launch shell.</li>
<li><code>npm install -g @openrig/cli</code>,
<code>rig setup --dry-run</code> reviewed, <code>rig setup</code>
applied, <code>rig doctor</code> green.</li>
<li><code>rig specs preview conveyor</code>,
<code>rig up conveyor</code>, <code>rig ps --nodes</code> shows 4
READY.</li>
<li><code>rig tui</code> open; click each seat; <code>rig whoami</code>
from inside one.</li>
<li>First packet to intake (&lt;200 lines, one issue, queue ID
returned).</li>
<li>Planner → builder → reviewer handoffs observed via
<code>rig capture</code>.</li>
<li>Reviewer verdict on exact candidate with test evidence; you
merge.</li>
<li><code>rig snapshot create</code>, <code>rig down --snapshot</code>,
<code>rig up conveyor</code> restore observed.</li>
<li><code>culture.md</code> written; <code>my-factory.yaml</code>
forked; <code>rig bundle create</code> shared.</li>
<li>Third small issue shipped faster than the first. Now consider
product-team or a workflow.</li>
</ol>
<p><strong>Five mistakes to avoid:</strong></p>
<ol type="1">
<li>Booting product-team first and blaming OpenRig for throttling. Start
2+2, not 4+3.</li>
<li>Past­ing context everywhere. Use <code>rig context</code> +
<code>--context</code> delivery, not wall-of-text sends.</li>
<li>Letting review check descriptions. Review checks branches, test
commands, and outputs — or it did not happen.</li>
<li>Merging from the agent. Human merges until your acceptance rate over
30 runs earns automation.</li>
<li>Rebuilding organic sessions. <code>rig discover</code> +
<code>rig adopt</code> beats reconstructing what already works.</li>
</ol>
<p>Boot the belt. Keep the diffs small. Let the review station do its
job. The factory compounds from there.</p>
<h2 id="sources">Sources</h2>
<ol type="1">
<li><strong>OpenRig Official Site — Terraform for Coding Agents</strong>
— openrig.dev, 2026-09-25 — https://www.openrig.dev/ — Rig/pod/edge
model, snapshot/restore, 40-agents-via-4-threads, RigSpec example, CLI
reference.</li>
<li><strong>OpenRig GitHub README mvschwarz/openrig</strong> — GitHub,
2026-09-25 — https://github.com/mvschwarz/openrig — Architecture,
starters (first-project/conveyor/product-team/factory-rsi), 40+ CLI + 17
MCP, install/setup/doctor flow.</li>
<li><strong>OpenRig Docs — Getting Started</strong> — openrig.dev/docs,
2026-09-01 — https://openrig.dev/docs/getting-started — Prerequisites,
starters table with seat counts, human/agent two-user model, topology vs
coordination vocabulary.</li>
<li><strong>OpenRig Spec — RigSpec v0.2 pod-aware</strong> —
openrig.dev/specs, 2026-04-01 — https://openrig.dev/specs/rigspec —
Minimal valid example, pods/members/edges rules, terminal triple,
session naming, validation highlights.</li>
<li><strong>Why I Built OpenRig — Esoteric Labs blog</strong> — Mike
Schwarz, 2026-04-10 — https://esoteric.run/blog/why-i-built-openrig —
Agent Focus history, hyper-focus, topology/culture/ontology, 15M-token
orchestrator, orchestrator pattern, 8,000 hours.</li>
<li><strong>OpenRig v0.3.0 release — conveyor starter</strong> — GitHub
Releases — https://github.com/mvschwarz/openrig/releases/tag/v0.3.0 —
Conveyor multi-packet station flow with backpressure vs basic-loop
one-at-a-time.</li>
<li><strong>OpenRig v0.4.6 — workflows + multi-host +
factory-rsi</strong> — GitHub Releases —
https://github.com/mvschwarz/openrig/releases/tag/v0.4.6 — Deterministic
engine, spec language, workflow-to-rig binding, 7-seat self-driving loop
with release_signoff.</li>
<li><strong>OpenRig v0.3.4 — Recovery + Resilience</strong> — GitHub
Releases — https://github.com/mvschwarz/openrig/releases/tag/v0.3.3 —
Resume-by-default, five-term vocabulary, periodic snapshots
300s/keep-10, reconcile-session.</li>
<li><strong>OpenRig v0.4.7 — UI maintenance mode + sizing</strong> —
GitHub Releases —
https://github.com/mvschwarz/openrig/releases/tag/v0.4.7 — CLI/TUI
primary, ~2GB RSS/seat, starter bootstrap fixes.</li>
<li><strong>OpenRig v0.5.0 — TUI + context + permissions</strong> —
GitHub Releases —
https://github.com/mvschwarz/openrig/releases/tag/v0.5.0 —
Mission-control TUI, context nouns/verbs grammar, permission guarantee +
agent-driven skill, provider usage.</li>
<li><strong>OpenRig Work page — Esoteric Labs AI Studio</strong> —
Esoteric, 2026-06-01 — https://esoteric.run/work/openrig —
Hono/SQLite/React/tmux stack, 52 services, AgentSpec/RigSpec,
discover/adopt.</li>
<li><strong>Pivot News — OpenRig Debuts as Control Plane</strong> —
PivotNews, 2026-05-22 —
https://pivotnews.ai/build/openrig-multi-agent-control-plane — HN
launch, Kubernetes analogy, self-reported babysitting claims, crowded
category framing.</li>
<li><strong>LinearB 2026 Benchmarks — 8.1M PRs</strong> — LinearB,
2026-01-01 —
https://linearb.io/resources/software-engineering-benchmarks-report — AI
32.7% vs manual 84.4% acceptance, 2.6x larger, 5.3x pickup, review
bottleneck.</li>
<li><strong>ACM MSR 2026 — Developer vs Agentic PRs</strong> — ACM,
2026-07-31 — https://dl.acm.org/doi/full/10.1145/3793302.3793567 — 40k
PRs, submitter dominance, review-comment asymmetry +2.7% vs -2.8%.</li>
<li><strong>Gas City Reference Architecture</strong> — Gas City,
2026-08-07 —
https://gascity.com/guide/software-factory-reference-architecture/ —
Pack/Formula/Beads, durable work graph, Dolt default, control vs data
plane split.</li>
<li><strong>OpenPraxis — DAG factory</strong> — GitHub, 2026-04-01 —
https://github.com/k8nstantin/OpenPraxis — Idea-Product-Manifest-Task
hierarchy, Go binary, 55 tools, watcher audit, cost-first.</li>
<li><strong>Kantsy prior post — OpenRig Terraform for Coding
Agents</strong> — Kantsy, 2026-09-24 —
https://kantsy.netlify.app/posts/openrig-terraform-for-coding-agents/ —
Beginner overview this paper sequels; primitives, lifecycle,
cross-harness patterns.</li>
</ol>

<hr/><p><em>Sources: openrig.dev, github.com/mvschwarz/openrig, openrig.dev/docs &amp; specs, Esoteric Labs blog, release notes v0.3.0–v0.5.0, LinearB 2026 benchmarks, ACM MSR 2026. Sequel to Kantsy post “OpenRig: Terraform for Coding Agents”.</em></p>
</div>
