# Competition Rules / Score-Oriented Guardrails

This file is a local working interpretation of the competition information supplied
for the RSCENE 2026 AI Vibe Coding Challenge. Always defer to the official organizers'
latest instructions.

## Visible scoring priorities from the supplied event poster

- Effective use of AI technologies — 20%
- Innovation and creativity — 20%
- Functionality and technical execution — 20%
- User experience and interface design — 15%
- Relevance and practical impact — 15%
- Presentation and poster quality — 10%

## Deliverables shown in the supplied poster

1. Functional web application
2. Project poster
3. Live demonstration

## Competition operating principle

A smaller application that works end-to-end is better than a larger application
with half-finished features.

## Feature priority formula

Before implementing a feature, ask:

1. Does it directly solve the problem?
2. Does it improve one or more judging criteria?
3. Can it be demonstrated live?
4. Can it be completed safely within the remaining time?
5. Can it be removed without damaging the core workflow?

If the answer is mostly "no", do not build it.

## Feature freeze

At roughly 75% of the available time:

- Stop adding features.
- Fix broken flows.
- Improve visible UX.
- Prepare the demo.
- Prepare the poster.
- Test the fallback path.

## Forbidden competition habits

Avoid:

- rebuilding the whole stack because a new framework looks interesting
- adding authentication when it is not required
- creating microservices
- adding multiple AI providers just to say "multi-model"
- building elaborate RBAC
- polishing backend abstractions while the demo is broken
- adding a feature after feature freeze
- depending on an untested external service

## Winning-story pattern

```text
Real problem
    ↓
User action
    ↓
AI understands/analyzes
    ↓
AI produces structured insight
    ↓
Human approves/acts
    ↓
System produces measurable outcome
```
