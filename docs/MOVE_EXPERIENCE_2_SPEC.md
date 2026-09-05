# Pulse Move Experience 2.0

## Product contract
A Move is not a generic submission form. The current Pulse state selects one action and the action selects the input. Every successful Move produces an explicit state transition and a next action.

## Action families
- React: choice
- Choose: choice
- Interpret: text
- Find: photo
- Connect: text
- Transform: mixed
- Compare: mixed
- Predict: text
- Add: text
- Remix: mixed

## UX contract
1. Show current state context.
2. Show exactly one Director action.
3. Render only the input needed for that action.
4. Keep optional fields secondary.
5. On submit, show BEFORE -> YOUR MOVE -> AFTER.
6. After the transition, show the next direction without exposing AI internals.

## Engineering constraints
- Preserve creator Move lock.
- Preserve submission_id idempotency.
- Keep `state_before.revision` and `revision_before` intact.
- Do not trust client depth; DB remains authoritative.
- Keep the existing anonymous actor model for MVP.
- No generic task picker in the UI.

## Acceptance criteria
- A user can complete at least five visually distinct action/input experiences without seeing a generic form.
- Choice, text, photo, and mixed actions all have a distinct interaction.
- The post-submit state visibly differs from the pre-submit state.
- The Director prompt references the latest state when a prior Move exists.
- Creator cannot submit a Move from the UI or DB path.
