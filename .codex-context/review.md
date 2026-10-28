# Focused review and incident tabletops

Read this when a task touches consequential concurrency, consistency, external
dependencies, or capacity, or when a review/tabletop is requested. Use only the
relevant lens; a small isolated edit does not need every scenario below.

## Frame a question that can be answered

Specify the flow, boundary, observation, and decision. For example:
"Trace `/checkout` from the request to persistence and provider calls; identify
where a timeout or retry could create duplicate work." Name the relevant code
paths and state owners before proposing a fix. An investigation stays within
its requested scope until implementation is authorized.

For an operational question, build a small evidence bundle: source or query,
time window, environment/revision, workload/cohort, observed behavior, baseline,
and gaps. Include representative traces, metrics, recent deploy/configuration
changes, and affected dependencies only as relevant. Redact sensitive content
and link artifacts instead of copying raw logs. Compare like environments and
loads. Temporal proximity to a deploy is a hypothesis, not proof of causation.

State a hypothesis and the cheapest useful observation that could disprove it.
If telemetry is unavailable, trace code and propose the missing measurement;
don't invent runtime findings. Use existing tools and permitted access.

## Pick a failure lens

Focus on failures made plausible by the changed boundaries:

| Lens | Questions to investigate | Useful evidence |
| --- | --- | --- |
| Races and ownership | Can cancellation, retries, or concurrent writers interleave between a check and an update? Who owns the state? | A concrete interleaving, atomicity/locking path, and regression behavior. |
| Consistency and retries | Which write is authoritative? What if work succeeds but the acknowledgment is lost? Can retries duplicate effects? | Transaction boundaries, idempotency scope, reconciliation, and replay behavior. |
| Dependency failure | What changes if a dependency times out, fails, returns partial data, or recovers late? | Timeout/retry budgets, degradation paths, persisted state, and recovery checks. |
| Capacity | At a defined workload, where do queues, connections, memory, or fan-out saturate first? Is overload bounded? | Baseline rate/distribution, dependency limits, a model or representative load test. |

Treat "10x traffic" as a scenario with a stated baseline, request mix, duration,
and constraints. Identify a likely bottleneck and an observation that would
confirm it. Code inspection alone cannot prove a capacity multiplier. If a lens
finds nothing supported by evidence, say so instead of manufacturing a defect.

For each material finding, record the affected path, trigger, failure mechanism,
consequence, evidence/confidence, and proposed mitigation or next check. Prioritize
by impact and plausible occurrence, not by the number of findings generated.

## Run a tabletop

A tabletop walks a hypothetical failure through the system. Use an existing
task plan or review artifact; a separate permanent incident file is optional.
Cover the immediate failure and eventual recovery with these fields:

- Scenario and assumptions: affected flow, initial state, failure point, timing,
  and expected load. Name the dependency's role rather than guessing it.
- Expected behavior: user-visible result, persisted state, timeout/retry limits,
  degradation, and constraints that must remain true.
- Recovery: what happens when the dependency returns or late events arrive;
  duplicate handling, reconciliation, backlog drainage, and data correctness.
- Detection and response: observable signals, runbook, rollback/containment
  option, and accountable owner if known. Unknown ownership stays explicit.
- Evidence and next action: code/test support, predicted outcomes, unresolved
  behavior, and the smallest useful follow-up check.

For example, walk through Redis becoming unavailable, a provider timing out
after accepting a request, or duplicate callbacks arriving after recovery.
Whether Redis is a cache, queue, lock store, or authoritative state changes the
answer; identify its actual role first. Treat examples as prompts for analysis,
not claims about this repository or a demand to add those dependencies.

Keep tabletop predictions labeled as predictions. Fault injection and load
tests are separate execution tasks: use a disposable environment and bounded
fixtures where suitable, respecting existing authorization and cost limits.
A tabletop request alone does not authorize stopping live services or stressing
an external provider. Report actual tests separately from simulated reasoning.

## Preserve judgment and measure the result

Recommend a course of action with material alternatives, tradeoffs, and residual
risk. A delegated review can supply evidence; it cannot silently accept risk or
make an irreversible decision for the accountable owner. Routine reversible
implementation choices remain within the agent's authorized brief.

For automation, measure net human effort over a comparable scope and period:

```text
net human time saved = baseline human effort for the same work
                    - actual operation, review, correction, and rework
                    - attributable setup and maintenance effort
```

Use observations where available and label counterfactual estimates, assumptions,
and uncertainty. Keep machine runtime and monetary cost separate from human
effort; include them as relevant tradeoffs. Record correctness, residual risk,
and learning even when savings cannot be quantified. Avoid creating a dashboard
or requiring time estimates unless the task benefits from them.
