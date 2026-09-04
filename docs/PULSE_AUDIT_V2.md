# Pulse — Audit V2

## Current position

Pulse is in the 40–50/100 product zone: the social shell and core data model exist, but integrity, lifecycle, revisit, moderation, and dynamic state behavior still need hardening before stranger testing.

## P0 — before stranger testing

- Deep-link `/?pulse=<id>` must resolve to the actual Pulse; middleware now redirects to `/pulse/<id>`.
- Hidden Pulses must hide their moves from public reads.
- Move submission must be transaction-safe and server-authoritative.
- Parent/depth/state chronology must be derived server-side.
- Idempotency must exist for retried submissions.
- Stale/concurrent submission behavior must be explicit.
- Completion lifecycle must have an explicit transition.
- Reaction upsert/delete must be consistent with RLS and unique keys.
- Reporting must be reachable from the user experience.
- Anonymous actor identity must not be treated as trusted authentication.
- Media should leave the JSON/base64 database path before scale-up.
- Direct links to hidden/deleted Pulses need a deliberate unavailable state.

## P1 — core product correctness

- State needs content, meaning, evidence, context, media, source move, actor, revision.
- Branch lineage needs explicit branch metadata.
- A Pulse needs a current/dominant tip policy.
- Revisit needs persisted events, unread semantics, and descendant notifications.
- The Director must score candidate Moves against current State, not just action keywords.
- Action/input/content contracts must be explicit and validated.
- Search should become server-side and paginated.
- Feed should become cursor/paginated and incremental under realtime updates.
- Activity should be event-driven instead of reconstructed from the current feed set.

## P2 — scale and polish

- State snapshots for long Pulses.
- Branch discovery/ranking.
- Block/mute.
- Device identity recovery or account identity.
- Privacy/EXIF stripping and media safety.
- Reconnect/offline UX.
- Feed ranking experiments.
- Final motion/visual polish.

## Product invariants

1. A Move never changes the past.
2. A Move must have a valid parent after the root Move.
3. Depth is derived from the parent, never from total row count.
4. Current State is derived from an explicit lineage/tip, never from an arbitrary last database row.
5. A hidden Pulse is absent from public read paths.
6. Retried submission must be idempotent.
7. A stale client cannot silently overwrite a newer State.
8. AI may direct a Move, but a human must perform the consequential action.
9. A Pulse is valuable only if participation changes what later users see.
10. UI polish cannot compensate for a weak Move → Consequence → Next Move loop.
