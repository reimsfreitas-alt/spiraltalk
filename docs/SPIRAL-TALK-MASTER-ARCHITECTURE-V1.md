# Spiral Talk — Master Architecture V1

## North Star

Spiral Talk is a mobile-first experience of psychological listening and reflection. Its objective is not to diagnose, prescribe, classify or impersonate a clinician. Its objective is to create a high-quality conversational space in which the user can speak freely, be genuinely accompanied, and arrive at their own formulations.

## Non-negotiable principles

1. No inference becomes fact.
2. Compassion is not automatic agreement.
3. The user owns meaning and corrections.
4. Silence can be a valid conversational action.
5. The system should choose the conversational act before choosing wording.
6. Memory exists for continuity, not hidden psychological profiling.
7. Individual memory is private; product learning is aggregated and governed.
8. The LLM is replaceable infrastructure; Spiral behavior is the product IP.
9. Voice should feel conversational, not like push-to-talk radio.
10. The higher the conversational significance, the less the interface should compete for attention.

## Core architecture

```text
                         SPIRAL TALK
                              |
                     +--------+--------+
                     |                 |
                   CLIENT          TRUST BOUNDARY
                     |                 |
              Text / Voice             |
                     |                 |
                     v                 v
                 LISTENER --------> SAFETY GATE
                     |                 |
                     +--------+--------+
                              v
                      CONTEXT ENGINE
                   session + safe memory
                              |
                              v
                       PACING ENGINE
                decides what to do next
                              |
             +----------------+----------------+
             |        |        |        |       |
             v        v        v        v       v
           HOLD    MIRROR   DEEPEN  JUXTAPOSE  PIVOT
             |        |        |        |       |
             +--------+--------+--------+-------+
                              |
                              v
                      RESPONSE ENGINE
                              |
                              v
                     RESTRAINT ENGINE
               autonomy + quality + safety
                              |
                              v
                           USER
                              |
                              +----------------------+
                                                     |
                                  +------------------+------------------+
                                  |                                     |
                                  v                                     v
                           INDIVIDUAL MEMORY                  PRODUCT LEARNING
                                  |                                     |
                                  |                              aggregated only
                                  |                                     |
                                  |                                     v
                                  |                              SPIRAL RESEARCH
                                  |                                     |
                                  |                                     v
                                  |                              SPIRAL DEMAND
                                  |                                     |
                                  |                                     v
                                  |                            PRODUCT HYPOTHESIS
                                  |                                     |
                                  +-------------------------------------+
```

## Conversational states

### HOLDING

Used when the system should sustain the user's space rather than add content. It should not be a canned response. In voice, visual presence can continue while speech remains silent.

### MIRRORING

Returns the user's own structure without adding a causal explanation.

### DEEPENING

Moves one step deeper into a thread already present in the user's words.

### JUXTAPOSING

Places two user-declared moments, phrases or positions side by side without demanding coherence or assigning a cause.

### PIVOTING

Follows a meaningful change of direction without dragging the conversation back to the previous topic.

### CLOSING

Lets the session settle organically. No mechanical summary and no mandatory homework.

## Pacing Engine

The Pacing Engine is a control layer, not a psychological classifier.

Inputs may include:

- current text or transcript;
- turn length;
- previous assistant action;
- interruption state;
- evidence that the user is continuing to formulate;
- explicit question from the user;
- conversation history.

It must never convert timing signals into clinical claims.

The first implementation is intentionally deterministic and small. It selects an initial conversational state and constrains response length. Future implementations can add learned policy selection while preserving the same contracts.

## Response contract

The LLM returns:

```json
{
  "reply": "string",
  "conversation_state": "holding|mirroring|deepening|juxtaposing|pivoting|closing",
  "structure": {},
  "safety_state": "normal|risk_detected"
}
```

The model does not directly own production delivery. A restraint layer validates the output before it reaches the user.

## Conversational restraint

