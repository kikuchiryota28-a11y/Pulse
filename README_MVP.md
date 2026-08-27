# Pulse Relay MVP

Pulse is an experiment in passing one idea from stranger to stranger.

## How the MVP works

1. Start a Relay with a short seed.
2. Pulse generates a shareable URL containing the current Relay state.
3. A stranger opens the URL, sees only the current instruction and Relay history, then adds one response.
4. Pulse encodes the updated Relay state into a new URL.
5. The participant passes that URL to the next stranger.
6. After 10 steps, the Relay becomes a completed chain showing how the original seed changed.

This MVP intentionally uses URL state instead of a backend so the core human behavior can be tested at zero infrastructure cost. A later version can replace URL transport with a database without changing the core Relay model.
