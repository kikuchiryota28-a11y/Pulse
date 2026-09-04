# Pulse Social Product Contract

This document defines the behavioral contract for the social version of Pulse. UI styling is intentionally excluded; these are product and system rules.

## Core object

A Pulse is a post that remains causally open after publishing. The creator provides a seed and direction. Other people can make one Move that changes the current state. The changed state becomes the next person's context.

`Seed -> Move -> State -> Move -> State ...`

The feed therefore contains changing posts, not only finished posts.

## Objects

### Pulse
- `creator_id`: anonymous actor identifier for MVP
- `seed_type`: text, photo, or mixed
- `seed`: immutable starting content
- `title`: compact human-facing label
- `intent`: creator's desired direction, not a literal task
- `status`: active or hidden
- `move_count`: denormalized count
- `participant_count`: unique actor count
- `last_move_at`: latest change timestamp
- `metadata`: versioning and future system fields

### Move
- belongs to exactly one Pulse
- can reference `parent_move_id`
- has a `depth`
- records `action_type` and `input_type`
- stores the user contribution in `content`
- stores state before and after the contribution
- is append-only from the client perspective
- an actor can contribute at most once to the same Pulse

### Reaction
- currently supports `like`
- one actor can have one reaction of each reaction type per Pulse
- reactions never change Pulse state; they are social signals only

### Report
- belongs to a Pulse
- reporter is anonymous in MVP
- reason is constrained to a fixed moderation taxonomy
- duplicate reports from one actor/reason are idempotent

## Move invariants

1. A Move must belong to a visible Pulse.
2. The actor identifier must be 8-80 characters.
3. The action family must be in the supported action catalog.
4. The input type must be supported.
5. The content must be a JSON object and remain within the media payload limit enforced by the application.
6. The first Move has depth 1 and no parent.
7. Every later Move must reference a Move from the same Pulse; depth is derived from the parent.
8. An actor cannot Move twice in the same Pulse.
9. `state_before`, `depth`, and `state_after` are server-controlled or normalized by the database guard. The client is not trusted to define chronology.
10. Moves are never edited in-place by the client.

## Director contract

The Director chooses a useful next human contribution from:

`intent + seed + current state + move history`

It should prefer a contribution that adds information, interpretation, connection, evidence, contrast, or transformation rather than merely repeating the prior action.

The Director output is a Move instruction, not an answer and not the Pulse content itself.

## Feed contract

### For you
Rank by a combination of freshness, participation, movement, and active status.

### Moving
Only active Pulses. Prefer recently changed Pulses.

### New
Prefer creation time.

## Detail contract

A person entering a Pulse must understand three things before acting:
1. what the starting point was,
2. what it has become so far,
3. what their contribution is being asked to change.

The trace is causal history, not just a timeline.

## Create contract

Creation has two conceptual inputs:
1. a starting point,
2. a direction.

The creator does not author a fixed linear task for future users. They specify the direction and leave the next state open.

## Revisit contract

A creator should be able to return later and see that their post changed. A participant should be able to return and see what happened after their contribution.

This is the retention loop:

`discover -> join -> change -> return -> discover/change again`

## Branching contract

The data model supports a Move graph through `parent_move_id`. The MVP may render the current dominant path, but the data model must not assume that every Pulse has exactly one irreversible linear chain.

Future branching UI must preserve the source Move and show descendants rather than overwriting history.

## Moderation and privacy contract

- Do not expose precise location data by default.
- User-submitted photos should discourage faces and sensitive personal information.
- Hidden Pulses must disappear from public read paths.
- Reporting must exist before stranger testing.
- Never rely on client-side status, depth, or timestamps for integrity.
- Anonymous identity is an MVP convenience, not proof of identity or age.

## Current deliberate non-goals

- public follower graph
- direct messaging
- creator-only private Pulse modes
- algorithmic recommendation trained on long-term behavior
- visible AI chatbot
- ornate visual polish

These can be added after the core causal participation loop is validated.
