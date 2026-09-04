# Pulse Master Product & System Specification v1

Status: Design baseline
Purpose: Remove product, state, interaction, integrity, social, moderation, and measurement ambiguity before the next implementation phase.

## 0. North Star

Pulse is a social network where posts are not finished when published.

Core promise:

> Post something. Let people change it.

Core loop:

`Discover -> Understand -> Enter -> Move -> State changes -> Discover the changed state -> Return`

The essential unit is not the post alone. It is the causal chain created when one person's contribution changes what the next person encounters.

Pulse must feel different from:
- a normal social feed where content is consumed and reactions are side effects;
- a task app where a creator writes instructions and users execute them;
- a game where the system defines the objective and users compete to solve it;
- a chatbot where AI produces most of the interesting content.

The human contribution is the source of novelty. AI may direct the next contribution, but it must not become the visible author of the experience.

## 1. Product Principles

### 1.1 Causal participation
Every meaningful participant action should create an observable state change.

### 1.2 Open-ended but bounded
A Pulse can evolve indefinitely in principle, but every individual Move must be small enough to understand and complete without excessive effort.

### 1.3 History is immutable
A prior contribution is never silently replaced. Later changes are descendants or new state transitions.

### 1.4 The current state is legible
Before acting, a participant must understand:
1. where the Pulse started;
2. what people changed so far;
3. what their contribution is being asked to change.

### 1.5 Friction must justify itself
Participation can be slower than a like or comment, but the additional effort must create a meaningfully different payoff.

### 1.6 Unpredictability without chaos
A participant should have agency, but the system should keep the Move understandable and relevant to the Pulse's direction.

### 1.7 No fake social proof
Counts, activity, and movement indicators must represent real events. Never manufacture engagement to make the product look active.

## 2. Core Domain Model

### 2.1 Pulse

Fields:
- `id`: immutable UUID
- `creator_id`: actor identifier for MVP
- `seed_type`: `text | photo | mixed`
- `seed`: immutable JSON object containing starting content
- `title`: human-readable label
- `intent`: creator direction; not a fixed task
- `status`: `active | completed | hidden`
- `created_at`
- `updated_at`
- `move_count`: derived/denormalized count
- `participant_count`: unique actors who made at least one Move
- `last_move_at`
- `metadata`: version, feature flags, future moderation/system fields

Invariant:
- seed never changes after publication.
- creator intent never becomes a literal per-user task.
- hidden Pulses must disappear from public discovery.

### 2.2 Move

Fields:
- `id`
- `pulse_id`
- `actor_id`
- `parent_move_id`
- `depth`
- `action_type`
- `input_type`
- `prompt`
- `content`
- `state_before`
- `state_after`
- `created_at`

Invariant:
- belongs to exactly one Pulse;
- parent, if present, belongs to same Pulse;
- depth is derived, never trusted from client;
- Move is append-only;
- actor identity is stable for MVP but not proof of age or legal identity;
- one actor may contribute at most once to a Pulse in MVP;
- Move content is validated against the selected action/input contract.

### 2.3 Reaction

Current types:
- `like`
- `save`

Rules:
- reaction does not alter Pulse causal state;
- idempotent per actor + Pulse + reaction type;
- reaction count may influence discovery only as a weak social signal, never as the core score.

### 2.4 Report

Fields:
- `pulse_id`
- `reporter_actor_id`
- `reason`
- `details`
- timestamps
- moderation state in future backend/admin layer

Reasons:
- safety
- privacy
- spam
- sexual
- harassment
- other

## 3. Pulse Lifecycle

### 3.1 States

`draft -> active -> completed`

Any public state may transition to `hidden` through moderation/admin action.

MVP creation publishes directly to `active`.

### 3.2 Active

Properties:
- discoverable;
- can receive eligible Moves;
- appears in Moving feed if recently active;
- creator can revisit;
- participant can revisit.

### 3.3 Completed

Completion must have an explicit product reason.

Possible future completion rules:
- creator manually closes it;
- inactivity threshold after sufficient evolution;
- system determines continuation has converged or become stale.

MVP default: do not auto-complete merely because a fixed number of Moves happened. The old fixed five-person relay is intentionally removed.

### 3.4 Hidden

Properties:
- removed from public discovery and public reads;
- history is retained for moderation/audit;
- public clients should receive a generic unavailable state rather than hidden moderation details.

## 4. State Model

