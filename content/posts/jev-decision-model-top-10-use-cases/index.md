+++
title = "Jev: TypeSafe's Decision Model and Its Top 10 Use Cases"
date = "2026-09-20T20:46:17.322Z"
slug = "jev-decision-model-top-10-use-cases"
+++

<p>TypeSafe AI came out of stealth on September 15, 2026 with a new kind of model. <strong>Jev</strong> doesn't chat, write, or code. It <em>decides</em>: you send it application state plus typed questions, and it returns answers your software can act on directly.</p>
<h2>What is Jev?</h2>
<p>Jev is the first <strong>System One model</strong> — a class of models built for fast, structured judgments inside software, named after the fast, intuitive System 1 thinking in Daniel Kahneman's <em>Thinking, Fast and Slow</em>. (The model itself is named after economist William Stanley Jevons.) Think of it as a frontier-intelligence function call: unstructured state in, typed probabilistic decisions out.</p>
<p>Three things make it different from asking an LLM for JSON:</p>
<ul>
<li><strong>No string generation.</strong> Jev evaluates every question against the same state in parallel and returns probability distributions, not prose. No parsing, no invented labels — it structurally cannot return a value outside your schema.</li>
<li><strong>Calibrated probabilities.</strong> Trained with Reinforcement Learning for Calibrated Decisions (RLCD), so a 90% answer is right about 90% of the time. Confidence is a first-class output you can threshold on.</li>
<li><strong>Speed and cost.</strong> 70&ndash;500ms per request (typically ~100ms), 40&ndash;200x faster than frontier LLMs on decision-shaped tasks, at $0.042 per million input tokens with output free.</li>
</ul>
<h2>The three question primitives</h2>
<ul>
<li><strong>Noul</strong> &mdash; a yes/no question returning a probability from 0 to 1. The building block for gates and filters.</li>
<li><strong>Choice</strong> &mdash; pick from up to 255 options you define; returns the winner plus the full distribution and confidence. Built for routing and classification.</li>
<li><strong>Score</strong> &mdash; place the state on an ordered rubric of 2&ndash;10 levels you describe; returns a weighted score with per-level probabilities. Built for triage, risk, and quality.</li>
</ul>
<h2>Top 10 use cases</h2>
<ol>
<li><strong>Support ticket triage.</strong> One call classifies department (Choice), grades severity (Score), and flags urgency (Noul) — then code routes each ticket to the right queue.</li>
<li><strong>Intent routing in front of handlers.</strong> Cheap classifier up front decides whether a request needs a database lookup, an LLM with context, or a human.</li>
<li><strong>Model routing inside agents.</strong> Ask Jev which is the least costly model that can handle this request, and spend frontier-model budget only where it matters.</li>
<li><strong>Guardrails on tool calls.</strong> Check each proposed tool call for risk before it executes and block the dangerous ones — a semantic policy layer around agents.</li>
<li><strong>Confidence-based human escalation.</strong> Act automatically above a confidence threshold, send the rest to review. The boundary between acting and asking becomes explicit and measurable.</li>
<li><strong>Spam and inbound filtering.</strong> Score whether a message is a real inquiry, classify its category, and auto-reply to the clear cases while the rest wait in the inbox.</li>
<li><strong>Lead scoring and qualification.</strong> Grade inbound leads against a described rubric instead of brittle hand-written rules.</li>
<li><strong>RAG relevance checks.</strong> Ask per chunk whether it actually bears on the question, and keep only the evidence that passes.</li>
<li><strong>Verifying LLM output.</strong> Use a fast second judgment to check a draft for required content, policy violations, or quality before it reaches the user.</li>
<li><strong>Smart if-statements.</strong> Anywhere hand-written branching is too brittle but a full LLM call is too slow and expensive — fuzzy decision rules embedded in ordinary code.</li>
</ol>
<h2>What Jev is not</h2>
<p>Jev can't write, explain, code, or do exact math — TypeSafe's own limitations page flags arithmetic, counting, date comparisons, and adversarial input as weaknesses. Keep exact logic in code, and pair Jev with an LLM whenever text must be created. Type safety guarantees the <em>shape</em> of the answer, not that the answer is right: evaluate on your own labeled data and keep fallback paths.</p>
<h2>Getting access</h2>
<p>Jev (<code>jev-1.13.0</code>, alias <code>jev-latest</code>) is in early access via the TypeSafe console, with SDKs for Python and JavaScript/TypeScript, a LangChain integration, and gateway availability including Vercel AI Gateway. Sources: the <a href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">TypeSafe launch post</a>, <a href="https://www.langchain.com/blog/building-a-harness-with-jev">LangChain's Jev guide</a>, <a href="https://flaviocopes.com/jev/">Flavio Copes' deep dive</a>, and <a href="https://www.requesty.ai/blog/typesafe-jev-explained">Requesty's explainer</a>.</p>

