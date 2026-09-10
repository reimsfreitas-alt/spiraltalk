# Spiral Talk — Next Operational Gates

## Current truth

Spiral Talk is a conversational decision engine, not a generic chatbot. Its commercial proof is the ability to infer trajectory/state and choose the next appropriate behavior.

## Tomorrow-risk register

1. **LLM substitution** — prompts must not become the algorithm. Deterministic policy/classification and state transitions remain explicit.
2. **Action without measurement** — a conversation must expose measurable state, decision, action and outcome events.
3. **Learning without governance** — experiments require versioned policy, evaluation and controlled rollout.
4. **Safety regression** — sensitive contexts need deterministic safety gates and a human-sensitive semantic layer.
5. **No causal observability** — instrument correlation IDs so an interaction can be traced from message to decision to action to outcome.

## P0 gates

- Emit structured trajectory events: interaction → signals → state → decision → action → outcome.
- Persist correlation_id and conversation/session identity.
- Add quality gates around generation and tool/action dispatch.
- Instrument outcome events in PostHog before claiming learning-loop performance.
- Define canary/version boundaries for policy and behavioral changes.

## Decision rule

Do not spend the next cycle polishing the chat surface unless the underlying next-behavior decision can be measured and evaluated.