### 4.1 State is more than the latest media
Current state contains:
- index / evolution depth;
- current summary;
- current media;
- source (`seed` or `move`);
- last action;
- changed timestamp;
- semantic context in future versions;
- lineage pointer(s) in branching versions.

### 4.2 State transition

`State_n + Move_n+1 -> State_n+1`

The next state must be reconstructable from immutable history.

### 4.3 Authoritative state

The server/database is authoritative for:
- chronology;
- pulse visibility;
- parent relation;
- depth;
- counts;
- timestamps;
- eligibility to contribute.

The client may propose a contribution but must not define authoritative chronology.

## 5. Move System

### 5.1 Action families

Initial catalog:
- React
- Choose
- Interpret
- Find
- Connect
- Transform
- Compare
- Predict
- Add
- Remix

These are interaction families, not goals in themselves.

### 5.2 Action selection principle

The Director should select the next contribution by asking:

`What is missing from the current state that a human can add easily and meaningfully?`

Candidate dimensions:
- new information
- another interpretation
- external connection
- evidence
- contrast
- transformation
- choice
- prediction
- missing detail
- remix

### 5.3 Move size

Target:
- one clear action;
- approximately 10-90 seconds of user effort for common actions;
- no requirement to understand the entire history before participating;
- enough context to preserve causality.

A Move is too large when the user must research extensively, write a long essay, or perform multiple unrelated actions.

A Move is too small when it is effectively a like, with no meaningful state change.

### 5.4 Action contracts

React:
- input: choice;
- purpose: capture immediate perspective;
- state effect: adds a social/interpretive signal.

Choose:
- input: choice;
- purpose: select what should carry forward.

Interpret:
- input: text;
- purpose: add meaning or perspective.

Find:
- input: photo;
- purpose: introduce external real-world evidence/connection.

Connect:
- input: text;
- purpose: connect the Pulse to another concept/place/memory/idea.

Transform:
- input: text or future media remix;
- purpose: change interpretation without erasing source.

Compare:
- input: photo;
- purpose: create contrast using a second real scene.

Predict:
- input: text;
- purpose: create a falsifiable possible next state.

Add:
- input: text;
- purpose: fill one meaningful gap.

Remix:
- input: mixed;
- purpose: reinterpret while preserving trace to source.

### 5.5 Eligibility rules

A participant can Move only when:
- Pulse is visible and active;
- participant has not already contributed in MVP;
- current state is successfully loaded;
- no conflicting submission has already claimed the participant's Move;
- input passes action validation.

## 6. Director Specification

### 6.1 Inputs

Director receives:
- creator intent;
- immutable seed;
- current authoritative state;
- Move history;
- previous action;
- branch context when branching is enabled.

### 6.2 Output

Director returns:
- action type;
- input type;
- user-facing title;
- contextual prompt;
- short hint;
- optional choices;
- internal reason/debug metadata.

The Director output is an instruction, never a generated answer.

### 6.3 Selection requirements

Director must:
- use the current state, not just the seed;
- avoid meaningless repetition;
- preserve creator intent without forcing a fixed result;
- prefer human-feasible actions;
- avoid dangerous, privacy-invasive, or inappropriate actions;
- avoid requesting precise location, faces, personal data, or unsafe challenges;
- remain understandable without explaining its internal reasoning.

### 6.4 Determinism and variation

For a fixed state, the system may deterministically select a Move family for reproducibility in MVP.

Future version may introduce controlled variation, but the same state must still obey the same eligibility and safety constraints.

### 6.5 Director failure fallback

If Director fails:
- never block the Pulse permanently;
- choose a safe, generic fallback action from the catalog;
- record a diagnostic event;
- never expose raw model errors to users.

## 7. Branching

### 7.1 Data model

`parent_move_id` makes Move history a graph.

Example:

```
Seed
├── Move A
│   ├── Move A1
│   └── Move A2
└── Move B
    └── Move B1
```

### 7.2 MVP presentation

The first public presentation may show a dominant/current path to reduce complexity.

However:
- source Moves remain immutable;
- descendants are retained;
- no branch overwrites another branch;
- branch count and lineage must be available to the system.

### 7.3 Future branch UX

Branch discovery should answer:
- where did this version come from?
- what changed here?
- what other directions existed?

Do not turn the graph into a technical tree viewer. It should remain a human story.

## 8. Discovery and Feed

### 8.1 Feed object

A feed card must communicate at least:
- what the Pulse is;
- whether it is still moving;
- what changed recently;
- why it may be worth entering;
- whether the user can participate.

### 8.2 For You