The initial restraint layer rejects obvious regressions such as:

- generic openings;
- mechanical summaries;
- multiple questions in one turn;
- canned “organizing” language.

This should evolve from phrase filtering toward action-level validation. Phrase bans are a safety net, not the intelligence.

## Memory architecture

### Session memory

Current conversation context only.

### Episodic memory

User-authored material, anchored in time. Prefer raw quotations and explicit entities over generated psychological summaries.

### Corrected memory

User corrections have precedence over earlier machine-generated assumptions.

### Product learning

Uses only governed aggregate signals that describe product behavior, such as:

- response rejection;
- correction rate;
- abandonment;
- continuation depth;
- latency;
- voice interruption rate;
- state utilization.

It must not create hidden psychological profiles.

## Product learning loop

```text
Usage
  -> Safe aggregation
  -> Offline evaluation
  -> Experiment
  -> Canary release
  -> Measurement
  -> Policy/model update
  -> Rollback when necessary
```

## Spiral Demand Engine

This is a separate future capability.

It should never expose individual conversations to product discovery by default. Its purpose is to identify aggregated unmet needs, subject to explicit governance and consent appropriate to the data involved.

```text
Private interactions
        |
   trust boundary
        |
 safe aggregate signals
        |
 thematic aggregation
        |
 statistical validation
        |
 human review
        |
 product hypothesis
        |
 small experiment
```

The output is a market hypothesis, not a diagnosis of a population.

## Voice architecture

### Now

Browser/native microphone capture with continuous-session semantics, local turn detection where practical, interruption handling, and a clear fallback path.

### Next

Streaming transport, low-latency TTS, barge-in, resilient reconnection, and visual state transitions driven by conversation state.

### Later

Native mobile audio pipeline, multimodal real-time models, stronger local processing, and provider abstraction for voice.

Audio should not be retained by default when retention is not necessary for the user experience.

## Mobile experience

The primary interaction model is:

```text
OPEN
  -> SEE PRESENCE
  -> SPEAK
  -> PAUSE
  -> HEAR
  -> CONTINUE
```

The user should not have to operate a dashboard.

The Spiral Orb represents presence, not emotion. It should never claim that a color, size or animation means “anxiety”, “sadness”, “trauma” or another psychological state.

## Model abstraction

The product should be able to swap:

- Gemini;
- Claude;
- OpenAI;
- future providers;

without changing the Spiral conversational contracts.

The LLM is a provider. The behavioral kernel is Spiral IP.

## Current implementation strategy

Do not rewrite the existing application wholesale.

Evolve in slices:

1. explicit conversational state;
2. deterministic pacing substrate;
3. restraint and second-pass repair;
4. mobile visual language;
5. reliable voice turn-taking;
6. privacy-safe memory;
7. evaluation harness;
8. governed product learning;
9. monetization;
10. native mobile client.

## Quality benchmark

The primary product question is not:

> Did the model answer correctly?

It is:

> After the interaction, was the user able to think something they were not able to think before?

That must remain a product hypothesis to be tested empirically, not a claim of therapeutic efficacy.

## Anti-patterns

Never allow the system to regress into:

- “Entendi. Vamos organizar…”;
- repetitive validation;
- diagnostic labeling;
- invented memories;
- hidden psychological scoring;
- generic therapeutic jargon;
- over-explaining;
- forced questions;
- fake human emotion;
- gamified mental-health scores.

## Product horizon

### 48 hours

Stabilize conversational core, mobile experience and regression tests.

### 30 days

Strong voice experience, memory correction, measurement harness and first subscription architecture.

### 90 days

Native mobile foundation, governed product-learning loop and controlled experimentation.

### 6–12 months

Mature multimodal voice, privacy-preserving demand discovery and multi-model production routing.

---

**Status:** Active product blueprint. This document governs incremental implementation and may supersede earlier informal descriptions of Spiral Talk architecture.
