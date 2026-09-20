+++
title = "The Self-Learning Loop, with Jev"
date = "2026-09-20T17:30:00.000Z"
slug = "self-learning-loop-harness-jev"
+++

<p>An agent that doesn't learn from its own runs is just an expensive replays folder. The interesting part of building agents right now isn't the model call — it's the loop that runs around the model: observing what happened, judging whether it was good, deciding what to try next, and persisting the rules that worked.</p>

<p>Jev, TypeSafe AI's System One model, slots into exactly that loop. It's the fast inner judge that lets the slow outer LLM do its job without paying for an entire chat completion every time the harness needs to decide something.</p>

<h2 id="the-self-learning-loop">The self-learning loop, in one diagram</h2>

<p>Every self-improving agent runs the same five beats, even when nobody writes them down that way:</p>

<ol>
  <li><strong>Discover</strong> — the LLM produces a candidate action: a plan, a tool call, a draft.</li>
  <li><strong>Verify</strong> — code runs it against the real world (a test, a sandbox, an API). The harness captures structured traces of what actually happened.</li>
  <li><strong>Judge</strong> — a model looks at the trace and asks: was that good? Was it safe? Did it regress something that used to work?</li>
  <li><strong>Persist</strong> — the judgment becomes a rule, a memory entry, a new example in a retrieval index, or a tweak to the system prompt.</li>
  <li><strong>Re-enter</strong> — the next iteration ships with the new rule baked in. The system is now a little better than it was a minute ago.</li>
</ol>

<p>Steps 1 and 5 are session-scoped. Steps 2 through 4 are the part you actually own in the harness. They're also the part that breaks if every judgment costs a 2-second frontier-model call.</p>

<h2 id="why-jev-fits-the-judge-step">Why Jev fits the judge step</h2>

<p>Jev isn't an LLM. It doesn't generate text. You hand it a piece of application state and a typed question, and it returns a probability distribution over a fixed schema: a <code>noul</code> for yes/no, a <code>choice</code> over labels you define, or a <code>score</code> against an ordered rubric. It answers in roughly 100ms and is trained (with RLCD) to be calibrated — a 90% answer is right about 90% of the time.</p>

<p>That shape — fast, typed, calibrated — is exactly what the judge step wants. You don't need a paragraph explaining whether a tool call was risky. You need <code>risk: 0.82</code> and a threshold in your code.</p>

<p>Three concrete places Jev earns its keep in the loop:</p>

<ul>
  <li><strong>Policy gates</strong> — before every tool call, ask Jev "is this action risky given the current state?" Score above 0.7 and the harness blocks the call and asks the LLM for a safer alternative. Below 0.3 and it executes without a second opinion. The middle band is where humans get pulled in.</li>
  <li><strong>Regression checks</strong> — after each run, ask Jev "did this regress any of the rules I previously learned?" That judgment goes into a structured diff against the rule store. New regressions fail the loop; clean runs promote their candidate rules.</li>
  <li><strong>Test evaluation</strong> — agents write a lot of tests, but tests don't tell you whether the <em>intent</em> of a change is preserved. A second judgment, looking at the diff and the test results, decides whether the change should graduate or get sent back for another pass.</li>
</ul>

<h2 id="a-tiny-harness">A tiny harness, end to end</h2>

<p>The smallest version of this pattern is around 80 lines of TypeScript. The pieces are:</p>

<ul>
  <li><strong>Runner</strong> — executes the LLM's proposed tool calls in a sandbox.</li>
  <li><strong>Jev client</strong> — one function per question primitive (<code>noul</code>, <code>score</code>, <code>choice</code>).</li>
  <li><strong>Trace store</strong> — append-only log of (state, action, result, judgment) tuples.</li>
  <li><strong>Rule store</strong> — promoted rules keyed by stable hashes of the conditions that triggered them.</li>
  <li><strong>Promoter</strong> — the background job that mines traces for recurring patterns and proposes new rules.</li>
</ul>

<p>The loop runs like this:</p>

<ol>
  <li>Runner captures the trace.</li>
  <li>Jev scores the trace for safety and intent-preservation.</li>
  <li>If Jev flags a regression, the harness rolls the change back and tells the LLM why, in a structured error the LLM can act on next turn.</li>
  <li>If Jev approves and the trace matches an existing pattern, the rule's confidence bumps up.</li>
  <li>If Jev approves and the trace is new, the promoter writes a candidate rule, scored against a held-out set of traces before it ever goes live.</li>
</ol>

<p>The LLM never has to argue with itself about whether its last change was good. The harness asks, Jev answers in milliseconds, and the LLM only gets pulled back in when the answer is uncertain.</p>

<h2 id="what-the-loop-actually-improves">What the loop actually improves</h2>

<p>Three things, in order of how much they matter:</p>

<p><strong>Cost.</strong> Replacing every judgment-shaped LLM call with a Jev call is roughly two orders of magnitude cheaper. A run that previously cost $0.40 in judge calls now costs a fraction of a cent. The loop becomes cheap enough to run on every agent action, not just a sampled subset.</p>

<p><strong>Latency.</strong> A 100ms judge fits inside the same turn as the action it judged. The agent doesn't pause to "think about what just happened" — the harness has already decided before the LLM is ready to plan the next step.</p>

<p><strong>Calibration.</strong> Because Jev's probabilities are trained to be honest, the rule store can trust them as continuous signals instead of binary pass/fail. A rule that's right 73% of the time is a useful rule; the harness doesn't have to wait until it's clearly good or clearly bad before promoting it.</p>

<h2 id="where-it-doesnt-fit">Where it doesn't fit</h2>

<p>The self-learning loop has parts that Jev can't touch. Generating the candidate action still wants a frontier model — Jev can't write code or explain a stack trace. Promoted rules still need code that owns them. And the promoter that proposes new rules still needs an LLM to read a cluster of traces and articulate what the rule should be.</p>

<p>The win isn't replacing the LLM. It's moving every decision that's <em>not</em> "write me some text" out of the LLM and into a place that's faster, cheaper, and structurally incapable of drifting off-schema. The LLM stays where it's irreplaceable. Everything else gets a cheaper, typed judge.</p>

<h2 id="the-short-version">The short version</h2>

<p>The harness is where agents actually learn. Jev is the right model for the parts of the harness where the answer is a typed probability, not a paragraph. Put Jev in the judge step, keep the LLM in the generate step, and the self-learning loop closes in milliseconds instead of seconds — and gets cheaper on every iteration.</p>

<p>That's the whole pitch: the agent gets smarter, the bill gets smaller, and the LLM only has to do the part it's good at.</p>