Initial ranking components:
- freshness;
- recent movement;
- active status;
- number of distinct participants;
- number of Moves;
- light novelty signal.

Do not optimize aggressively for raw popularity in MVP.

### 8.3 Moving

Only active Pulses.

Primary sort:
- recent update;
- then meaningful participation;
- then freshness.

### 8.4 New

Primary sort:
- creation timestamp.

### 8.5 Search

MVP:
- title;
- intent.

Future:
- semantic discovery;
- action compatibility;
- topic clusters.

## 9. Detail / Pre-Move Experience

Before the CTA, the user must understand:

### Layer 1 — Origin
What was posted originally?

### Layer 2 — Evolution
What has people changed so far?

### Layer 3 — Opportunity
What can I meaningfully change now?

The trace is causal history, not merely comments in chronological order.

## 10. Submission Transaction

### 10.1 Client flow

```
Open detail
-> load authoritative state
-> request/derive current Director instruction
-> user enters contribution
-> client validates locally
-> submit
-> server validates again
-> create Move
-> update Pulse aggregates
-> emit realtime event
-> client refreshes state
```

### 10.2 Server-side checks

At minimum:
- Pulse exists;
- Pulse is active/visible;
- actor is valid;
- action type allowed;
- input type allowed;
- content schema valid;
- parent belongs to Pulse;
- parent/depth relationship valid;
- actor has not already contributed;
- payload size acceptable;
- request is not obviously abusive.

### 10.3 Idempotency

A repeated network request must not create two Moves.

The unique actor/Pulse constraint remains the MVP idempotency guard.

Future:
- client submission idempotency key;
- server-side command log.

## 11. Revisit System

This is a core product feature, not a secondary notification feature.

### Creator revisit

After publishing:
- creator can return;
- see current state;
- see who/what changed it at abstract anonymous level;
- understand the trace;
- optionally continue observing without owning subsequent Moves.

### Participant revisit

After contributing:
- participant can return;
- see what happened after their Move;
- see whether another Move descended from theirs;
- understand whether their action mattered.

### Retention mechanism

```
I changed it
-> I wonder what happened
-> I return
-> someone changed it again
-> I discover another Pulse
```

## 12. Activity System

Activity should become event-driven rather than a generic list.

Future event types:
- `your_pulse_changed`
- `your_move_followed`
- `new_branch_created`
- `pulse_hidden`
- `pulse_completed`
- `someone_saved_pulse`

Do not notify for every low-value event.

Priority should be based on whether the event gives a reason to return.

## 13. Sharing / Deep Links

Required behavior:
- share URL identifies Pulse;
- first load with `?pulse=<id>` opens that Pulse directly;
- hidden/nonexistent Pulse returns a safe not-found state;
- shared Pulse still requires normal Move eligibility checks;
- link parsing must not depend on prior client state.

Known current gap to fix:
- the share function writes `?pulse=<id>`, but initial page loading must explicitly read and resolve that parameter.

## 14. Local Storage

Allowed:
- anonymous actor ID;
- onboarding acknowledgement;
- unsent draft content.

Never treat local storage as authoritative for:
- Pulse existence;
- Move completion;
- counts;
- moderation;
- identity verification.

Draft rules:
- save continuously but bounded;
- restore on Create screen;
- clear after successful publish;
- never auto-publish.

## 15. Media Architecture

MVP currently uses client-side compressed image payloads.

Short-term controls:
- max dimensions;
- quality cap;
- payload size cap;
- explicit media type validation;
- reject unsupported formats safely.

Next architectural step:
- move media to object storage;
- store immutable media URL/reference in Pulse/Move content;
- avoid large base64 JSON payloads inside database rows.

## 16. Privacy and Safety

Default assumptions:
- anonymous public identity;
- strangers can participate;
- user-generated media can contain sensitive information accidentally.

Rules:
- discourage faces and sensitive personal information in photo actions;
- do not ask for precise live location;
- do not encourage unsafe physical tasks;
- no harassment-oriented prompts;
- no sexualized or age-sensitive content generation;
- provide report path before stranger testing;
- hidden content must leave public read paths;
- moderation state must override discovery state.

## 17. Moderation Architecture

Minimum MVP moderation loop:

`Report -> store report -> hide/review pathway -> remove from discovery`

Future:
- report thresholds;
- duplicate report suppression;
- admin review queue;
- automated pre-screening;
- actor reputation/rate controls;
- appeal path.

Important distinction:
- hiding is a moderation state;
- completion is a product lifecycle state.

They must never be conflated.

## 18. Anonymous Identity

MVP actor ID is a local client identifier.

Strengths:
- no onboarding friction;
- low identity cost.

Weaknesses:
- weak anti-abuse guarantees;
- device reset can create a new actor;
- not proof of age or real identity;
- cross-device continuity is absent.

Before wider public rollout, evaluate authenticated identity or stronger abuse controls.

Do not expose raw actor IDs as social identity.

## 19. Counts and Denormalized Fields

`move_count`, `participant_count`, and `last_move_at` are performance-oriented aggregates.

They must be updated transactionally or through trusted database functions.

Client must never be allowed to directly set aggregate fields.

Periodic reconciliation query should exist for development/admin use:

`stored aggregate == recomputed aggregate`

Any mismatch is a data integrity bug.

## 20. Concurrency

Important cases:

### Two people submit simultaneously
Both may succeed if they are distinct actors.

### Same actor submits twice simultaneously
Exactly one Move must persist.

### Feed is stale while user opens Move
Server must reject invalid/stale state safely and tell client to refresh.

### Pulse becomes hidden during submission
Submission must fail and no new public Move may be created.

### Parent Move disappears due moderation
Historical relationship must remain internally resolvable; public presentation may omit hidden content.

## 21. Error Taxonomy

User-facing errors should map to clear categories:

- network unavailable;
- temporary server failure;
- Pulse no longer available;
- already participated;
- invalid contribution;
- media processing failure;
- unsupported content;
- moderation restriction;
- rate limit.

Avoid raw backend/SQL/model errors in UI.

## 22. Loading and Empty States

Every major surface needs explicit behavior.

Feed:
- first load;
- refreshing;
- empty;
- error;
- no more results.

Detail:
- loading Pulse;
- not found;
- hidden;
- loading Moves;
- Director unavailable.

Move sheet:
- loading instruction;
- input incomplete;
- media processing;
- submit pending;
- success;
- duplicate;
- retry.

Create:
- blank;
- draft restored;
- image processing;
- publish pending;
- publish failure;
- success.

Activity:
- first-time empty;
- populated;
- loading;
- refresh failure.

## 23. Accessibility

Required before external testing:
- keyboard focus path for every interactive surface;
- visible focus state;
- dialog focus containment;
- meaningful button labels;
- alt text for images where meaningful;
- sufficient text contrast;
- no essential information encoded only by color;
- reduced-motion fallback.

## 24. Performance

Primary risks:
- large data URLs;
- fetching all Moves for many Pulses;
- realtime reload storm;
- excessive image decoding;
- client-side feed sorting at scale.

MVP controls:
- paginate feed;
- load Moves only for visible/selected Pulse when practical;
- debounce search;
- coalesce realtime refreshes;
- lazy-load media;
- cap card payloads.

Future:
- server-side feed ranking;
- precomputed current state;
- media storage/CDN.

## 25. Realtime

Realtime events are useful for:
- feed movement;
- live detail state;
- creator revisit.

They must not become the source of truth.

On realtime event:
- update or invalidate client cache;
- reconcile against server state;
- tolerate missed events;
- reconnect cleanly.

## 26. Observability

Track product events, not invasive personal data.

Core events:
- `pulse_created`
- `pulse_opened`
- `move_sheet_opened`
- `move_started`
- `move_submitted`
- `move_failed`
- `pulse_revisited`
- `shared`
- `reported`
- `hidden`

Critical funnel:

`open -> move sheet -> submit`

Critical retention:

`submit -> revisit`

## 27. Product Metrics

Primary metric:
- **Meaningful contribution rate:** percentage of Pulse opens that result in a valid Move.

Secondary:
- open-to-move-sheet rate;
- move-sheet-to-submit rate;
- median time to first Move;
- percentage of creators who revisit after a Pulse changes;
- percentage of participants who revisit after their Move;
- percentage of active Pulses receiving a second distinct participant;
- report rate;
- failure rate;
- duplicate submission rate.

North-star retention question:

> After changing a Pulse, does the participant care enough to come back and see what happened next?

## 28. Quality Gates

### Gate A — Core integrity
- no duplicate Move;
- chronology correct;
- parent relation valid;
- hidden Pulse unavailable publicly;
- aggregates correct.

### Gate B — Core UX
A new user can:
- discover;
- understand;
- enter;
- contribute;
- see the changed state.

### Gate C — Revisit
Creator and participant can return and understand what changed after their action.

### Gate D — Stranger safety
Reporting, hiding, privacy defaults, abuse controls, and safe prompts are functional.

### Gate E — Distribution
Only after Gates A-D pass should broader discovery/recommendation work begin.

## 29. Test Matrix

### State tests
1. Pulse creation.
2. First Move.
3. Second distinct actor Move.
4. Same actor duplicate Move.
5. Invalid parent.
6. Wrong parent Pulse.
7. Invalid depth.
8. Hidden Pulse Move attempt.
9. Completed Pulse Move attempt.
10. Missing Pulse.

### Feed tests
11. Moving excludes hidden/completed.
12. New sorting.
13. For You ranking stability.
14. Empty feed.
15. Search.

### Realtime tests
16. New Pulse appears.
17. New Move updates detail.
18. Missed realtime event repaired by refresh.

### Revisit tests
19. Creator returns after external Move.
20. Participant returns after descendant Move.

### Failure tests
21. Offline submission.
22. Image processing failure.
23. Server error.
24. Director failure fallback.
25. Stale detail state.

### Safety tests
26. Report creation.
27. Duplicate report idempotency.
28. Hidden Pulse removed from public read.
29. Unsafe/invalid media rejection.
30. Precise location not required by default.

## 30. Explicit Non-Goals Before Core Validation

Do not spend significant implementation effort on:
- follower graphs;
- DMs;
- elaborate public profiles;
- follower counts;
- advanced creator analytics;
- public AI chatbot;
- ornate visual systems;
- endless notification types;
- competitive leaderboards.

These can increase complexity without proving the core behavior.

## 31. Known Current Gaps to Fix

1. Deep-link query handling: `?pulse=<id>` must open the requested Pulse on initial load.
2. Move submission should move from client-authored state fields toward trusted server-side construction where possible.
3. Current Move graph is stored but presentation is still predominantly linear.
4. Realtime currently triggers broad feed reloads; introduce event coalescing later.
5. Feed ranking is heuristic and should remain intentionally simple until behavior data exists.
6. Image data should eventually move out of database JSON payloads.
7. Activity is currently derived from loaded feed data rather than a durable event model.
8. Anonymous identity needs stronger abuse protection before broad public exposure.
9. Accessibility and dialog focus behavior require dedicated testing.
10. Current tests cover utility/Director behavior but not full DB transaction invariants.

## 32. Implementation Order

### Stage 1 — State integrity
- finalize database constraints/functions;
- add transaction tests;
- reconcile aggregate counters.

### Stage 2 — Submission reliability
- idempotency;
- stale-state handling;
- robust error taxonomy;
- retry behavior.

### Stage 3 — Deep links + revisit
- URL state;
- creator revisit;
- participant revisit;
- post-change markers.

### Stage 4 — Director v2
- state-aware candidate generation;
- safe action eligibility;
- fallback;
- diagnostic logging.

### Stage 5 — Branching backend
- lineage helpers;
- dominant path selection;
- branch metadata.

### Stage 6 — Social event model
- durable events;
- activity semantics;
- revisit triggers.

### Stage 7 — Moderation hardening
- reports;
- hide/unhide workflow;
- rate limits;
- media/privacy controls.

### Stage 8 — Discovery tuning
- improved ranking;
- pagination;
- caching;
- semantic search only after baseline behavior exists.

### Stage 9 — UI polish
- visual identity;
- motion;
- typography;
- layout refinement;
- micro-interactions.

## 33. Decision Rule for Every New Feature

Before implementation, answer all five:

1. Does it strengthen causal participation?
2. What exact state or behavior does it change?
3. What happens when it fails or is unavailable?
4. What abuse/privacy risk does it add?
5. What measurable evidence would justify keeping it?

If these cannot be answered, the feature is not ready to build.

## 34. Definition of 'Ready for Stranger Test'

Pulse is ready when a stranger can, without explanation from the creator:

`open shared link or feed -> understand current Pulse -> perform one safe Move -> see that the post changed -> later return and understand what happened`

and when a bad request, duplicate request, hidden Pulse, stale state, media failure, or network failure does not corrupt the Pulse.

That is the minimum viable product contract.

## 35. Definition of 'Actually Good'

Pulse becomes compelling when the following observation is repeatedly true in user testing:

> A participant wants to know what the next person will do because their own contribution changed the possibilities.

That is stronger evidence of product-market signal than:
- people saying the UI looks cool;
- people saying the idea is interesting;
- people completing a Move once;
- raw time spent in the app.

The product should therefore optimize around **curiosity about consequential human participation**, not feature volume.
